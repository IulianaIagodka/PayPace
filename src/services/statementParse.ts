/**
 * Pure bank-statement text/CSV parsing (no React Native / Expo deps).
 * Used by statementAnalyzer and Node tests.
 */
import { format, startOfDay } from 'date-fns';

export type ParsedStatementRow = {
  name: string;
  amount: number;
  date?: string;
};

function toDateKey(date: Date): string {
  const d = startOfDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Signed amount; null if not a money token. Keeps minus for debit detection. */
export function parseAmountTokenSigned(raw: string): number | null {
  let cleaned = raw.trim().replace(/\s/g, '').replace(/[^\d,.\-+]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '+' || cleaned === '.' || cleaned === ',') {
    return null;
  }
  // Bank PDFs often print debits as "86,40-" (trailing minus).
  if (cleaned.endsWith('-') && !cleaned.startsWith('-')) {
    cleaned = `-${cleaned.slice(0, -1)}`;
  } else if (cleaned.endsWith('+') && !cleaned.startsWith('+')) {
    cleaned = cleaned.slice(0, -1);
  }
  const digitCount = (cleaned.match(/\d/g) ?? []).length;
  if (digitCount > 12) return null;

  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value === 0) return null;
  if (Math.abs(value) > 50_000_000) return null;
  return value;
}

function parseAmountToken(raw: string): number | null {
  const signed = parseAmountTokenSigned(raw);
  if (signed == null) return null;
  return Math.abs(signed);
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  sty: 0,
  stycznia: 0,
  feb: 1,
  february: 1,
  lut: 1,
  lutego: 1,
  mar: 2,
  march: 2,
  marca: 2,
  apr: 3,
  april: 3,
  kwi: 3,
  kwietnia: 3,
  may: 4,
  maj: 4,
  maja: 4,
  jun: 5,
  june: 5,
  cze: 5,
  czerwca: 5,
  jul: 6,
  july: 6,
  lip: 6,
  lipca: 6,
  aug: 7,
  august: 7,
  sie: 7,
  sierpnia: 7,
  sep: 8,
  sept: 8,
  september: 8,
  wrz: 8,
  wrzesnia: 8,
  oct: 9,
  october: 9,
  paz: 9,
  pazdziernika: 9,
  nov: 10,
  november: 10,
  lis: 10,
  listopada: 10,
  dec: 11,
  december: 11,
  gru: 11,
  grudnia: 11,
};

function monthTokenToIndex(raw: string): number | null {
  const key = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\./g, '');
  return MONTH_INDEX[key] ?? null;
}

function ymdKey(y: number, m: number, d: number): string | null {
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  if (y < 2000 || y > 2100) return null;
  const dt = new Date(y, m, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) return null;
  return format(dt, 'yyyy-MM-dd');
}

/** True for booking / document metadata dates that must not become spend dates. */
export function isNonTransactionDateLabel(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  return (
    t.includes('booking date') ||
    t.includes('data ksieg') ||
    t.includes('data księg') ||
    t.startsWith('document on') ||
    t.includes('dokument z dnia') ||
    t.includes('statement date') ||
    t.includes('wygenerowano')
  );
}

/**
 * Pull the first calendar date from bank text ("02 oct 2026", "02.10.2026", ISO).
 * Ignores booking/document labels so Erste "Booking date …" is not used as spend day.
 */
