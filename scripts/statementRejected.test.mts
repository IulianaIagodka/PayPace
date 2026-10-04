import assert from 'node:assert/strict';
import { parseStatementText, parseNarrativeStatementText, normalizeStatementAiItems } from '../src/services/statementParse.ts';

for (const status of ['Rejected', 'Declined', 'FAILED', 'Cancelled', 'Odrzucona', 'Anulowana', 'Відхилено', 'Скасовано', 'Abgelehnt']) {
  const csv = `Transaction date;Title;Amount;Status\n2026-10-03;Attempt;-20;${status}\n2026-10-04;Lidl;-30;Completed`;
  assert.deepEqual(parseStatementText(csv).map(r => r.name), ['Lidl'], status);
  assert.deepEqual(parseStatementText(csv.split('\n').slice(0, 2).join('\n')), [], 'all rejected must not fall through');
}
assert.equal(parseStatementText('Transaction date;Title;Amount;Status\n2026-10-04;Rejected Shop;-10;Completed').length, 1, 'merchant name is not a status');
assert.equal(parseStatementText('2026-10-04;Merchant;-10;Declined').length, 0, 'headerless status');
assert.equal(parseStatementText('04.10.2026 Card payment declined -20.00').length, 0, 'inline rejected text');
assert.equal(parseStatementText('04.10.2026 Lidl Declined -20.00').length, 0, 'status next to amount');
for (const statusPosition of ['before', 'after', 'after-balance']) {
  const lines = ['Transaction list', '04 oct 2026', 'Visa Card Merchant'];
  if (statusPosition === 'before') lines.push('Declined');
  lines.push('20,00 PLN');
  if (statusPosition === 'after-balance') lines.push('100,00 PLN');
  if (statusPosition !== 'before') lines.push('Declined');
  lines.push('05 oct 2026', 'Visa Card Lidl', '30,00 PLN');
  const text = lines.join('\n');
  assert.deepEqual(parseNarrativeStatementText(text).map(r => r.name), ['Visa Card Lidl'], statusPosition);
  assert.equal(parseStatementText(text).length, 1, 'PDF text entry point');
}
const ai = normalizeStatementAiItems([
  {name:'Attempt',amount:20,date:'2026-10-03',status:'declined',category:'shopping'},
  {name:'Lidl',amount:30,date:'2026-10-04',status:'completed',category:'groceries'},
]);
assert.equal(ai.length, 1);
assert.equal(ai[0]?.category, 'groceries', 'discarded rows must not shift categories');
assert.equal(ai[0]?.name, 'Lidl');
console.log('PASS: rejected CSV, text, multiline PDF statuses and AI status/category alignment');
