import { newId } from './id';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Short human-friendly invite code, e.g. 7K2M9Q */
export function generateInviteCode(length = 6): string {
  let out = '';
  const bytes = newId().replace(/-/g, '');
  for (let i = 0; i < length; i++) {
    const n = parseInt(bytes.slice(i * 2, i * 2 + 2), 16) % CODE_ALPHABET.length;
    out += CODE_ALPHABET[n];
  }
  return out;
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
