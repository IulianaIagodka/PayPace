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

/** Parse common bank date formats into YYYY-MM-DD. */
export function parseStatementDate(raw: string, now = new Date()): string | null {
  const text = raw.trim();
  if (!text) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/.exec(text);
  if (dmy) {
    let y = Number(dmy[3]);
    if (y < 100) y += 2000;
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return format(new Date(y, m - 1, d), 'yyyy-MM-dd');
    }
  }

  const parsed = Date.parse(text);
  if (Number.isFinite(parsed)) {
    const d = new Date(parsed);
    if (d.getFullYear() > 2000 && d.getFullYear() < now.getFullYear() + 2) {
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
  if (h.includes('data oper') || h.includes('operation date') || h.includes('trans date')) {
    return 'opDate';
  }
  if (
    h.includes('data ksieg') ||
    h.includes('data ksi') || // mojibake: księgowania → ksi gowania / ksiêgowania
    h.includes('booking') ||
    h.includes('posting') ||
    h === 'data' ||
    (h.includes('date') && !h.includes('oper'))
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

function parseLooseText(text: string): ParsedStatementRow[] {
  const items: ParsedStatementRow[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const withDate = line.match(
      /^(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2})\s+(.+?)\s+(-?\d+[.,]\d{2})\s*$/,
    );
    if (withDate) {
      const signed = parseAmountTokenSigned(withDate[3]!);
      if (signed == null || signed > 0) continue;
      items.push({
        name: withDate[2]!.trim().slice(0, 80) || 'Transaction',
        amount: Math.abs(signed),
        date: parseStatementDate(withDate[1]!) ?? undefined,
      });
      continue;
    }
    const match = line.match(/(.+?)\s+(-?\d+[.,]\d{2})\s*$/);
    if (!match) continue;
    const signed = parseAmountTokenSigned(match[2]!);
    if (signed == null || signed > 0) continue;
    const name = match[1]!.replace(/[\d./-]+$/, '').trim() || 'Transaction';
    const leadingDate = parseStatementDate(match[1]!.trim().split(/\s+/)[0] ?? '');
    items.push({
      name: name.slice(0, 80),
      amount: Math.abs(signed),
      date: leadingDate ?? undefined,
    });
  }
  return items;
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
