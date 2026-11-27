// Activities CRUD route tests and shared validation/auth checks
// MongoDB and sessions simulated here
const express = require('express');
const request = require('supertest');

jest.mock('../db/connect', () => ({ getDb: jest.fn() }));
const { getDb } = require('../db/connect');
const router = require('./activities');
const { createFixture } = require('../tests/helpers/activitiesFixture');

let f, app, user, signedIn, base, item;
beforeEach(() => {
  jest.clearAllMocks();
  f = createFixture();
  getDb.mockReturnValue(f.db);
  user = { _id: f.memberId };
  signedIn = true;
  base = `/trips/${f.tripId}/activities`;
  item = `${base}/${f.activityId}`;
  app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = user;
    req.isAuthenticated = () => signedIn;
    next();
  });
  app.use(router);
});
afterEach(() => jest.restoreAllMocks());

const endpoints = [
  ['get', 'list'], ['get', 'one'], ['post', 'list'],
  ['put', 'one'], ['delete', 'one'], ['put', 'vote']
];
function call(method, kind, customBase = base, customId = f.activityId) {
  const url = kind === 'list' ? customBase
    : `${customBase}/${customId}${kind === 'vote' ? '/vote' : ''}`;
  const pending = request(app)[method](url);
  return method === 'post' || (method === 'put' && kind !== 'vote')
    ? pending.send({ title: 'Visit the museum' }) : pending;
}

test('GET list returns the trip activities', async () => {
  const res = await request(app).get(base);
  expect(res.status).toBe(200);
  expect(res.body).toEqual([JSON.parse(JSON.stringify(f.activity))]);
});
test('GET one returns the requested activity', async () => {
  const res = await request(app).get(item);
  expect(res.status).toBe(200);
  expect(res.body._id).toBe(String(f.activityId));
  expect(res.body.tripId).toBe(String(f.tripId));
});
test('POST trims text, accepts optional fields, and supplies server-owned fields', async () => {
  const res = await request(app).post(base).send({
    title: '  Visit the museum  ', description: '  See exhibits  ',
    date: '2026-07-02', estimatedCost: 0
  });
  expect(res.status).toBe(201);
  expect(res.body).toEqual({
    _id: String(f.activityId), tripId: String(f.tripId), proposedBy: String(f.memberId),
    title: 'Visit the museum', description: 'See exhibits', date: '2026-07-02',
    estimatedCost: 0, votes: [], status: 'proposed'
  });
});
test('PUT allows the proposer to update an activity', async () => {
  const res = await request(app).put(item).send({ title: 'Visit the park' });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ message: 'Activity updated' });
});
test('DELETE allows the proposer to remove an activity and returns no body', async () => {
  const res = await request(app).delete(item);
  expect(res.status).toBe(204);
  expect(res.text).toBe('');
});

