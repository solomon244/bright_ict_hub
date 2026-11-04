/**
 * Minimal CSV writer.
 *  - Quotes cells containing commas, quotes or line breaks.
 *  - Neutralises spreadsheet formula injection: cells starting with = + - @ (or a tab/CR) are prefixed
 *    with an apostrophe so Excel/Sheets show them as text instead of running them.
 *  - Prepends a UTF-8 BOM so Excel displays Amharic correctly.
 */
const cell = (value) => {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'number' ? String(value) : String(value);
  if (typeof value !== 'number' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

function toCsv(headers, rows) {
  const lines = [headers.map(cell).join(',')];
  for (const row of rows) lines.push(headers.map((h) => cell(row[h])).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

module.exports = { toCsv, cell };
