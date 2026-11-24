// All money is integer cents.
function equalShares(amountCents, memberIds) {
  const n = memberIds.length;
  const base = Math.floor(amountCents / n);
  const rem = amountCents % n;
  return memberIds.map((userId, i) => ({ userId, amountCents: base + (i < rem ? 1 : 0) }));
}

function percentShares(amountCents, splits) {
  const total = splits.reduce((s, x) => s + x.percent, 0);
  if (Math.abs(total - 100) > 0.001) throw new Error('Percentages must add up to 100');
  const shares = splits.map(s => ({
    userId: s.userId,
    amountCents: Math.floor((amountCents * s.percent) / 100),
  }));
  // Hand out the cents lost to rounding, one at a time, starting with the first person.
  let diff = amountCents - shares.reduce((s, x) => s + x.amountCents, 0);
  for (let i = 0; diff > 0; i = (i + 1) % shares.length, diff--) shares[i].amountCents += 1;
  return shares;
}

function customShares(amountCents, splits) {
  const total = splits.reduce((s, x) => s + x.amountCents, 0);
  if (total !== amountCents) throw new Error('Custom amounts must add up to the expense total');
  return splits.map(s => ({ userId: s.userId, amountCents: s.amountCents }));
}

function getShares(expense, memberIds) {
  switch (expense.splitType) {
    case 'equal': return equalShares(expense.amountCents, memberIds);
    case 'percentage': return percentShares(expense.amountCents, expense.splits);
    case 'custom': return customShares(expense.amountCents, expense.splits);
    default: throw new Error('Invalid splitType');
  }
}

module.exports = { equalShares, percentShares, customShares, getShares };
