export const money = (cents) => '$' + (cents / 100).toFixed(2);
export const dateLabel = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
