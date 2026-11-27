// Shared test data. Never connects to MongoDB.
const { ObjectId } = require('mongodb');

function createFixture() {
  const tripId = new ObjectId('67a123456789abcdef000001');
  const memberId = new ObjectId('67a123456789abcdef000002');
  const activityId = new ObjectId('67a123456789abcdef000003');
  const organizerId = new ObjectId('67a123456789abcdef000004');
  const otherMemberId = new ObjectId('67a123456789abcdef000005');
  const trip = {
    _id: tripId, organizerId, memberIds: [organizerId, memberId, otherMemberId],
    status: 'planning', startDate: new Date('2026-07-01T00:00:00Z'),
    endDate: new Date('2026-07-05T23:59:59Z')
  };
  const activity = {
    _id: activityId, tripId, proposedBy: memberId, title: 'Visit the museum',
    description: 'See the exhibits', date: '2026-07-02', estimatedCost: 15,
    votes: [otherMemberId], status: 'proposed'
  };
  const toArray = jest.fn().mockResolvedValue([activity]);
  const trips = { findOne: jest.fn().mockResolvedValue(trip) };
  const activities = {
    aggregate: jest.fn().mockReturnValue({ toArray }),
    findOne: jest.fn().mockResolvedValue(activity),
    insertOne: jest.fn().mockResolvedValue({ insertedId: activityId }),
    updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    findOneAndUpdate: jest.fn().mockResolvedValue({ ...activity, votes: [otherMemberId, memberId] })
  };
  const db = {
    collection: jest.fn((name) => {
      if (name === 'trips') return trips;
      if (name === 'activities') return activities;
      throw new Error(`Unexpected collection: ${name}`);
    })
  };
  return { tripId, memberId, activityId, organizerId, otherMemberId,
    trip, activity, trips, activities, toArray, db };
}

module.exports = { createFixture };