test.each(endpoints)('%s %s requires authentication before database access', async (method, kind) => {
  signedIn = false;
  user = null;
  expect((await call(method, kind)).status).toBe(401);
  expect(getDb).not.toHaveBeenCalled();
});
test.each(endpoints)('%s %s rejects an invalid trip ID before database access', async (method, kind) => {
  expect((await call(method, kind, '/trips/bad/activities')).status).toBe(400);
  expect(getDb).not.toHaveBeenCalled();
});
test.each(endpoints.filter(([, kind]) => kind !== 'list'))(
  '%s %s rejects an invalid activity ID before database access', async (method, kind) => {
    expect((await call(method, kind, base, 'bad')).status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  }
);
test.each(endpoints)('%s %s returns 404 for a missing trip', async (method, kind) => {
  f.trips.findOne.mockResolvedValue(null);
  expect((await call(method, kind)).status).toBe(404);
  expect(f.activities.insertOne).not.toHaveBeenCalled();
  expect(f.activities.updateOne).not.toHaveBeenCalled();
  expect(f.activities.deleteOne).not.toHaveBeenCalled();
  expect(f.activities.findOneAndUpdate).not.toHaveBeenCalled();
});
test.each(endpoints)('%s %s denies nonmembers', async (method, kind) => {
  user = { _id: '67a123456789abcdef000099' };
  expect((await call(method, kind)).status).toBe(403);
  expect(f.activities.findOne).not.toHaveBeenCalled();
  expect(f.activities.aggregate).not.toHaveBeenCalled();
  expect(f.activities.insertOne).not.toHaveBeenCalled();
});
test.each(endpoints.filter(([, kind]) => kind !== 'list'))(
  '%s %s returns 404 for an activity absent from this trip', async (method, kind) => {
    f.activities.findOne.mockResolvedValue(null);
    expect((await call(method, kind)).status).toBe(404);
    expect(f.activities.findOne).toHaveBeenCalledWith({ _id: f.activityId, tripId: f.tripId });
  }
);

// NEW: PITCH v6 length limits must apply to both POST and PUT.
describe.each(['post', 'put'])('%s body validation', (method) => {
  const send = (body) => request(app)[method](method === 'post' ? base : item).send(body);
  test.each([3, 100])('accepts a title of %i characters', async (length) => {
    expect((await send({ title: 'a'.repeat(length) })).status).toBe(method === 'post' ? 201 : 200);
  });
  test.each(['', '  ', 'ab', '  ab  ', 'a'.repeat(101), 123, null])(
    'rejects an invalid title %#', async (title) => {
      const res = await send({ title });
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'title' })]));
      expect(getDb).not.toHaveBeenCalled();
    }
  );
  test('rejects a missing title', async () => {
    expect((await send({})).status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  });
  test('accepts 500 description characters after trimming', async () => {
    expect((await send({ title: 'Museum', description: `  ${'a'.repeat(500)}  ` })).status)
      .toBe(method === 'post' ? 201 : 200);
  });
  test.each(['a'.repeat(501), 123, null])('rejects an invalid description %#', async (description) => {
    expect((await send({ title: 'Museum', description })).status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  });
  test.each([-1, '15', null])('rejects invalid estimated cost %j', async (estimatedCost) => {
    expect((await send({ title: 'Museum', estimatedCost })).status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  });
  test.each(['2026-02-30', '07/02/2026', '2026-07-02T12:00:00Z', 123])(
    'rejects invalid calendar date %j', async (date) => {
      expect((await send({ title: 'Museum', date })).status).toBe(400);
      expect(getDb).not.toHaveBeenCalled();
    }
  );
  test.each(['2026-06-30', '2026-07-06'])('rejects date outside the trip: %s', async (date) => {
    expect((await send({ title: 'Museum', date })).status).toBe(400);
    expect(f.activities.insertOne).not.toHaveBeenCalled();
    expect(f.activities.updateOne).not.toHaveBeenCalled();
  });
  test.each(['2026-07-01', '2026-07-05'])('accepts inclusive trip boundary: %s', async (date) => {
    expect((await send({ title: 'Museum', date })).status).toBe(method === 'post' ? 201 : 200);
  });
  test.each(['tripId', 'proposedBy', 'votes', 'status', '_id', 'unknown'])(
    'rejects client-supplied %s', async (field) => {
      expect((await send({ title: 'Museum', [field]: 'injected' })).status).toBe(400);
      expect(getDb).not.toHaveBeenCalled();
    }
  );
  test('rejects an array body', async () => {
    expect((await send([])).status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  });
});

describe.each(['locked', 'completed'])('when the trip is %s', (status) => {
  beforeEach(() => { f.trip.status = status; });
  test.each([['post', 'list'], ['put', 'one'], ['delete', 'one'], ['put', 'vote']])(
    'blocks %s %s', async (method, kind) => {
      expect((await call(method, kind)).status).toBe(400);
      expect(f.activities.insertOne).not.toHaveBeenCalled();
      expect(f.activities.updateOne).not.toHaveBeenCalled();
      expect(f.activities.deleteOne).not.toHaveBeenCalled();
      expect(f.activities.findOneAndUpdate).not.toHaveBeenCalled();
    }
  );
  test.each(['list', 'one'])('still allows reading %s', async (kind) => {
    expect((await call('get', kind)).status).toBe(200);
  });
});

test.each(endpoints)('%s %s returns a generic 500 for a database failure', async (method, kind) => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  f.trips.findOne.mockRejectedValue(new Error('Private database details'));
  const res = await call(method, kind);
  expect(res.status).toBe(500);
  expect(res.body).toEqual({ message: 'An unexpected server error occurred' });
});

test('generated Swagger documents the title and description limits', () => {
  const doc = require('../swagger-generated.json');
  for (const name of ['ActivityInput', 'Activity']) {
    expect(doc.definitions[name].properties.title).toMatchObject({ minLength: 3, maxLength: 100 });
    expect(doc.definitions[name].properties.description.maxLength).toBe(500);
    const titlePattern = new RegExp(doc.definitions[name].properties.title.pattern);
    expect(titlePattern.test('Visit the museum')).toBe(true);
    expect(titlePattern.test('   ')).toBe(false);
  }
});