export function parseStatementDate(raw: string, now = new Date()): string | null {
  const text = raw.trim();
  if (!text) return null;
  if (isNonTransactionDateLabel(text)) return null;

  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return ymdKey(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const dmy = /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/.exec(text);
  if (dmy) {
    let y = Number(dmy[3]);
    if (y < 100) y += 2000;
    return ymdKey(y, Number(dmy[2]) - 1, Number(dmy[1]));
  }

  // Erste / EN-PL statements: "02 oct 2026", "30 Sep 2026", "1 października 2026"
  const mon = /(\d{1,2})\s+([A-Za-zÀ-ž.]+)\s+(\d{4})/.exec(text);
  if (mon) {
    const month = monthTokenToIndex(mon[2]!);
    if (month != null) return ymdKey(Number(mon[3]), month, Number(mon[1]));
  }

  // Avoid Date.parse on bare numbers / junk like "02" (ambiguous epoch dates).
  if (!/[a-z]/i.test(text) && !/\d{4}/.test(text)) return null;

  const parsed = Date.parse(text);
  if (Number.isFinite(parsed)) {
    const d = new Date(parsed);
    if (d.getFullYear() > 2000 && d.getFullYear() < now.getFullYear() + 2) {
      // Rebuild via local Y-M-D parts from UTC parse — prefer explicit formats above.
      return toDateKey(d);
    }
  }
  return null;
}

/** Split a delimited line, respecting double-quoted fields. */
export function splitDelimitedLine(line: string, delim: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delim && !inQuotes) {
      cols.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  cols.push(cur.trim());
  return cols.map((c) => c.replace(/^"|"$/g, '').trim());
}

function detectDelimiter(lines: string[]): string {
  let best = ';';
  let bestScore = -1;
  for (const delim of [';', '\t', ',']) {
    let score = 0;
    for (const line of lines.slice(0, 40)) {
      const n = splitDelimitedLine(line, delim).length;
      if (n >= 4) score += n;
    }
    if (score > bestScore) {
      bestScore = score;
      best = delim;
    }
  }
  return best;
}

function normalizeHeader(cell: string): string {
  return cell
    .replace(/^#+/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

type ColumnRole =
  | 'bookingDate'
  | 'opDate'
  | 'description'
  | 'title'
  | 'counterparty'
  | 'amount'
  | 'balance'
  | 'ignore';

function classifyHeader(cell: string): ColumnRole {
  const h = normalizeHeader(cell);
  if (!h) return 'ignore';
  if (h.includes('saldo') || h.includes('balance after') || h.includes('running balance')) {
    return 'balance';
  }
  if (
    h === 'kwota' ||
    h === 'amount' ||
    h.includes('kwota') ||
    (h.includes('amount') && !h.includes('balance')) ||
    h.includes('wartosc') ||
    h.includes('suma')
  ) {
    return 'amount';
  }
  if (
    h.includes('data oper') ||
    h.includes('operation date') ||
    h.includes('trans date') ||
    h.includes('transaction date') ||
    h.includes('data transakcji')
  ) {
    return 'opDate';
  }
  if (
    h.includes('data ksieg') ||
    h.includes('data ksi') || // mojibake: księgowania → ksi gowania / ksiêgowania
    h.includes('booking') ||
    h.includes('posting') ||
    h === 'data' ||
    (h.includes('date') && !h.includes('oper') && !h.includes('trans'))
  ) {
    return 'bookingDate';
  }
  // "tytuł" often arrives as "tytu" / "tytu3" in CP1250→UTF-8 mojibake
  if (h.includes('tytul') || h.startsWith('tytu') || h.includes('title') || h.includes('nazwa')) {
    return 'title';
  }
  if (h.includes('opis') || h.includes('description') || h.includes('details')) return 'description';
  if (h.includes('nadawca') || h.includes('odbiorca') || h.includes('counterparty') || h.includes('payee')) {
    return 'counterparty';
  }
  if (h.includes('numer konta') || h.includes('account')) return 'ignore';
  return 'ignore';
}

function looksLikeHeaderRow(cols: string[]): boolean {
  const roles = cols.map(classifyHeader);
  return roles.includes('amount') && (roles.includes('opDate') || roles.includes('bookingDate'));
}

/** Pull merchant + optional transaction date from mBank-style title. */
export function cleanMerchantName(raw: string): { name: string; date?: string } {
  let text = raw.replace(/\s+/g, ' ').trim();
  let date: string | undefined;
  const txDate = /DATA\s+TRANSAKCJI\s*:\s*(\d{4}-\d{2}-\d{2})/i.exec(text);
  if (txDate) {
    date = txDate[1];
    text = text.slice(0, txDate.index).trim();
  }
  const slash = text.indexOf('/');
  if (slash > 0) {
    const left = text.slice(0, slash).trim();
    if (left.length >= 2) text = left;
  }
  text = text.replace(/^["']+|["']+$/g, '').trim();
  return { name: text.slice(0, 80) || 'Transaction', date };
}

function isGenericOpLabel(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes('zakup przy') ||
    n.includes('card purchase') ||
    n.includes('przelew') ||
    n.includes('payment') ||
    n.includes('obciaz') ||
    n.includes('obciąż') ||
    n.startsWith('#') ||
    n === 'transaction'
  );
}

function pickMerchant(cols: string[], roles: ColumnRole[] | null): string {
  if (roles) {
    const byRole = (role: ColumnRole) => {
      const idx = roles.indexOf(role);
      return idx >= 0 ? cols[idx] : '';
    };
    for (const role of ['title', 'counterparty', 'description'] as ColumnRole[]) {
      const raw = byRole(role);
      if (!raw || raw.length < 2) continue;
      const { name } = cleanMerchantName(raw);
      if (name && !isGenericOpLabel(name)) return name;
    }
    const desc = byRole('description');
    if (desc) return cleanMerchantName(desc).name;
  }

  const candidates = cols
    .map((c) => cleanMerchantName(c).name)
    .filter((n) => n.length > 2 && /[a-zA-Zа-яА-ЯіІїЇєЄęółąśżźćń]/i.test(n));
  const specific = candidates.find((n) => !isGenericOpLabel(n));
  return (specific ?? candidates[0] ?? 'Transaction').slice(0, 80);
}

function rowToItem(cols: string[], roles: ColumnRole[] | null): ParsedStatementRow | null {
  let amountSigned: number | null = null;
  let date: string | undefined;
  let titleDate: string | undefined;

  if (roles) {
    const amountIdxRole = roles.indexOf('amount');
    if (amountIdxRole < 0) return null;
    amountSigned = parseAmountTokenSigned(cols[amountIdxRole] ?? '');
    if (amountSigned == null) return null;
    // Expenses only: skip credits / incoming transfers.
    if (amountSigned > 0) return null;

    const opIdx = roles.indexOf('opDate');
    const bookIdx = roles.indexOf('bookingDate');
    date =
      (opIdx >= 0 ? parseStatementDate(cols[opIdx] ?? '') : null) ??
      (bookIdx >= 0 ? parseStatementDate(cols[bookIdx] ?? '') : null) ??
      undefined;

    const titleIdx = roles.indexOf('title');
    if (titleIdx >= 0) {
      const cleaned = cleanMerchantName(cols[titleIdx] ?? '');
      titleDate = cleaned.date;
    }
  } else {
    const dateHits: Array<{ idx: number; date: string }> = [];
    for (let c = 0; c < Math.min(cols.length, 4); c++) {
      const d = parseStatementDate(cols[c] ?? '');
      if (d) dateHits.push({ idx: c, date: d });
    }
    if (!dateHits.length) return null;
    date = dateHits[dateHits.length > 1 ? 1 : 0]?.date;

    const money: Array<{ idx: number; signed: number }> = [];
    for (let c = 0; c < cols.length; c++) {
      if (dateHits.some((d) => d.idx === c)) continue;
      const signed = parseAmountTokenSigned(cols[c] ?? '');
      if (signed != null) money.push({ idx: c, signed });
    }
    if (!money.length) return null;

    const debit = [...money].reverse().find((m) => m.signed < 0);
    if (debit) {
      amountSigned = debit.signed;
    } else if (money.length >= 2) {
      amountSigned = money[money.length - 2]!.signed;
    } else {
      amountSigned = money[money.length - 1]!.signed;
    }
    if (amountSigned == null || amountSigned > 0) return null;

    for (const col of cols) {
      const cleaned = cleanMerchantName(col);
      if (cleaned.date) titleDate = cleaned.date;
    }
  }

  const name = pickMerchant(cols, roles);
  return {
    name,
    amount: Math.abs(amountSigned),
    date: titleDate ?? date,
  };
}

function isStandaloneDateLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || isNonTransactionDateLabel(trimmed)) return null;
  // Whole line is basically just a date (optional punctuation).
  if (!/^[\dA-Za-zÀ-ž.\s/-]+$/.test(trimmed)) return null;
  const words = trimmed.split(/\s+/);
  if (words.length > 4) return null;
  return parseStatementDate(trimmed);
}

const MONEY_TOKEN_RE =
  /([-+]?\d{1,3}(?:[ \u00a0]?\d{3})*[.,]\d{2})\s*(?:PLN|zł|zl)?/gi;

const ERSTE_EXPENSE_HINT_RE =
  /visa|mastercard|blik|zakup|płatność|platnosc|p\s*atno|debit|card|apple\.com|itunes|ref:\s*\d+/i;

const ERSTE_CREDIT_HINT_RE =
  /przychodz|incoming|salary|wynagrodzenie|wpływ|wplyw|credit transfer|przelew przychod/i;

function extractDebitAmount(line: string): number | null {
  // Prefer "… -39.26 PLN" / "… -39,26" near the end (Erste amount column).
  const matches = [...line.matchAll(MONEY_TOKEN_RE)];
  for (let i = matches.length - 1; i >= 0; i--) {
    const signed = parseAmountTokenSigned(matches[i]![1]!);
    if (signed != null && signed < 0) return Math.abs(signed);
  }
  // Some exports omit the minus for debit-only lists — take last money token if line looks like a card spend.
  if (ERSTE_EXPENSE_HINT_RE.test(line) && matches.length) {
    const signed = parseAmountTokenSigned(matches[matches.length - 1]![1]!);
    if (signed != null) return Math.abs(signed);
  }
  return null;
}

/** True when the whole line is a money amount (optional currency), e.g. "39,26 PLN". */
function parseAmountOnlyLine(line: string): number | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const m = trimmed.match(
    /^[-+]?\d{1,3}(?:[ \u00a0]?\d{3})*[.,]\d{2}\s*(?:PLN|zł|zl)?$/i,
  );
  if (!m) return null;
  const signed = parseAmountTokenSigned(trimmed);
  if (signed == null) return null;
  return Math.abs(signed);
}

function merchantFromErsteLine(line: string): string {
  let text = line.replace(/\s+/g, ' ').trim();
  text = text.replace(/^visa\s+\w+\s+\d+\*{4,}\d+\s*/i, '');
  text = text.replace(/^mastercard\s+\w*\s*\d*\*{0,}\d*\s*/i, '');
  text = text.replace(/płatność\s+kartą?|platnosc\s+kart\w*|p\s*atno\s*kart\w*/gi, ' ');
  text = text.replace(/\d+[.,]\d+\s*(eur|usd|dkk|gbp|chf|nok|sek)\b[^]*?(?:pln|zł)?/gi, ' ');
  text = text.replace(/\d+\s+\w+\s*=\s*[\d.,]+\s*\w+/gi, ' ');
  text = text.replace(/[-+]?\d{1,3}(?:[ \u00a0]?\d{3})*[.,]\d{2}\s*(?:PLN|zł|zl)?/gi, ' ');
  text = text.replace(/\b\d{2}\s+[A-Za-zÀ-ž.]+\s+\d{4}\b/g, ' ');
  text = text.replace(/\bbooking\s+date\b/gi, ' ');
  text = text.replace(/\bref:\s*\d+/gi, ' ');
  // FX leftovers left on their own when the rate line was split across PDF Tj ops.
  text = text.replace(/\b(?:eur|usd|dkk|gbp|chf|nok|sek|pln|zł|zl)\b/gi, ' ');
  text = text.replace(/\b\d{6,}\b/g, ' '); // phone / long refs
  text = text.replace(/\s+/g, ' ').trim();
  const { name } = cleanMerchantName(text);
  return name;
}

/**
 * Erste PDF text extract often splits booking dates and Polish card labels across lines,
 * and prints debit amounts without a leading minus on their own line.
 */
export function normalizeNarrativeStatementText(text: string): string {
  let out = text.replace(/\r\n/g, '\n');
  // "Booking date 04\noct 2026" → one labeled line (still ignored as spend date).
  out = out.replace(
    /Booking date\s+(\d{1,2})\s*\n\s*([A-Za-zÀ-ž.]+)\s+(\d{4})/gi,
    'Booking date $1 $2 $3',
  );
  // Custom-font loss: "Płatność Kartą" → "P" / "atno" / "Kart"
  out = out.replace(/\bP\s*\n\s*atno\s*\n\s*Kart\b/gi, 'Platnosc Kart');
  out = out.replace(/\bP\s+atno\s+Kart\b/gi, 'Platnosc Kart');
  return out;
}

function looksLikeErsteExpenseDescription(desc: string): boolean {
  const t = desc.replace(/\s+/g, ' ').trim();
  if (t.length < 6) return false;
  if (ERSTE_CREDIT_HINT_RE.test(t)) return false;
  if (ERSTE_EXPENSE_HINT_RE.test(t)) return true;
  // Merchant-looking leftover after card chrome was stripped elsewhere.
  return /[a-zA-Zà-ž]{3,}/i.test(t) && !/^[\d\s.,PLNzł-]+$/i.test(t);
}

/**
 * Erste / multi-line PDF text: date on its own line, then description+amount.
 * Uses Transaction date lines; ignores "Booking date" and "Document on".
 * Real Erste PDFs often put unsigned amount + balance on following lines.
 */
export function parseNarrativeStatementText(text: string): ParsedStatementRow[] {
  const items: ParsedStatementRow[] = [];
  const lines = normalizeNarrativeStatementText(text)
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  let currentDate: string | undefined;
  let pendingDesc: string[] = [];

  const flushAmount = (amount: number, descRaw: string, date: string | undefined) => {
    if (!looksLikeErsteExpenseDescription(descRaw)) return;
    if (ERSTE_CREDIT_HINT_RE.test(descRaw)) return;
    const name = merchantFromErsteLine(descRaw);
    if (!name || name === 'Transaction') return;
    if (!/[a-zA-Zа-яА-ЯіІїЇєЄęółąśżźćń]/i.test(name)) return;
    items.push({
      name: name.slice(0, 80),
      amount,
      date,
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^page\s+\d+/i.test(line)) continue;
    if (
      /list of transactions|transaction list|erste bank|account number|^account$|^transaction$|^amount$|^balance$|^transaction date$/i.test(
        line,
      )
    ) {
      // Chart / header blocks before the real list must not keep a chart date.
      if (/transaction list|list of transactions|^transaction date$/i.test(line)) {
        currentDate = undefined;
        pendingDesc = [];
      }
      continue;
    }
    // Chart / glyph junk from Erste PDF extracts.
    if (/^[!"#$%&'*+,./:;<=>?@\\^_`{|}~-]+$/.test(line) || line === '!') continue;

    if (isNonTransactionDateLabel(line) || /^booking date\b/i.test(line)) {
      continue;
    }

    const alone = isStandaloneDateLine(line);
    if (alone) {
      // Date belongs to the next transaction only — do not carry across rows.
      currentDate = alone;
      pendingDesc = [];
      continue;
    }

    // Amount-only line after a multi-line description (unsigned Erste PDF layout).
    const amountOnly = parseAmountOnlyLine(line);
    if (amountOnly != null && pendingDesc.length) {
      const desc = pendingDesc.join(' ');
      const date = currentDate;
      flushAmount(amountOnly, desc, date);
      // Optional balance line immediately after.
      const next = lines[i + 1];
      if (next && parseAmountOnlyLine(next) != null) i += 1;
      pendingDesc = [];
      currentDate = undefined;
      continue;
    }

    // Single-line "desc … -39.26 PLN" (fixture / text exports).
    const inlineAmount = extractDebitAmount(line);
    if (inlineAmount != null && !parseAmountOnlyLine(line)) {
      const leading = parseStatementDate(line.split(/\s{2,}|\t/)[0] ?? '');
      const date = leading ?? currentDate;
      const desc = [...pendingDesc, line].join(' ');
      flushAmount(inlineAmount, desc, date);
      pendingDesc = [];
      currentDate = undefined;
      continue;
    }

    // Accumulate description fragments for the current transaction.
    if (
      pendingDesc.length ||
      ERSTE_EXPENSE_HINT_RE.test(line) ||
      /zakup|blik|przelew|platnosc|płatność|visa|mastercard/i.test(line)
    ) {
      pendingDesc.push(line);
      // Cap runaway junk from chart streams.
      if (pendingDesc.length > 12) pendingDesc = pendingDesc.slice(-12);
    }
  }
  return items;
}

function parseLooseText(text: string): ParsedStatementRow[] {
  const items: ParsedStatementRow[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const amountTail = String.raw`([+-]?\d+[.,]\d{2}[+-]?|[+-]?\d+[.,]\d{2}\s*(?:PLN|EUR|USD|GBP|zł|zl)?)`;
  for (const line of lines) {
    const withDate = line.match(
      new RegExp(
        String.raw`^(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-zÀ-ž.]+\s+\d{4})\s+(.+?)\s+${amountTail}\s*$`,
        'i',
      ),
    );
    if (withDate) {
      const signed = parseAmountTokenSigned(withDate[3]!);
      if (signed == null || signed > 0) continue;
      items.push({
        name: cleanMerchantName(withDate[2]!.trim()).name.slice(0, 80) || 'Transaction',
        amount: Math.abs(signed),
        date: parseStatementDate(withDate[1]!) ?? undefined,
      });
      continue;
    }
    const match = line.match(new RegExp(String.raw`(.+?)\s+${amountTail}\s*$`, 'i'));
    if (!match) continue;
    const signed = parseAmountTokenSigned(match[2]!);
    if (signed == null || signed > 0) continue;
    const name = match[1]!.replace(/[\d./-]+$/, '').trim() || 'Transaction';
    const leadingDate = parseStatementDate(match[1]!.trim().split(/\s+/).slice(0, 3).join(' '));
    items.push({
      name: cleanMerchantName(name).name.slice(0, 80),
      amount: Math.abs(signed),
      date: leadingDate ?? undefined,
    });
  }
  if (items.length) return items;
  // Erste / multi-line PDF layout: date on its own line, then description.
  return parseNarrativeStatementText(text);
}

/** Parse CSV / TSV / semicolon bank exports into expense rows. */
export function parseStatementText(text: string): ParsedStatementRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const delim = detectDelimiter(lines);
  let headerIndex = -1;
  let roles: ColumnRole[] | null = null;

  for (let i = 0; i < Math.min(lines.length, 80); i++) {
    const cols = splitDelimitedLine(lines[i]!, delim);
    if (looksLikeHeaderRow(cols)) {
      headerIndex = i;
      roles = cols.map(classifyHeader);
      break;
    }
  }

  const items: ParsedStatementRow[] = [];
  const start = headerIndex >= 0 ? headerIndex + 1 : 0;

  for (let i = start; i < lines.length; i++) {
    const line = lines[i]!;
    if (/saldo\s*ko[nń]cowe/i.test(line) || /niniejszy dokument/i.test(line)) break;
    if (line.startsWith('#') && !/^\d{4}-\d{2}-\d{2}/.test(line)) continue;

    const cols = splitDelimitedLine(line, delim);
    if (cols.length < 3) continue;
    const item = rowToItem(cols, roles);
    if (item) items.push(item);
  }

  if (items.length) return items;
  return parseLooseText(text);
}
