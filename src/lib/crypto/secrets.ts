// lib/crypto/secrets.ts
// ─────────────────────────────────────────────────────────────────────────────
// SERVER-ONLY. Generates and encrypts per-agent secrets in the EXACT format the
// Gateway expects, so the Gateway's _decrypt_secret can recover them.
//
// Format (must match 02_provision_first_agent.py and gateway._decrypt_secret):
//   base64( nonce[12] || AES-256-GCM-ciphertext )   encrypted under the MASTER key.
// Node's GCM appends a 16-byte auth tag to the ciphertext; Python's AESGCM puts
// the tag at the END of its ciphertext too — so concatenating ciphertext+tag
// reproduces Python's exact byte layout. Verified by round-trip test.
//
// SECURITY:
//   • The master key lives only in HBEVAL_MASTER_AES_KEY (no NEXT_PUBLIC_).
//   • This module is server-only; the guard below fails the build if bundled
//     for the browser.
//   • Secrets are returned in plaintext ONCE to the caller (to show the user a
//     single time, Stripe-style) and stored only in encrypted form.
import 'server-only'
import { randomBytes, createCipheriv } from 'crypto'

const MASTER_KEY_B64 = process.env.HBEVAL_MASTER_AES_KEY

function masterKey(): Buffer {
  if (!MASTER_KEY_B64) {
    throw new Error('HBEVAL_MASTER_AES_KEY is not set.')
  }
  const key = Buffer.from(MASTER_KEY_B64, 'base64')
  if (key.length !== 32) {
    throw new Error('HBEVAL_MASTER_AES_KEY must decode to exactly 32 bytes.')
  }
  return key
}

// Encrypt raw bytes as base64(nonce[12] || ciphertext||tag) under the master key.
function encryptUnderMaster(raw: Buffer): string {
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', masterKey(), nonce)
  const ciphertext = Buffer.concat([cipher.update(raw), cipher.final()])
  const tag = cipher.getAuthTag()                 // 16 bytes, appended last (matches Python)
  return Buffer.concat([nonce, ciphertext, tag]).toString('base64')
}

export interface GeneratedAgentSecrets {
  // Plaintext — shown to the user exactly once, never stored as-is.
  apiKey: string
  aesKeyB64: string
  signingSecretB64: string
  // Encrypted-at-rest — what we write to the database.
  aesKeyEncrypted: string
  hmacSecretEncrypted: string
}

// Generate a complete, valid set of three credentials for one agent.
export function generateAgentSecrets(): GeneratedAgentSecrets {
  // API key: same human-facing format as the existing platform trigger.
  const apiKey = 'hbeval_sk_' + randomBytes(16).toString('hex')

  // Per-agent AES key and signing secret: 32 random bytes each.
  const aesKey = randomBytes(32)
  const signingSecret = randomBytes(32)

  return {
    apiKey,
    aesKeyB64: aesKey.toString('base64'),
    signingSecretB64: signingSecret.toString('base64'),
    aesKeyEncrypted: encryptUnderMaster(aesKey),
    hmacSecretEncrypted: encryptUnderMaster(signingSecret),
  }
}
