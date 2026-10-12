import * as Crypto from 'expo-crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Cryptographically random human-friendly invite code. */
export function generateInviteCode(length = 6): string {
  if (!Number.isInteger(length) || length < 1 || length > 64) throw new Error('Invalid invite length');
  let out = '';
  // Rejection sampling avoids modulo bias: 256 is divisible by 32.
  while (out.length < length) {
    const bytes = Crypto.getRandomBytes(length - out.length);
    for (const byte of bytes) {
      if (byte < 256 - (256 % CODE_ALPHABET.length)) {
        out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      }
    }
  }
  return out;
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
