// app/api/p/[token]/pdf/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// The printable Agent Passport.
//
// WHY A PDF AT ALL
// A compliance pack, a board appendix, a procurement response — these are
// documents, and a URL pasted into one cannot be followed by whoever reads the
// printout. The PDF carries a QR code back to the live page, so the paper copy
// stays connected to something checkable rather than becoming an unverifiable
// claim the moment it is printed.
//
// WHAT THE PDF IS NOT
// It is not the passport. The signed document is the JSON; this is a rendering
// of it, and a rendering cannot be verified — anyone can typeset a PDF that
// says whatever they like. So the PDF states that plainly and points at both
// the JSON and the public key, rather than presenting itself as the evidence.
//
// Generated from the PUBLISHED copy, by token. The frozen document is what was
// shared and what the QR points at; regenerating from live data would produce a
// printout that disagrees with the page it links to.
import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import qrcode from 'qrcode-generator'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// The passport's palette, matching the public page so a printed copy and a
// screen copy are recognisably the same document.
const INK = rgb(0.039, 0.086, 0.157)
const GOLD = rgb(0.788, 0.635, 0.153)
const PAPER = rgb(1, 1, 1)
const TEXT = rgb(0.16, 0.20, 0.27)
const MUTED = rgb(0.45, 0.50, 0.58)
const RED = rgb(0.72, 0.25, 0.25)

const METRICS = ['pei', 'frr', 'irs', 'ti', 'csi'] as const
const METRIC_MAX: Record<string, number> = { pei: 1, frr: 1, irs: 1, ti: 5, csi: 1 }
const METRIC_LABEL: Record<string, string> = {
  pei: 'Planning', frr: 'Resilience', irs: 'Recovery',
  ti: 'Traceability', csi: 'Consistency',
}

/** Letter-spaced text.
 *
 * pdf-lib has no characterSpacing option, so the spacing goes into the string.
 * Used only for the short all-caps section labels, where the effect is part of
 * the document's identity — applying it to body text would break word shapes
 * and hurt readability.
 */
function spaced(text: string): string {
  return text.split('').join(' ')
}

function fmt(v: unknown, max: number): string {
  if (v === null || v === undefined || typeof v !== 'number') return '—'
  return v.toFixed(max === 5 ? 2 : 3)
}

