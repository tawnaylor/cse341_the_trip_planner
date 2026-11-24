// Expenses controller. One exported function per route.
const { ObjectId } = require('mongodb');
const { getDb } = require('../db/connect');
const { getShares } = require('../utils/splitMath');
const { calculateBalances, settleUp } = require('../utils/settlement');

const expenses = () => getDb().collection('expenses');
const trips = () => getDb().collection('trips');

const sameId = (a, b) => a != null && b != null && String(a) === String(b);
const isMember = (trip, userId) =>
  Array.isArray(trip.memberIds) && trip.memberIds.some((id) => sameId(id, userId));

// Authentication middleware is currently a pass-through, so require a session user here.
function currentUserId(req) {
  const id = req.user?._id;
  return id != null && /^[a-fA-F0-9]{24}$/.test(String(id)) ? new ObjectId(String(id)) : null;
}

// Runs before validation so a signed-out request gets 401 rather than 400.
exports.requireSession = (req, res, next) => {
  if (!currentUserId(req)) return res.status(401).json({ message: 'Sign in is required' });
  next();
};

// Loads a trip and checks that the signed-in user belongs to it.
async function memberTrip(req, res, tripId) {
  const userId = currentUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Sign in is required' });
    return null;
  }
  const trip = await trips().findOne({ _id: new ObjectId(String(tripId)) });
  if (!trip) {
    res.status(404).json({ message: 'Trip not found' });
    return null;
  }
  if (!isMember(trip, userId)) {
    res.status(403).json({ message: 'Not a trip member' });
    return null;
  }
  return trip;
}

// Loads an expense and its trip, requiring trip membership.
async function memberExpense(req, res) {
  const expense = await expenses().findOne({ _id: new ObjectId(req.params.id) });
  if (!expense) {
    res.status(404).json({ message: 'Expense not found' });
    return {};
  }
  const trip = await memberTrip(req, res, expense.tripId);
  return trip ? { expense, trip } : {};
}

// Builds the stored document from the request body only, and checks members and split math.
// Returns { doc } or { message } for a 400.
function buildExpense(body, trip) {
  const paidBy = new ObjectId(body.paidBy);
  if (!isMember(trip, paidBy)) return { message: 'paidBy must be a trip member' };

  const splits = body.splitType === 'equal'
    ? []
    : (body.splits || []).map((s) => ({ ...s, userId: new ObjectId(s.userId) }));
  if (!splits.every((s) => isMember(trip, s.userId))) {
    return { message: 'Every split must be for a trip member' };
  }

  const doc = {
    tripId: trip._id,
    description: body.description,
    amountCents: body.amountCents,
    paidBy,
    splitType: body.splitType,
    splits,
    category: body.category,
    date: new Date(body.date),
  };
  try {
    getShares(doc, trip.memberIds);
  } catch (err) {
    return { message: err.message };
  }
  return { doc };
}

const fail = (res, err) => res.status(500).json({ message: err.message });

exports.listByTrip = async (req, res) => {
  try {
    const trip = await memberTrip(req, res, req.params.tripId);
    if (!trip) return;
    const items = await expenses().find({ tripId: trip._id }).sort({ date: -1 }).toArray();
    res.status(200).json(items);
  } catch (err) { fail(res, err); }
};

exports.getOne = async (req, res) => {
  try {
    const { expense } = await memberExpense(req, res);
    if (expense) res.status(200).json(expense);
  } catch (err) { fail(res, err); }
};

exports.create = async (req, res) => {
  try {
    const trip = await memberTrip(req, res, req.params.tripId);
    if (!trip) return;
    const { doc, message } = buildExpense(req.body, trip);
    if (message) return res.status(400).json({ message });
    const result = await expenses().insertOne(doc);
    res.status(201).json({ _id: result.insertedId, ...doc });
  } catch (err) { fail(res, err); }
};

exports.update = async (req, res) => {
  try {
    const { expense, trip } = await memberExpense(req, res);
    if (!expense) return;
    const { doc, message } = buildExpense(req.body, trip);
    if (message) return res.status(400).json({ message });
    await expenses().replaceOne({ _id: expense._id }, doc);
    res.status(200).json({ _id: expense._id, ...doc });
  } catch (err) { fail(res, err); }
};

exports.remove = async (req, res) => {
  try {
    const { expense } = await memberExpense(req, res);
    if (!expense) return;
    await expenses().deleteOne({ _id: expense._id });
    res.status(200).json({ message: 'Expense deleted' });
  } catch (err) { fail(res, err); }
};

exports.settlement = async (req, res) => {
  try {
    const trip = await memberTrip(req, res, req.params.tripId);
    if (!trip) return;
    const items = await expenses().find({ tripId: trip._id }).toArray();
    const balances = calculateBalances(items, trip.memberIds);
    res.status(200).json({ balances, payments: settleUp(balances) });
  } catch (err) { fail(res, err); }
};
