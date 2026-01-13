import request from 'supertest';
import app from '../app';
import { Client } from 'pg';

let client: Client;

beforeAll(async () => {
  client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
});

afterAll(async () => {
  await client.end();
});

describe('Conflict Prevention Test - 409 Response', () => {
  it('should return 409 when two users try to book the same slot concurrently', async () => {
    // Setup: Create admin directly with correct role
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    const adminResult = await client.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      ['Admin', `admin-${Date.now()}@test.com`, hashedPassword, 'ADMIN']
    );

    const admin = adminResult.rows[0];
    const adminToken = jwt.sign(
      { userId: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const futureTime = new Date();
    futureTime.setDate(futureTime.getDate() + 7);
    const startTime = new Date(futureTime.setHours(14, 0, 0));
    const endTime = new Date(futureTime.setHours(15, 0, 0));

    const slotRes = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        mentorId: 999,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      });

    const slotId = slotRes.body.data.id;

    // Create two customers
    const customer1Res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Customer 1',
        email: `c1-${Date.now()}@test.com`,
        password: 'Pass123!'
      });

    const customer2Res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Customer 2',
        email: `c2-${Date.now() + 1}@test.com`,
        password: 'Pass123!'
      });

    // Fire concurrent booking requests
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customer1Res.body.data.token}`)
        .send({ slot_id: slotId, user_id: customer1Res.body.data.user.id }),
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customer2Res.body.data.token}`)
        .send({ slot_id: slotId, user_id: customer2Res.body.data.user.id })
    ]);

    console.log('Concurrent requests - Status:', res1.status, res2.status);

    // One succeeds (201), one fails (409) - this is the key test
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]); // PROVES concurrency control works

    // Verify 409 has proper error message
    const conflictRes = res1.status === 409 ? res1 : res2;
    expect(conflictRes.body.message).toMatch(/already booked|unavailable|conflict|just booked/i);
  });
});
