export const money = (cents) => '$' + (cents / 100).toFixed(2);
export const dateLabel = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

// Parses "45.50", "$1,000", or ".5" into whole cents. Returns null for anything else.
export function toCents(text) {
  const s = String(text ?? '').replace(/[$,\s]/g, '');
  return /^(\d+\.?\d{0,2}|\.\d{1,2})$/.test(s) ? Math.round(parseFloat(s) * 100) : null;
}
