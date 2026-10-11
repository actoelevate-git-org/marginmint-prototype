/**
 * CSV serialisation for exports.
 *
 * Cells that a spreadsheet would interpret as a formula (leading =, +, -, @, tab
 * or carriage return) are prefixed with a single quote to prevent CSV/formula
 * injection. Plain decimal numbers such as "-1250.50" are left untouched so they
 * stay numeric in spreadsheets.
 */
export type CsvValue = string | number | null | undefined;

const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

export function escapeCsvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (FORMULA_PREFIX.test(text) && !PLAIN_NUMBER.test(text)) {
    text = `'${text}`;
  }
  if (/[",\n\r]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(","));
  return `${lines.join("\r\n")}\r\n`;
}
