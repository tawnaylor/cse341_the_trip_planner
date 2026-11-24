const { equalShares, percentShares, customShares, getShares } = require('../utils/splitMath');

const sum = shares => shares.reduce((s, x) => s + x.amountCents, 0);

describe('equalShares', () => {
  it('gives leftover cents to the first members', () => {
    const shares = equalShares(1000, ['a', 'b', 'c']);
    expect(shares.map(s => s.amountCents)).toEqual([334, 333, 333]);
    expect(sum(shares)).toBe(1000);
  });
});

describe('percentShares', () => {
  it('always adds up to the total', () => {
    const shares = percentShares(1001, [
      { userId: 'a', percent: 33.33 },
      { userId: 'b', percent: 33.33 },
      { userId: 'c', percent: 33.34 },
    ]);
    expect(sum(shares)).toBe(1001);
  });

  it('rejects percentages that do not add up to 100', () => {
    expect(() => percentShares(1000, [{ userId: 'a', percent: 50 }])).toThrow(/100/);
  });
});

describe('customShares', () => {
  it('accepts amounts that match the total', () => {
    expect(customShares(500, [{ userId: 'a', amountCents: 200 }, { userId: 'b', amountCents: 300 }]))
      .toEqual([{ userId: 'a', amountCents: 200 }, { userId: 'b', amountCents: 300 }]);
  });

  it('rejects amounts that do not match the total', () => {
    expect(() => customShares(500, [{ userId: 'a', amountCents: 200 }])).toThrow(/total/);
  });
});

describe('getShares', () => {
  it('rejects an unknown splitType', () => {
    expect(() => getShares({ splitType: 'bogus', amountCents: 100 }, ['a'])).toThrow(/splitType/);
  });
});
