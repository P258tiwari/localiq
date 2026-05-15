/**
 * Download data as a UTF-8 CSV file.
 *
 * @param {string} filename  - e.g. 'clients-2025-05.csv'
 * @param {Array<{key: string, label: string}>} columns
 * @param {Array<object>} rows
 */
export function downloadCSV(filename, columns, rows) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const header = columns.map(c => escape(c.label)).join(',');
  const body   = rows.map(row =>
    columns.map(c => escape(row[c.key])).join(',')
  ).join('\n');

  // BOM (﻿) ensures Excel opens UTF-8 correctly (₹ symbol etc.)
  const blob = new Blob(['﻿' + header + '\n' + body], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download plain text content as a .txt file.
 */
export function downloadTXT(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
