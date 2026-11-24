const { calculateBalances, settleUp } = require('../utils/settlement');

describe('calculateBalances', () => {
  it('credits the payer and debits each share', () => {
    const balances = calculateBalances(
      [{ paidBy: 'a', amountCents: 3000, splitType: 'equal' }],
      ['a', 'b', 'c']
    );
    expect(balances).toEqual({ a: 2000, b: -1000, c: -1000 });
  });

  it('handles mixed split types and nets to zero', () => {
    const balances = calculateBalances(
      [
        { paidBy: 'a', amountCents: 1000, splitType: 'equal' },
        {
          paidBy: 'b', amountCents: 1000, splitType: 'percentage',
          splits: [{ userId: 'a', percent: 70 }, { userId: 'b', percent: 30 }],
        },
        {
          paidBy: 'b', amountCents: 500, splitType: 'custom',
          splits: [{ userId: 'a', amountCents: 100 }, { userId: 'b', amountCents: 400 }],
        },
      ],
      ['a', 'b']
    );
    expect(balances).toEqual({ a: -300, b: 300 });
  });
});

describe('settleUp', () => {
  it('returns no payments when everyone is even', () => {
    expect(settleUp({ a: 0, b: 0 })).toEqual([]);
  });

  it('settles all balances with payments', () => {
    const balances = { a: 2000, b: -1000, c: -1000 };
    const payments = settleUp(balances);
    expect(payments).toEqual([
      { from: 'b', to: 'a', amountCents: 1000 },
      { from: 'c', to: 'a', amountCents: 1000 },
    ]);

    const after = { ...balances };
    for (const p of payments) {
      after[p.from] += p.amountCents;
      after[p.to] -= p.amountCents;
    }
    expect(Object.values(after).every(v => v === 0)).toBe(true);
  });
});
