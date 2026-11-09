/**
 * Rows to CSV for a spreadsheet. Any cell a spreadsheet would read as a
 * formula (starting = + - @, or a tab or carriage return, even after
 * leading spaces) is prefixed with ' so it opens as text; any cell with a
 * comma, quote or line break is quoted.
 */
export function toCsv(rows: string[][]): string {
  const neutral = (v: string) => (/^[\s]*[=+\-@\t\r]/.test(v) || /^[\t\r]/.test(v) ? `'${v}` : v);
  const quoted = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return rows.map((r) => r.map((c) => quoted(neutral(c))).join(",")).join("\n");
}
