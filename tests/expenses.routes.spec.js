const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

jest.mock('../db/connect', () => ({ getDb: jest.fn() }));
const { getDb } = require('../db/connect');
const routes = require('../routes/expenses');

const tripId = new ObjectId('67a123456789abcdef000001');
const alice = new ObjectId('67a123456789abcdef000002');
const bob = new ObjectId('67a123456789abcdef000003');
const stranger = new ObjectId('67a123456789abcdef000004');
const expenseId = new ObjectId('67a123456789abcdef000005');

const validBody = {
  description: 'Dinner',
  amountCents: 3001,
  paidBy: String(alice),
  splitType: 'equal',
  category: 'food',
  date: '2026-07-01',
};

let app, user, trip, expense, tripsCol, expensesCol;

beforeEach(() => {
  user = { _id: alice };
  trip = { _id: tripId, memberIds: [alice, bob] };
  expense = { _id: expenseId, tripId, amountCents: 3000, paidBy: alice, splitType: 'equal', splits: [] };
  tripsCol = { findOne: jest.fn(async () => trip) };
  expensesCol = {
    findOne: jest.fn(async () => expense),
    find: jest.fn(() => ({ sort: () => ({ toArray: async () => [expense] }), toArray: async () => [expense] })),
    insertOne: jest.fn(async () => ({ insertedId: expenseId })),
    replaceOne: jest.fn(async () => ({})),
    deleteOne: jest.fn(async () => ({ deletedCount: 1 })),
  };
  getDb.mockReturnValue({ collection: (name) => (name === 'trips' ? tripsCol : expensesCol) });
  app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.user = user; next(); });
  app.use(routes);
});

describe('validation', () => {
  it('rejects a malformed trip id', async () => {
    const res = await request(app).get('/trips/not-an-id/expenses');
    expect(res.status).toBe(400);
  });

  it('rejects an invalid body', async () => {
    const res = await request(app).post(`/trips/${tripId}/expenses`).send({ ...validBody, amountCents: -5 });
    expect(res.status).toBe(400);
    expect(expensesCol.insertOne).not.toHaveBeenCalled();
  });

  it('requires splits for a custom split', async () => {
    const res = await request(app).post(`/trips/${tripId}/expenses`).send({ ...validBody, splitType: 'custom' });
    expect(res.status).toBe(400);
  });
});

describe('access control', () => {
  it('returns 401 without a session user', async () => {
    user = undefined;
    const res = await request(app).get(`/trips/${tripId}/expenses`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-member', async () => {
    user = { _id: stranger };
    const res = await request(app).get(`/trips/${tripId}/expenses`);
    expect(res.status).toBe(403);
  });

  it('returns 403 when a non-member reads an expense by id', async () => {
    user = { _id: stranger };
    const res = await request(app).get(`/expenses/${expenseId}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown trip', async () => {
    tripsCol.findOne.mockResolvedValue(null);
    const res = await request(app).get(`/trips/${tripId}/expenses`);
    expect(res.status).toBe(404);
  });
});

describe('create', () => {
  it('stores a valid expense with ObjectId fields', async () => {
    const res = await request(app).post(`/trips/${tripId}/expenses`).send(validBody);
    expect(res.status).toBe(201);
    const doc = expensesCol.insertOne.mock.calls[0][0];
    expect(doc.tripId).toEqual(tripId);
    expect(doc.paidBy).toEqual(alice);
    expect(doc.date).toBeInstanceOf(Date);
  });

  it('rejects a payer who is not a member', async () => {
    const res = await request(app).post(`/trips/${tripId}/expenses`).send({ ...validBody, paidBy: String(stranger) });
    expect(res.status).toBe(400);
  });

  it('rejects custom amounts that do not match the total', async () => {
    const res = await request(app).post(`/trips/${tripId}/expenses`).send({
      ...validBody,
      splitType: 'custom',
      splits: [{ userId: String(alice), amountCents: 1000 }, { userId: String(bob), amountCents: 1000 }],
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/add up/);
  });
});

describe('update and delete', () => {
  it('cannot move an expense to another trip through the body', async () => {
    const res = await request(app)
      .put(`/expenses/${expenseId}`)
      .send({ ...validBody, tripId: String(new ObjectId()) });
    expect(res.status).toBe(200);
    expect(expensesCol.replaceOne.mock.calls[0][1].tripId).toEqual(tripId);
  });

  it('returns 404 when deleting a missing expense', async () => {
    expensesCol.findOne.mockResolvedValue(null);
    const res = await request(app).delete(`/expenses/${expenseId}`);
    expect(res.status).toBe(404);
  });

  it('deletes an expense for a member', async () => {
    const res = await request(app).delete(`/expenses/${expenseId}`);
    expect(res.status).toBe(200);
    expect(expensesCol.deleteOne).toHaveBeenCalledWith({ _id: expenseId });
  });
});

describe('settlement', () => {
  it('returns balances and payments', async () => {
    const res = await request(app).get(`/trips/${tripId}/settlement`);
    expect(res.status).toBe(200);
    expect(res.body.balances).toEqual({ [alice]: 1500, [bob]: -1500 });
    expect(res.body.payments).toEqual([{ from: String(bob), to: String(alice), amountCents: 1500 }]);
  });
});
