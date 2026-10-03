/**
 * On-device PDF text extraction for bank statement import.
 * DocuText is loaded lazily so Hermes never evaluates it at app startup
 * (a static import white-screened TestFlight build #102).
 */
const MAX_PDF_BYTES = 8_000_000;

type DocuTextApi = {
  fromBuffer: (
    data: Uint8Array,
    options?: { textMode?: 'layout' | 'clean' },
  ) => { text?: string };
};

let docuTextPromise: Promise<DocuTextApi> | null = null;

function loadDocuText(): Promise<DocuTextApi> {
  if (!docuTextPromise) {
    docuTextPromise = import('docutext').then((mod) => mod.DocuText as DocuTextApi);
  }
  return docuTextPromise;
}

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

/**
 * Extract plain text from a PDF buffer.
 * Prefers layout mode (better for tabular statements), falls back to clean.
 */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  if (!bytes.length) {
    throw new Error('PDF file is empty.');
  }
  if (bytes.length > MAX_PDF_BYTES) {
    throw new Error('PDF is too large. Export a shorter period or use CSV.');
  }

  // %PDF magic — reject non-PDFs early with a clear message.
  const head = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!);
  if (head !== '%PDF') {
    throw new Error('That file doesn’t look like a PDF.');
  }

  let DocuText: DocuTextApi;
  try {
    DocuText = await loadDocuText();
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'PDF engine unavailable.';
    throw new Error(`Couldn’t load PDF reader. ${detail}`);
  }

  let layoutText = '';
  try {
    const layout = DocuText.fromBuffer(bytes, { textMode: 'layout' });
    layoutText = (layout.text ?? '').trim();
  } catch {
    layoutText = '';
  }

  if (layoutText.length >= 20) return layoutText;

  try {
    const clean = DocuText.fromBuffer(bytes, { textMode: 'clean' });
    const cleanText = (clean.text ?? '').trim();
    if (cleanText) return cleanText;
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Could not read PDF.';
    throw new Error(`Couldn’t extract text from this PDF. ${detail}`);
  }

  if (layoutText) return layoutText;
  throw new Error(
    'This PDF has no readable text (it may be a scanned image). Export a CSV from your bank, or use a text PDF.',
  );
}
