// Direct controller tests for database scope, stored fields, 
// permissions, race outcomes, and errors.
jest.mock('../db/connect', () => ({ getDb: jest.fn() }));
const {getDb } = require('../db/connect');
const controller = require('./activities');
const { createFixture } = require('../tests/helpers/activitiesFixture');

let f;
beforeEach(() => {
  jest.clearAllMocks();
  f = createFixture();
  getDb.mockReturnValue(f.db);
});
afterEach(() => jest.restoreAllMocks());

async function invoke(name, { body = { title: 'Updated museum' }, userId = f.memberId,
  authenticated = true, params = {} } = {}) {
  const req = {
    params: {
      tripId: String(f.tripId),
      ...(!['getAll', 'create'].includes(name) ? { activityId: String(f.activityId) } : {}),
      ...params
    },
    body, user: { _id: userId }, isAuthenticated: () => authenticated
  };
  const res = { status: jest.fn(), json: jest.fn(), send: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.send.mockReturnValue(res);
  await controller[name](req, res);
  return res;
}

test('getAll scopes its query to the trip and requests descending vote order with a stable tie order', async () => {
  await invoke('getAll');
  const pipeline = f.activities.aggregate.mock.calls[0][0];
  expect(pipeline[0]).toEqual({ $match: { tripId: f.tripId } });
  expect(pipeline).toContainEqual({ $sort: { voteCount: -1, _id: 1 } });
  expect(pipeline).toContainEqual({ $project: { voteCount: 0 } });
  // MongoDB executes this pipeline; this unit test does not prove the real sorting engine.
});
test('getAll returns an empty array when no activities exist', async () => {
  f.toArray.mockResolvedValue([]);
  const res = await invoke('getAll');
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith([]);
});
test('getOne scopes activity lookup to both activity and trip', async () => {
  const res = await invoke('getOne');
  expect(f.activities.findOne).toHaveBeenCalledWith({ _id: f.activityId, tripId: f.tripId });
  expect(res.json).toHaveBeenCalledWith(f.activity);
});
test('create stores server-owned identity, votes, and status even if called with extra fields', async () => {
  const res = await invoke('create', { body: {
    title: 'Museum', description: 'Exhibits', date: '2026-07-03', estimatedCost: 0,
    tripId: 'untrusted', proposedBy: 'untrusted', votes: ['untrusted'], status: 'selected'
  } });
  expect(f.activities.insertOne).toHaveBeenCalledWith({
    title: 'Museum', description: 'Exhibits', date: '2026-07-03', estimatedCost: 0,
    tripId: f.tripId, proposedBy: f.memberId, votes: [], status: 'proposed'
  });
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _id: f.activityId }));
});
test('create omits optional fields that were not provided', async () => {
  await invoke('create');
  const stored = f.activities.insertOne.mock.calls[0][0];
  for (const key of ['description', 'date', 'estimatedCost']) expect(stored).not.toHaveProperty(key);
});
test('update removes omitted optional fields while preserving votes, status, and ownership', async () => {
  await invoke('update');
  expect(f.activities.updateOne).toHaveBeenCalledWith(
    { _id: f.activityId, tripId: f.tripId },
    { $set: { title: 'Updated museum' }, $unset: { description: '', date: '', estimatedCost: '' } }
  );
});
test('update stores all supplied editable fields without unsetting them', async () => {
  const body = { title: 'Museum', description: 'New exhibits', date: '2026-07-04', estimatedCost: 20 };
  await invoke('update', { body });
  expect(f.activities.updateOne).toHaveBeenCalledWith(
    { _id: f.activityId, tripId: f.tripId }, { $set: body }
  );
});
test('update returns 404 if the activity disappears after the permission check', async () => {
  f.activities.updateOne.mockResolvedValue({ matchedCount: 0 });
  const res = await invoke('update');
  expect(res.status).toHaveBeenCalledWith(404);
});
test('remove scopes the delete to this trip and returns no content', async () => {
  const res = await invoke('remove');
  expect(f.activities.deleteOne).toHaveBeenCalledWith({ _id: f.activityId, tripId: f.tripId });
  expect(res.status).toHaveBeenCalledWith(204);
  expect(res.send).toHaveBeenCalledWith();
});
test('remove returns 404 if the activity disappears after the permission check', async () => {
  f.activities.deleteOne.mockResolvedValue({ deletedCount: 0 });
  const res = await invoke('remove');
  expect(res.status).toHaveBeenCalledWith(404);
});
test.each(['update', 'remove'])('%s denies another member who did not propose the activity', async (name) => {
  const res = await invoke(name, { userId: f.otherMemberId });
  expect(res.status).toHaveBeenCalledWith(403);
  expect(f.activities.updateOne).not.toHaveBeenCalled();
  expect(f.activities.deleteOne).not.toHaveBeenCalled();
});
test.each(['update', 'remove'])('%s allows the organizer even when absent from memberIds', async (name) => {
  f.trip.memberIds = [f.memberId];
  const res = await invoke(name, { userId: f.organizerId });
  expect(res.status).toHaveBeenCalledWith(name === 'remove' ? 204 : 200);
});
test('vote reports the post-update result, rather than the earlier activity snapshot', async () => {
  f.activity.votes = [f.memberId, f.otherMemberId];
  f.activities.findOneAndUpdate.mockResolvedValue({ ...f.activity, votes: [f.otherMemberId] });
  const res = await invoke('vote', { body: {} });
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({
    message: 'Vote removed', activityId: f.activityId, voted: false, voteCount: 1
  });
});
test('vote returns 404 when the update finds no activity', async () => {
  f.activities.findOneAndUpdate.mockResolvedValue(null);
  expect((await invoke('vote', { body: {} })).status).toHaveBeenCalledWith(404);
});

