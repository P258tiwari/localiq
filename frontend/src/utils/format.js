/* Shared formatting utilities */

/** ₹1,00,000 — Indian number formatting */
export function fmtINR(n) {
  const v = Number(n) || 0;
  return '₹' + v.toLocaleString('en-IN');
}

/** ₹1.5L / ₹2.3K — abbreviated for stat cards */
export function fmtINRShort(n) {
  const v = Number(n) || 0;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
  if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toLocaleString('en-IN')}`;
}

/** 14 May 2026 — DD MMM YYYY */
export function fmtDate(d) {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
