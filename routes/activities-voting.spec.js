const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

jest.mock('../db/connect', () => ({ getDb: jest.fn() }));
const { getDb } = require('../db/connect');
const routes = require('./activities');

const tripId = new ObjectId('67a123456789abcdef000001');
const activityId = new ObjectId('67a123456789abcdef000003');
const memberId = new ObjectId('67a123456789abcdef000002');
const organizerId = new ObjectId('67a123456789abcdef000004');
const proposerId = new ObjectId('67a123456789abcdef000005');
const endpoint = `/trips/${tripId}/activities/${activityId}/vote`;
let app, trip, activity, trips, activities, user;

beforeEach(() => {
  user = { _id: memberId };
  trip = { _id: tripId, organizerId, memberIds: [memberId, proposerId], status: 'planning' };
  activity = { _id: activityId, tripId, proposedBy: proposerId, title: 'Museum', votes: [], status: 'proposed' };
  trips = { findOne: jest.fn(async () => trip) };
  activities = {
    findOne: jest.fn(async () => activity),
    findOneAndUpdate: jest.fn(async () => ({ ...activity, votes: [memberId] })),
    updateOne: jest.fn(async () => ({ matchedCount: 1 })),
    deleteOne: jest.fn(async () => ({ deletedCount: 1 }))
  };
  getDb.mockReturnValue({ collection: (name) => name === 'trips' ? trips : activities });
  app = express();
  app.use(express.json());
  // Test-only session injection. Production routes keep their real auth checks
  app.use((req, res, next) => {
    req.user = user;
    req.isAuthenticated = () => Boolean(user);
    next();
  });
  app.use(routes);
});

afterEach(() => jest.restoreAllMocks());

test('a member can vote on another member\'s activity with no body', async () => {
  const res = await request(app).put(endpoint);
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ message: 'Vote added', activityId: String(activityId), voted: true, voteCount: 1 });
  expect(activities.findOneAndUpdate).toHaveBeenCalledTimes(1);
  const [filter, update, options] = activities.findOneAndUpdate.mock.calls[0];
  expect(filter).toEqual({ _id: activityId, tripId });
  // Guard against a read/replace implementation that loses concurrent votes
  expect(Array.isArray(update)).toBe(true);
  expect(update[0].$set.votes.$cond[0].$in[0]).toEqual(memberId);
  expect(options).toEqual({ returnDocument: 'after', includeResultMetadata: false });
});

test('reports removal and the remaining count from the updated activity', async () => {
  activity.votes = [memberId, proposerId];
  activities.findOneAndUpdate.mockResolvedValue({ ...activity, votes: [proposerId] });
  const res = await request(app).put(endpoint);
  expect(res.body).toEqual({ message: 'Vote removed', activityId: String(activityId), voted: false, voteCount: 1 });
});

test('organizer can vote even when absent from memberIds', async () => {
  user = { _id: organizerId };
  activities.findOneAndUpdate.mockResolvedValue({ ...activity, votes: [organizerId] });
  expect((await request(app).put(endpoint)).status).toBe(200);
});

test('accepts an empty JSON object', async () => {
  expect((await request(app).put(endpoint).send({})).status).toBe(200);
});

test.each([{ userId: String(proposerId) }, { votes: [String(proposerId)] }, { title: 'Changed' }, []])(
  'rejects a voting payload %j before accessing MongoDB', async (payload) => {
    const res = await request(app).put(endpoint).send(payload);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed.');
    expect(trips.findOne).not.toHaveBeenCalled();
    expect(activities.findOneAndUpdate).not.toHaveBeenCalled();
  }
);

test.each([null, { _id: 'google-profile-id' }])('rejects invalid or missing session %j', async (session) => {
  user = session;
  expect((await request(app).put(endpoint)).status).toBe(401);
  expect(trips.findOne).not.toHaveBeenCalled();
});

test.each([
  `/trips/bad/activities/${activityId}/vote`,
  `/trips/${tripId}/activities/bad/vote`
])('rejects invalid path %s', async (url) => {
  expect((await request(app).put(url)).status).toBe(400);
  expect(trips.findOne).not.toHaveBeenCalled();
});

test('rejects a nonmember', async () => {
  user = { _id: new ObjectId() };
  expect((await request(app).put(endpoint)).status).toBe(403);
  expect(activities.findOneAndUpdate).not.toHaveBeenCalled();
});

test.each(['locked', 'completed'])('rejects voting when trip is %s', async (status) => {
  trip.status = status;
  expect((await request(app).put(endpoint)).status).toBe(400);
  expect(activities.findOneAndUpdate).not.toHaveBeenCalled();
});

test('returns 404 for a missing trip', async () => {
  trip = null;
  expect((await request(app).put(endpoint)).status).toBe(404);
  expect(activities.findOneAndUpdate).not.toHaveBeenCalled();
});

test('returns 404 when the activity is not in the requested trip', async () => {
  activities.findOne.mockResolvedValue(null);
  expect((await request(app).put(endpoint)).status).toBe(404);
  expect(activities.findOne).toHaveBeenCalledWith({ _id: activityId, tripId });
  expect(activities.findOneAndUpdate).not.toHaveBeenCalled();
});

test('returns 404 if the activity disappears during the request', async () => {
  activities.findOneAndUpdate.mockResolvedValue(null);
  expect((await request(app).put(endpoint)).status).toBe(404);
});

test('returns a generic 500 on a database failure', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  activities.findOneAndUpdate.mockRejectedValue(new Error('Private database details'));
  const res = await request(app).put(endpoint);
  expect(res.status).toBe(500);
  expect(res.body).toEqual({ message: 'An unexpected server error occurred' });
});

test.each(['put', 'delete'])('voting permissions do not let members %s others\' proposals', async (method) => {
  let call = request(app)[method](`/trips/${tripId}/activities/${activityId}`);
  if (method === 'put') call = call.send({ title: 'Changed' });
  expect((await call).status).toBe(403);
  expect(activities.updateOne).not.toHaveBeenCalled();
  expect(activities.deleteOne).not.toHaveBeenCalled();
});

test.each(['put', 'delete'])('organizer still can %s an activity', async (method) => {
  user = { _id: organizerId };
  let call = request(app)[method](`/trips/${tripId}/activities/${activityId}`);
  if (method === 'put') call = call.send({ title: 'Changed' });
  expect((await call).status).toBe(method === 'put' ? 200 : 204);
});

test('generated voting documentation has only path inputs and the result schema', () => {
  const doc = require('../swagger-generated.json');
  const operation = doc.paths['/trips/{tripId}/activities/{activityId}/vote'].put;
  expect(operation.parameters.map(({ name, in: location }) => [name, location])).toEqual([
    ['tripId', 'path'], ['activityId', 'path']
  ]);
  expect(operation.responses['200'].schema.$ref).toBe('#/definitions/VoteResult');
  for (const code of ['400', '401', '403', '404', '500']) {
    expect(operation.responses[code]).toBeDefined();
  }
});