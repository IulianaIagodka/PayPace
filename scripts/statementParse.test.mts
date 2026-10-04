/**
 * Bank statement CSV parsing (mBank + Erste heuristics).
 * Run: npm run test:statement
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cleanMerchantName,
  collectChartAmountDates,
  parseAmountTokenSigned,
  parseNarrativeStatementText,
  parseStatementDate,
  parseStatementText,
  splitDelimitedLine,
} from '../src/services/statementParse.ts';

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

assertEq(parseAmountTokenSigned('-152,00'), -152, 'PL debit');
assertEq(parseAmountTokenSigned('32 958,56'), 32958.56, 'PL thousands');
assertEq(parseAmountTokenSigned('2 438,88 PLN'), 2438.88, 'PLN suffix');
assert(parseAmountTokenSigned('79 1140 2004 0000 3402 8529 1556') == null, 'reject account#');
assert(parseAmountTokenSigned('+48 (42) 6 300 800') == null, 'reject phone');

assertEq(parseStatementDate('02 oct 2026'), '2026-10-02', 'Erste EN month');
assertEq(parseStatementDate('30 sep 2026'), '2026-09-30', 'Erste sep');
assertEq(parseStatementDate('01 Oct 2026'), '2026-10-01', 'Erste capitalized');
assertEq(parseStatementDate('Booking date 04 oct 2026'), null, 'ignore booking date');
assertEq(parseStatementDate('Document on: 03 oct 2026'), null, 'ignore document on');
assertEq(parseStatementDate('02'), null, 'reject bare day');

const merchant = cleanMerchantName(
  'ANDRZEJ OTOWSKI    /WARSZAWA                                          DATA TRANSAKCJI: 2026-09-25',
);
assertEq(merchant.name, 'ANDRZEJ OTOWSKI', 'merchant before city');
assertEq(merchant.date, '2026-09-25', 'DATA TRANSAKCJI');

const cols = splitDelimitedLine(
  [
    '2026-09-26',
    '2026-09-26',
    'ZAKUP',
    '"SHELL 18 /Warszawa DATA TRANSAKCJI: 2026-09-25"',
    '"  "',
    "'",
    '-675,41',
    '31 896,15',
    '',
  ].join(';'),
  ';',
);
assert(cols.length >= 8, 'quoted split keeps amount cols');
assertEq(cols[6], '-675,41', 'kwota col');
assertEq(cols[7], '31 896,15', 'saldo col');

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(here, 'fixtures/mbank-ekonto.csv'), 'utf8');
const items = parseStatementText(fixture);

assertEq(items.length, 10, '10 card ops from fixture');
assertEq(items[0]!.amount, 152, 'first amount is kwota not saldo');
assertEq(items[0]!.name, 'ANDRZEJ OTOWSKI', 'merchant name not ZAKUP…');
assertEq(items[0]!.date, '2026-09-25', 'prefers DATA TRANSAKCJI');
assertEq(items[7]!.amount, 675.41, 'SHELL amount');
assertEq(items[7]!.name, 'SHELL 18', 'SHELL merchant');

const sum = items.reduce((s, i) => s + i.amount, 0);
assert(Math.abs(sum - (152 + 13 + 13 + 13 + 85 + 13 + 250 + 675.41 + 167.2 + 14)) < 0.01, 'sum');

const fullPath = '/home/ubuntu/.cursor/projects/workspace/uploads/85291556_260925_260928_199c.csv';
try {
  const full = readFileSync(fullPath, 'utf8');
  const all = parseStatementText(full);
  assertEq(all.length, 29, 'full mBank export ops');
  const total = all.reduce((s, i) => s + i.amount, 0);
  assert(Math.abs(total - 2438.88) < 0.02, `full total got ${total}`);
  assert(
    !all.some((i) => i.name.toLowerCase().includes('zakup przy')),
    'no generic ZAKUP labels',
  );
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
}

const ersteText = readFileSync(join(here, 'fixtures/erste-list-of-transactions.txt'), 'utf8');
const erste = parseNarrativeStatementText(ersteText);
assert(erste.length >= 10, `Erste narrative rows (>=10, got ${erste.length})`);
assert(
  erste.every(
    (row) => row.date === '2026-10-02' || row.date === '2026-10-01' || row.date === '2026-09-30',
  ),
  'Erste rows use transaction dates not booking/document',
);
assert(erste.some((row) => row.date === '2026-10-02'), 'has 02 oct');
assert(erste.some((row) => row.date === '2026-10-01'), 'has 01 oct');
assert(erste.some((row) => row.date === '2026-09-30'), 'has 30 sep');
assert(!erste.some((row) => row.date === '2026-10-03'), 'not document-on today');
assert(!erste.some((row) => row.date === '2026-10-04'), 'not booking date');

const ersteViaMain = parseStatementText(ersteText);
assert(ersteViaMain.length >= 10, 'parseStatementText hits Erste narrative');
assert(
  new Set(ersteViaMain.map((r) => r.date)).size >= 3,
  'Erste spans 3+ days',
);

// Real Erste Bank Polska PDF extract: unsigned amounts on their own lines,
// booking dates split across lines, Polish card label broken by font encoding.
const erstePdfExtract = readFileSync(join(here, 'fixtures/erste-pdf-extract.txt'), 'utf8');
const erstePdfRows = parseNarrativeStatementText(erstePdfExtract);
assert(erstePdfRows.length >= 14, `Erste PDF extract rows (>=14, got ${erstePdfRows.length})`);
assert(
  erstePdfRows.some((r) => r.name.includes('Appleads') && r.amount === 39.26 && r.date === '2026-10-02'),
  'Appleads 39.26 on transaction date',
);
assert(
  erstePdfRows.some((r) => r.amount === 2485 && r.date === '2026-10-03'),
  'BLIK 2485 on 03 oct',
);
assert(
  erstePdfRows.some((r) => r.name.includes('Uniqlo') && r.amount === 350.74),
  'Uniqlo from page 2',
);
assert(
  !erstePdfRows.some((r) => r.name.toLowerCase().includes('platnosc')),
  'card chrome stripped from merchant',
);
assertEq(parseStatementText(erstePdfExtract).length, erstePdfRows.length, 'main path = narrative');

// Real Erste PDFs often drop the Transaction date glyph for later rows and only
// keep Booking date — without recovery those imports all land on "today".
const chartDates = collectChartAmountDates(erstePdfExtract);
assertEq(chartDates.get('126.03'), '2026-09-30', 'chart maps Bog PLN amount');
assertEq(chartDates.get('114.70'), '2026-09-30', 'chart maps Lidl FX amount');
assertEq(chartDates.get('597.00'), '2026-09-30', 'chart maps Uniqlo FX on page 2');

const missingTxDateMerchants = [
  { needle: 'Bog & Ide', amount: 126.03 },
  { needle: 'Lidlfisketorvet', amount: 67.39 },
  { needle: 'Snk Group Aps Roedovre', amount: 31.87 },
  { needle: 'Kalvebod', amount: 109.86 },
  { needle: 'Foetex', amount: 121.25 },
  { needle: 'Uniqlo', amount: 350.74 },
  { needle: 'Rejsebillet', amount: 17.64 },
];
for (const m of missingTxDateMerchants) {
  const row = erstePdfRows.find(
    (r) => r.name.includes(m.needle) && Math.abs(r.amount - m.amount) < 0.001,
  );
  assert(row, `${m.needle} row present`);
  assertEq(row!.date, '2026-09-30', `${m.needle} recovers transaction day from chart`);
}
assert(
  erstePdfRows.every((r) => !!r.date),
  'no dateless Erste PDF rows (would become today on import)',
);
assert(
  !erstePdfRows.some((r) => r.name.includes('Bog') && r.date === '2026-10-04'),
  'Bog must not use booking/today',
);

console.log(`statementParse.test.mts: ok (${passed} asserts)`);
