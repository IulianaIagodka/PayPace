/**
 * On-device PDF text extraction for bank statement import.
 * Pure JS + fflate (FlateDecode) — no docutext (Hermes crashed on load/parse).
 */
import { decompressSync, inflateSync, unzlibSync } from 'fflate';

const MAX_PDF_BYTES = 8_000_000;

const STREAM = [0x73, 0x74, 0x72, 0x65, 0x61, 0x6d]; // stream
const ENDSTREAM = [0x65, 0x6e, 0x64, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d]; // endstream

export function isStatementPdf(
  fileName: string,
  mimeType?: string | null,
): boolean {
  const lowerName = (fileName || '').toLowerCase();
  const mime = (mimeType ?? '').toLowerCase();
  return lowerName.endsWith('.pdf') || mime.includes('pdf');
}

export function isStatementImage(
  fileName: string,
  mimeType?: string | null,
): boolean {
  const lowerName = (fileName || '').toLowerCase();
  const mime = (mimeType ?? '').toLowerCase();
  if (mime.includes('pdf')) return false;
  return (
    mime.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|heic|heif|bmp|tiff?)$/i.test(lowerName)
  );
}

function bytesToLatin1(bytes: Uint8Array): string {
  let out = '';
  const chunk = 0x4000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, Math.min(i + chunk, bytes.length));
    out += String.fromCharCode(...slice);
  }
  return out;
}

function indexOfBytes(haystack: Uint8Array, needle: number[], from = 0): number {
  outer: for (let i = from; i <= haystack.length - needle.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function tryInflate(raw: Uint8Array): Uint8Array | null {
  for (const run of [
    () => inflateSync(raw),
    () => unzlibSync(raw),
    () => decompressSync(raw),
  ]) {
    try {
      const out = run();
      if (out?.length) return out;
    } catch {
      // try next strategy
    }
  }
  return null;
}

/** Find raw stream payloads between stream / endstream keywords. */
function extractRawStreams(pdf: Uint8Array): Uint8Array[] {
  const streams: Uint8Array[] = [];
  let from = 0;
  while (from < pdf.length) {
    const streamKey = indexOfBytes(pdf, STREAM, from);
    if (streamKey < 0) break;
    // Ensure keyword boundary (not part of /Filter name etc. mid-token is rare; accept).
    let dataStart = streamKey + STREAM.length;
    if (pdf[dataStart] === 0x0d /* \r */) dataStart += 1;
    if (pdf[dataStart] === 0x0a /* \n */) dataStart += 1;
    const endKey = indexOfBytes(pdf, ENDSTREAM, dataStart);
    if (endKey < 0) break;
    let dataEnd = endKey;
    if (dataEnd > dataStart && pdf[dataEnd - 1] === 0x0a) dataEnd -= 1;
    if (dataEnd > dataStart && pdf[dataEnd - 1] === 0x0d) dataEnd -= 1;
    if (dataEnd > dataStart) {
      streams.push(pdf.subarray(dataStart, dataEnd));
    }
    from = endKey + ENDSTREAM.length;
  }
  return streams;
}

function unescapePdfLiteral(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i]!;
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = raw[i + 1];
    if (next == null) break;
    i += 1;
    switch (next) {
      case 'n':
        out += '\n';
        break;
      case 'r':
        out += '\r';
        break;
      case 't':
        out += '\t';
        break;
      case 'b':
        out += '\b';
        break;
      case 'f':
        out += '\f';
        break;
      case '(':
      case ')':
      case '\\':
        out += next;
        break;
      default:
        if (next >= '0' && next <= '7') {
          let oct = next;
          for (let k = 0; k < 2; k += 1) {
            const c = raw[i + 1];
            if (c && c >= '0' && c <= '7') {
              oct += c;
              i += 1;
            } else break;
          }
          out += String.fromCharCode(parseInt(oct, 8));
        } else {
          out += next;
        }
    }
  }
  return out;
}

/** Pull visible text from PDF content operators: (literal) Tj / TJ arrays. */
export function extractTextFromPdfContent(content: string): string {
  const lines: string[] = [];

  const tjRe = /\((?:\\.|[^\\)])*\)\s*(?:Tj|'|")/g;
  let m: RegExpExecArray | null;
  while ((m = tjRe.exec(content))) {
    const lit = m[0].match(/^\((?:\\.|[^\\)])*\)/)?.[0];
    if (!lit) continue;
    const text = unescapePdfLiteral(lit.slice(1, -1)).trim();
    if (text) lines.push(text);
  }

  const tjArrayRe = /\[([\s\S]*?)\]\s*TJ/g;
  while ((m = tjArrayRe.exec(content))) {
    const inner = m[1] ?? '';
    const parts: string[] = [];
    const partRe = /\((?:\\.|[^\\)])*\)/g;
    let p: RegExpExecArray | null;
    while ((p = partRe.exec(inner))) {
      parts.push(unescapePdfLiteral(p[0].slice(1, -1)));
    }
    const joined = parts.join('').trim();
    if (joined) lines.push(joined);
  }

  const hexRe = /<([0-9A-Fa-f\s]+)>\s*(?:Tj|'|")/g;
  while ((m = hexRe.exec(content))) {
    const hex = (m[1] ?? '').replace(/\s+/g, '');
    if (hex.length < 2 || hex.length % 2) continue;
    let text = '';
    for (let i = 0; i < hex.length; i += 2) {
      text += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
    text = text.replace(/\0/g, '').trim();
    if (text) lines.push(text);
  }

  return lines.join('\n').trim();
}

function decodeStream(raw: Uint8Array): string {
  const inflated = tryInflate(raw);
  return bytesToLatin1(inflated ?? raw);
}

/**
 * Extract plain text from a PDF buffer (text PDFs / FlateDecode content streams).
 * Image-only scanned PDFs throw — use CSV or a statement photo instead.
 */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  if (!bytes.length) {
    throw new Error('PDF file is empty.');
  }
  if (bytes.length > MAX_PDF_BYTES) {
    throw new Error('PDF is too large. Export a shorter period or use CSV.');
  }

  const head = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!);
  if (head !== '%PDF') {
    throw new Error('That file doesn’t look like a PDF.');
  }

  const streams = extractRawStreams(bytes);
  const chunks: string[] = [];

  for (const raw of streams) {
    try {
      const content = decodeStream(raw);
      const text = extractTextFromPdfContent(content);
      if (text) chunks.push(text);
    } catch {
      // skip bad stream
    }
  }

  if (!chunks.length) {
    // Last resort for tiny uncompressed PDFs where stream scan missed content.
    const whole = extractTextFromPdfContent(bytesToLatin1(bytes.subarray(0, Math.min(bytes.length, 512_000))));
    if (whole) chunks.push(whole);
  }

  const text = chunks.join('\n').trim();
  if (!text) {
    throw new Error(
      'This PDF has no readable text (it may be a scanned image). Export a CSV from your bank, or upload a clear photo of the statement.',
    );
  }
  return text;
}
