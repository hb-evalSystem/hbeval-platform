// lib/crypto/gateway-call.ts
// ─────────────────────────────────────────────────────────────────────────────
// SERVER-ONLY. The mirror of secrets.ts: it DECRYPTS a per-agent AES key and
// signing secret (stored as base64(nonce[12]||ciphertext||tag) under the master
// key), then encrypts + signs a request body exactly the way the SDK does, so
// the Gateway's _decrypt + _verify_signature accept it.
//
// This is what lets the browser trigger an explain/evaluate call WITHOUT ever
// seeing the per-agent secrets: the secrets are decrypted here, on the server.
//
// Canonical signature (must match gateway._verify_signature):
//   HMAC-SHA256(signingSecret, `${nonceHex}.${timestamp}.${ciphertextHex}`)
// Encryption (must match gateway._decrypt / Python AESGCM):
//   AES-256-GCM; wire ciphertext = ciphertext || tag (tag last), all hex.
import 'server-only'
import { createDecipheriv, createCipheriv, randomBytes, createHmac } from 'crypto'

const MASTER_KEY_B64 = process.env.HBEVAL_MASTER_AES_KEY
const GATEWAY_URL =
  process.env.HBEVAL_GATEWAY_URL ||
  'https://hbeval-reliability-os-production.up.railway.app'

function masterKey(): Buffer {
  if (!MASTER_KEY_B64) throw new Error('HBEVAL_MASTER_AES_KEY is not set.')
  const key = Buffer.from(MASTER_KEY_B64, 'base64')
  if (key.length !== 32) throw new Error('HBEVAL_MASTER_AES_KEY must be 32 bytes.')
  return key
}

// Reverse of encryptUnderMaster: base64(nonce[12] || ciphertext || tag[16]).
function decryptUnderMaster(encB64: string): Buffer {
  const blob = Buffer.from(encB64, 'base64')
  const nonce = blob.subarray(0, 12)
  const tag = blob.subarray(blob.length - 16)
  const ciphertext = blob.subarray(12, blob.length - 16)
  const decipher = createDecipheriv('aes-256-gcm', masterKey(), nonce)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

export interface AgentCipherSecrets {
  aesKeyEncrypted: string
  hmacSecretEncrypted: string
}

// Encrypt a JSON payload under the per-agent AES key, producing the exact wire
// layout the Gateway expects, and sign it with the per-agent signing secret.
function buildSignedRequest(
  payload: unknown,
  aesKey: Buffer,
  signingSecret: Buffer,
) {
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf-8')
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', aesKey, nonce)
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()                  // appended last — matches Python AESGCM
  const ciphertext = Buffer.concat([ct, tag])

  const nonceHex = nonce.toString('hex')
  const ciphertextHex = ciphertext.toString('hex')
  const timestamp = Math.floor(Date.now() / 1000).toString()

  const message = `${nonceHex}.${timestamp}.${ciphertextHex}`
  const signature = createHmac('sha256', signingSecret).update(message).digest('hex')

  return { nonceHex, ciphertextHex, timestamp, signature }
}

// Call a signed Gateway endpoint on behalf of an agent. Returns the parsed JSON.
export async function callGatewaySigned(
  path: string,                       // e.g. '/api/v1/explain'
  apiKey: string,                     // the agent's plaintext API key (from DB; not a secret cipher)
  secrets: AgentCipherSecrets,
  payload: unknown,
): Promise<unknown> {
  const aesKey = decryptUnderMaster(secrets.aesKeyEncrypted)
  const signingSecret = decryptUnderMaster(secrets.hmacSecretEncrypted)

  const { nonceHex, ciphertextHex, timestamp, signature } =
    buildSignedRequest(payload, aesKey, signingSecret)

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-HBEval-Nonce': nonceHex,
      'X-HBEval-Timestamp': timestamp,
      'X-HBEval-Signature': signature,
    },
    body: JSON.stringify({ ciphertext: ciphertextHex }),
    // The Gateway is fast for explain (no LLM call), but give it room.
    signal: AbortSignal.timeout(20000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Gateway ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}