/** QR as filled squares, drawn directly onto the page. */
function drawQR(page: any, text: string, x: number, y: number, boxSize: number) {
  const q = qrcode(0, 'M')
  q.addData(text)
  q.make()
  const n = q.getModuleCount()
  const module = boxSize / n

  // White plate with a quiet zone. Scanners need both, and a code printed
  // edge-to-edge on a dark background does not read.
  page.drawRectangle({
    x: x - 6, y: y - 6, width: boxSize + 12, height: boxSize + 12,
    color: PAPER,
  })
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!q.isDark(r, c)) continue
      page.drawRectangle({
        x: x + c * module,
        // PDF's origin is bottom-left; QR rows run top-down.
        y: y + boxSize - (r + 1) * module,
        width: module, height: module, color: INK,
      })
    }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  // Read through the same anonymous function the public page uses, so the PDF
  // honours revocation and expiry identically. A printable copy that outlives
  // a withdrawal would defeat the withdrawal.
  const { data, error } = await supabaseAdmin.rpc('get_published_passport', {
    t: params.token,
  })

  const result = data as Record<string, any> | null
  if (error || !result?.found) {
    return NextResponse.json(
      { error: String(result?.reason ?? 'not_found') },
      { status: 404 },
    )
  }

  const p = result.passport as Record<string, any>
  const origin = req.nextUrl.origin
  const liveUrl = `${origin}/p/${params.token}`

  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842])          // A4
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const mono = await doc.embedFont(StandardFonts.Courier)

  doc.setTitle(`Agent Passport — ${p.identity?.name ?? ''}`)
  doc.setSubject('Signed record of observed agent behaviour')
  doc.setProducer('HB-Eval')

  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: INK })

  let y = 780

  // ── Masthead ──
  page.drawText(spaced('HB-EVAL AGENT PASSPORT'), {
    x: 50, y, size: 11, font: bold, color: GOLD,
  })
  y -= 8
  page.drawLine({
    start: { x: 50, y }, end: { x: 545, y },
    thickness: 0.5, color: GOLD, opacity: 0.35,
  })

  y -= 30
  page.drawText(String(p.identity?.name ?? 'Unnamed agent'), {
    x: 50, y, size: 20, font: bold, color: PAPER,
  })
  y -= 18
  page.drawText(String(p.passport_id ?? ''), {
    x: 50, y, size: 9, font: mono, color: GOLD,
  })

  // ── QR, top right, pointing back at the verifiable page ──
  drawQR(page, liveUrl, 445, y - 82, 100)
  page.drawText('Scan to verify', {
    x: 452, y: y - 96, size: 7, font, color: MUTED,
  })

  y -= 45

  // ── Metrics ──
  page.drawText(spaced('RELIABILITY'), {
    x: 50, y, size: 8, font: bold, color: GOLD,
  })
  y -= 22

  const weakest = p.reliability?.weakest?.metric
  const metrics = p.reliability?.metrics ?? {}
  METRICS.forEach((key, i) => {
    const boxX = 50 + i * 74
    const isWeak = weakest === key
    page.drawRectangle({
      x: boxX, y: y - 34, width: 66, height: 44,
      color: PAPER, opacity: isWeak ? 0.10 : 0.04,
      borderColor: isWeak ? RED : GOLD,
      borderWidth: isWeak ? 1 : 0.3,
      borderOpacity: isWeak ? 0.6 : 0.2,
    })
    page.drawText(key.toUpperCase(), {
      x: boxX + 6, y: y - 4, size: 7, font, color: MUTED,
    })
    page.drawText(fmt(metrics[key], METRIC_MAX[key]!), {
      x: boxX + 6, y: y - 20, size: 13, font: bold,
      color: metrics[key] == null ? MUTED : (isWeak ? RED : PAPER),
    })
    page.drawText(METRIC_LABEL[key]!, {
      x: boxX + 6, y: y - 30, size: 6, font, color: MUTED,
    })
  })

  y -= 52

  // The weakest dimension named, never a grade. A single label is where a weak
  // dimension hides.
  if (p.reliability?.weakest) {
    page.drawText(
      `Weakest: ${p.reliability.weakest.name} at ${p.reliability.weakest.value} `
      + `(${Math.round(p.reliability.weakest.of_maximum * 100)}% of maximum)`,
      { x: 50, y, size: 8, font, color: RED },
    )
    y -= 12
  }
  if ((p.reliability?.undefined ?? []).length > 0) {
    page.drawText(
      `Never measured: ${p.reliability.undefined.map((m: string) => m.toUpperCase()).join(', ')} `
      + `— shown as a dash, not zero.`,
      { x: 50, y, size: 8, font, color: MUTED },
    )
    y -= 12
  }

  y -= 14

  // ── Trajectory ──
  const timeline = p.reliability?.timeline ?? []
  if (timeline.length > 0) {
    page.drawText(spaced('OVER TIME'), {
      x: 50, y, size: 8, font: bold, color: GOLD,
    })
    y -= 16

    const cols = [50, 130, 200, 265, 330, 395, 460]
    const heads = ['Window', 'Sessions', ...METRICS.map(m => m.toUpperCase())]
    heads.forEach((h, i) => {
      page.drawText(h, { x: cols[i]!, y, size: 7, font, color: MUTED })
    })
    y -= 12

    for (const w of timeline) {
      page.drawText(`${w.window_days} days`, { x: cols[0]!, y, size: 8, font, color: PAPER })
      page.drawText(String(w.sessions), { x: cols[1]!, y, size: 8, font: mono, color: PAPER })
      METRICS.forEach((m, i) => {
        page.drawText(fmt(w.metrics?.[m], METRIC_MAX[m]!), {
          x: cols[i + 2]!, y, size: 8, font: mono, color: PAPER,
        })
      })
      y -= 13
    }
    y -= 8
  }

  // ── Record ──
  const op = p.operational_record ?? {}
  const safety = p.safety_record ?? {}
  page.drawText(spaced('RECORD'), {
    x: 50, y, size: 8, font: bold, color: GOLD,
  })
  y -= 16

  const rows: Array<[string, string]> = [
    ['Sessions', String(op.sessions ?? 0)],
    ['Steps executed', String(op.steps_executed ?? 0)],
    ['Runtime hours', String(op.runtime_hours ?? 0)],
    ['Sessions halted', String(op.sessions_halted ?? 0)],
    ['Threshold breaches', String(op.total_breaches ?? 0)],
    ['Halt decisions', String(safety.halt_decisions ?? 0)],
    ['Alerts raised', String(safety.alerts_raised ?? 0)],
    // Failed deliveries are printed. A record that hid them would read as
    // though everyone was told.
    ['Alerts undelivered', String(safety.alerts_failed ?? 0)],
  ]
  rows.forEach(([k, v], i) => {
    const col = i < 4 ? 50 : 310
    const rowY = y - (i % 4) * 13
    page.drawText(k, { x: col, y: rowY, size: 8, font, color: MUTED })
    page.drawText(v, { x: col + 150, y: rowY, size: 8, font: mono, color: PAPER })
  })
  y -= 4 * 13 + 12

  // ── Evidence depth ──
  const ev = p.reliability?.evidence
  if (ev) {
    page.drawText(spaced('EVIDENCE DEPTH'), {
      x: 50, y, size: 8, font: bold, color: GOLD,
    })
    y -= 14
    page.drawText(`${ev.level} — ${ev.sessions} sessions, ${ev.steps} steps`, {
      x: 50, y, size: 9, font, color: PAPER,
    })
    y -= 12
    page.drawText(
      'Describes how much data supports the figures. Not a rating of the agent.',
      { x: 50, y, size: 7, font, color: MUTED },
    )
    y -= 20
  }

  // ── Provenance ──
  page.drawText(spaced('PROVENANCE'), {
    x: 50, y, size: 8, font: bold, color: GOLD,
  })
  y -= 14

  const sig = p.signature ?? {}
  const prov: Array<[string, string]> = [
    ['Issued by', String(p.issuer?.issued_by ?? 'HB-Eval')],
    ['Issued', String(p.issued_at ?? '').slice(0, 10)],
    ['Expires', String(p.expires_at ?? '').slice(0, 10)],
    ['Protocol', String(p.issuer?.protocol_version ?? '')],
    ['Measurement fingerprint', String(p.measurement?.fingerprint ?? '')],
    ['Signature', sig.signed ? `${sig.algorithm} · key ${sig.key_id}` : 'unsigned'],
  ]
  for (const [k, v] of prov) {
    page.drawText(k, { x: 50, y, size: 7.5, font, color: MUTED })
    page.drawText(v, { x: 200, y, size: 7.5, font: mono, color: PAPER })
    y -= 11
  }

  y -= 14

  // ── What this printout is, and is not ──
  page.drawLine({
    start: { x: 50, y }, end: { x: 545, y },
    thickness: 0.5, color: GOLD, opacity: 0.25,
  })
  y -= 16

  const disclaimer = [
    'This printout is a rendering, not the evidence. The signed document is the',
    'JSON at the link above; a PDF can be typeset to say anything and cannot be',
    'verified. Scan the code or open the link, where the signature is checked in',
    'your own browser against a public key we publish.',
    '',
    String(p.issuer?.statement ?? ''),
  ]
  for (const line of disclaimer) {
    page.drawText(line, { x: 50, y, size: 7.5, font, color: MUTED })
    y -= 10
  }

  y -= 6
  page.drawText(liveUrl, { x: 50, y, size: 7.5, font: mono, color: GOLD })

  page.drawText('hbeval.com', {
    x: 50, y: 30, size: 7, font, color: MUTED,
  })
  page.drawText(`schema ${p.schema_version ?? ''}`, {
    x: 495, y: 30, size: 7, font, color: MUTED,
  })

  const bytes = await doc.save()

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        `inline; filename="passport-${p.passport_id ?? params.token}.pdf"`,
      // Never cached: a withdrawn or expired passport must stop being
      // downloadable the moment it is withdrawn.
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
