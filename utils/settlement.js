const { getShares } = require('./splitMath');

function calculateBalances(expenses, memberIds) {
  const ids = memberIds.map(String);
  const balances = Object.fromEntries(ids.map(id => [id, 0]));
  for (const e of expenses) {
    balances[String(e.paidBy)] += e.amountCents;
    for (const s of getShares(e, ids)) balances[String(s.userId)] -= s.amountCents;
  }
  return balances; // positive = is owed money, negative = owes money
}

function settleUp(balances) {
  const creditors = [], debtors = [];
  for (const [userId, amt] of Object.entries(balances)) {
    if (amt > 0) creditors.push({ userId, amt });
    else if (amt < 0) debtors.push({ userId, amt: -amt });
  }
  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const payments = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    payments.push({ from: debtors[i].userId, to: creditors[j].userId, amountCents: pay });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt === 0) i++;
    if (creditors[j].amt === 0) j++;
  }
  return payments;
}

module.exports = { calculateBalances, settleUp };
