// Example test that shows the pattern: import the app, call it with Supertest.
// The app does not connect to MongoDB when imported, so this runs offline.
const request = require('supertest');
const app = require('./server');

describe('server', () => {
  test('GET / returns the welcome message', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Group Trip Planner API');
  });

  test('GET /api-docs/ serves the Swagger page', async () => {
    const res = await request(app).get('/api-docs/');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  test('unknown route returns 404 JSON', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/Route not found/);
  });
});
