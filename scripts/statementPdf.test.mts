/**
 * PDF statement text extraction + parse.
 * Run: npm run test:statement-pdf
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStatementText, parseAmountTokenSigned } from '../src/services/statementParse.ts';
import {
  extractPdfText,
  extractTextFromPdfContent,
  isStatementImage,
  isStatementPdf,
} from '../src/services/statementPdf.ts';

let passed = 0;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  passed += 1;
}

function assertEq(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) {
    throw new Error(`FAIL: ${msg} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
  }
  passed += 1;
}

assert(isStatementPdf('statement.PDF', 'application/octet-stream'), 'pdf by extension');
assert(isStatementPdf('x.bin', 'application/pdf'), 'pdf by mime');
assert(!isStatementPdf('statement.csv', 'text/csv'), 'csv is not pdf');
assert(isStatementImage('scan.jpg', 'image/jpeg'), 'image by mime');
assert(!isStatementImage('statement.pdf', 'application/pdf'), 'pdf is not image');

assertEq(parseAmountTokenSigned('86,40-'), -86.4, 'trailing minus debit');
assertEq(parseAmountTokenSigned('43.00+'), 43, 'trailing plus credit');

assertEq(
  extractTextFromPdfContent('BT (Hello) Tj ET'),
  'Hello',
  'literal Tj extract',
);

const here = dirname(fileURLToPath(import.meta.url));

async function checkPdf(file: string, expectMerchant: string, expectCount: number) {
  const pdfBytes = new Uint8Array(readFileSync(join(here, 'fixtures', file)));
  const text = await extractPdfText(pdfBytes);
  assert(text.includes(expectMerchant), `${file}: merchant`);
  assert(text.includes('2026-09-25'), `${file}: date`);
  const items = parseStatementText(text);
  assertEq(items.length, expectCount, `${file}: expense count`);
  assertEq(items[0]!.name, 'Biedronka', `${file}: first merchant`);
  assertEq(items[0]!.amount, 86.4, `${file}: first amount`);
  assertEq(items[0]!.date, '2026-09-25', `${file}: first date`);
}

await checkPdf('statement-sample.pdf', 'Biedronka', 5);
await checkPdf('statement-sample-flate.pdf', 'Biedronka', 5);

{
  const erstePdf = new Uint8Array(
    readFileSync(join(here, 'fixtures/erste-transactions-history.pdf')),
  );
  const ersteText = await extractPdfText(erstePdf);
  assert(ersteText.includes('Appleads') || ersteText.includes('Visa Plat'), 'Erste PDF has card rows');
  const ersteItems = parseStatementText(ersteText);
  assert(ersteItems.length >= 14, `Erste PDF expenses (>=14, got ${ersteItems.length})`);
  assert(
    ersteItems.some((r) => Math.abs(r.amount - 39.26) < 0.001 && r.date === '2026-10-02'),
    'Erste PDF Appleads debit dated',
  );
  assert(
    ersteItems.some((r) => Math.abs(r.amount - 2485) < 0.001),
    'Erste PDF BLIK amount',
  );
  assert(
    ersteItems.every((r) => !!r.date),
    'Erste PDF rows keep bank dates',
  );
  assert(
    ersteItems.some(
      (r) => r.name.includes('Bog') && r.date === '2026-09-30' && Math.abs(r.amount - 126.03) < 0.001,
    ),
    'Bog recovers Sep 30 (not booking/today)',
  );
  assert(
    ersteItems.some(
      (r) => r.name.includes('Uniqlo') && r.date === '2026-09-30' && Math.abs(r.amount - 350.74) < 0.001,
    ),
    'Uniqlo recovers Sep 30 via chart FX amount',
  );
}

const trailing = parseStatementText('2026-09-25 Biedronka 86,40-\n2026-09-26 Salary 5000,00+');
assertEq(trailing.length, 1, 'only debit from trailing-sign PDF lines');
assertEq(trailing[0]!.amount, 86.4, 'trailing minus amount');

try {
  await extractPdfText(new Uint8Array([0x00, 0x01, 0x02, 0x03]));
  throw new Error('FAIL: expected non-PDF reject');
} catch (e) {
  assert(e instanceof Error && e.message.includes('doesn’t look like a PDF'), 'reject non-pdf');
}

console.log(`statementPdf.test.mts: ok (${passed} asserts)`);