test.each(['getAll', 'getOne', 'create', 'update', 'remove', 'vote'])(
  '%s rejects a direct unauthenticated controller call without database access', async (name) => {
    const res = await invoke(name, { authenticated: false });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(getDb).not.toHaveBeenCalled();
  }
);
test('a direct controller call rejects invalid path IDs', async () => {
  const res = await invoke('getOne', { params: { activityId: 'bad' } });
  expect(res.status).toHaveBeenCalledWith(400);
  expect(getDb).not.toHaveBeenCalled();
});
test.each(['create', 'update'])('%s rejects an activity date outside the trip', async (name) => {
  const res = await invoke(name, { body: { title: 'Museum', date: '2026-08-01' } });
  expect(res.status).toHaveBeenCalledWith(400);
  expect(f.activities.insertOne).not.toHaveBeenCalled();
  expect(f.activities.updateOne).not.toHaveBeenCalled();
});
test.each([
  ['missing start date', null, new Date('2026-07-05')],
  ['invalid start date', 'not-a-date', new Date('2026-07-05')],
  ['reversed dates', new Date('2026-07-05'), new Date('2026-07-01')]
])('returns a generic 500 for corrupt trip dates: %s', async (_label, start, end) => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  f.trip.startDate = start;
  f.trip.endDate = end;
  const res = await invoke('create', { body: { title: 'Museum', date: '2026-07-02' } });
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ message: 'An unexpected server error occurred' });
  expect(f.activities.insertOne).not.toHaveBeenCalled();
});
test.each([
  ['getAll', 'toArray'], ['getOne', 'findOne'], ['create', 'insertOne'],
  ['update', 'updateOne'], ['remove', 'deleteOne'], ['vote', 'findOneAndUpdate']
])('%s hides database operation errors', async (name, operation) => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const mock = operation === 'toArray' ? f.toArray : f.activities[operation];
  mock.mockRejectedValue(new Error('Private database details'));
  const res = await invoke(name);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ message: 'An unexpected server error occurred' });
});
