// OWNER: Jacquelyn Kulmus
// Activities controller. One exported function per route.
// Wrap each function in try/catch and return 400, 404, or 500 as needed.
// const { ObjectId } = require('mongodb');
// const { getDb } = require('../db/connect');

// TODO (Jacquelyn): add controller functions
const { ObjectId } = require('mongodb');
const { getDb } = require('../db/connect');

const sameId = (a, b) => a != null && b != null && String(a) === String(b);
const validId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value));
const optionalFields = ['description', 'date', 'estimatedCost'];

function activityFields(body) {
  const fields = { title: body.title };
  for (const field of optionalFields) {
    if (body[field] !== undefined) fields[field] = body[field];
  }
  return fields;
}

function calendarDay(value) {
  const date = new Date(value);
  if (value == null || Number.isNaN(date.getTime())) {
    throw new Error('Trip has missing or invalid dates');
  }
  return date.toISOString().slice(0, 10);
}

// Voting requires membership and open planning, but not ownership of the proposal
function withTrip(action, { writing = false, proposerOnly = writing } = {}) {
  return async (req, res) => {
    try {
      // Authentication middleware is currently a pass-through
      // Keep these routes protected until Passport is connected
      if (typeof req.isAuthenticated !== 'function' ||
          !req.isAuthenticated() || !validId(req.user?._id)) {
        return res.status(401).json({ message: 'Sign in is required' });
      }

      if (!validId(req.params.tripId) ||
          (req.params.activityId !== undefined && !validId(req.params.activityId))) {
        return res.status(400).json({ message: 'Invalid trip or activity ID' });
      }

      const db = getDb();
      const tripId = new ObjectId(req.params.tripId);
      const userId = new ObjectId(String(req.user._id));
      const trip = await db.collection('trips').findOne({ _id: tripId });
      if (!trip) return res.status(404).json({ message: 'Trip not found' });

      const organizer = sameId(trip.organizerId, userId);
      const member = Array.isArray(trip.memberIds) &&
        trip.memberIds.some((id) => sameId(id, userId));
      if (!organizer && !member) {
        return res.status(403).json({ message: 'You are not a member of this trip' });
      }
      if (writing && trip.status !== 'planning') {
        return res.status(400).json({ message: 'This trip is not open for planning' });
      }

      const activities = db.collection('activities');
      let filter;
      let activity;
      if (req.params.activityId !== undefined) {
        filter = { _id: new ObjectId(req.params.activityId), tripId };
        activity = await activities.findOne(filter);
        if (!activity) {
          return res.status(404).json({ message: 'Activity not found in this trip' });
        }
        if (proposerOnly && !organizer && !sameId(activity.proposedBy, userId)) {
          return res.status(403).json({
            message: 'Only the proposer or trip organizer can change this activity'
          });
        }
      }

      if (writing && req.body?.date !== undefined) {
        const start = calendarDay(trip.startDate);
        const end = calendarDay(trip.endDate);
        if (start > end) throw new Error('Trip dates are reversed');
        if (req.body.date < start || req.body.date > end) {
          return res.status(400).json({ message: 'Activity date must fall within the trip dates' });
        }
      }

      return await action(req, res, { activities, tripId, userId, filter, activity });
    } catch (err) {
      console.error('Activities request failed:', err.message);
      return res.status(500).json({ message: 'An unexpected server error occurred' });
    }
  };
}

const getAll = withTrip(async (req, res, { activities, tripId }) => {
  const results = await activities.aggregate([
    { $match: { tripId } },
    { $addFields: { voteCount: { $size: { $ifNull: ['$votes', []] } } } },
    { $sort: { voteCount: -1, _id: 1 } },
    { $project: { voteCount: 0 } }
  ]).toArray();
  return res.status(200).json(results);
});

const getOne = withTrip(async (req, res, { activity }) => {
  return res.status(200).json(activity);
});

const create = withTrip(async (req, res, { activities, tripId, userId }) => {
  const activity = {
    ...activityFields(req.body),
    tripId,
    proposedBy: userId,
    votes: [],
    status: 'proposed'
  };
  const result = await activities.insertOne(activity);
  return res.status(201).json({ ...activity, _id: result.insertedId });
}, { writing: true });

const update = withTrip(async (req, res, { activities, filter }) => {
  // PUT replaces editable fields. Omitted optional fields are removed
  // Identity, votes and status are preserved
  const changes = { $set: activityFields(req.body) };
  const unset = {};
  for (const field of optionalFields) {
    if (req.body[field] === undefined) unset[field] = '';
  }
  if (Object.keys(unset).length) changes.$unset = unset;
  const result = await activities.updateOne(filter, changes);
  if (!result.matchedCount) {
    return res.status(404).json({ message: 'Activity not found' });
  }
  return res.status(200).json({ message: 'Activity updated' });
}, { writing: true });

const remove = withTrip(async (req, res, { activities, filter }) => {
  const result = await activities.deleteOne(filter);
  if (!result.deletedCount) {
    return res.status(404).json({ message: 'Activity not found' });
  }
  return res.status(204).send();
}, { writing: true });

const vote = withTrip(async (req, res, { activities, filter, userId }) => {
  const currentVotes = { $ifNull: ['$votes', []] };
  const activity = await activities.findOneAndUpdate(filter, [
    {
      $set: {
        votes: {
          $cond: [
            { $in: [userId, currentVotes] },
            { $setDifference: [currentVotes, [userId]] },
            { $setUnion: [currentVotes, [userId]] }
          ]
        }
      }
    }
  ], { returnDocument: 'after', includeResultMetadata: false });

  if (!activity) {
    return res.status(404).json({ message: 'Activity not found in this trip' });
  }
  const voted = activity.votes.some((id) => sameId(id, userId));
  return res.status(200).json({
    message: voted ? 'Vote added' : 'Vote removed',
    activityId: activity._id,
    voted,
    voteCount: activity.votes.length
  });
}, { writing: true, proposerOnly: false });

module.exports = { getAll, getOne, create, update, remove, vote };
