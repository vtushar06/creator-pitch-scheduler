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

describe('Authorization Test - 403 Forbidden', () => {
  it('should prevent customer from creating slots (admin-only operation)', async () => {
    // Register customer
    const customerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Customer',
        email: `customer-${Date.now()}@test.com`,
        password: 'Pass123!'
      });

    const customerToken = customerRes.body.data.token;

    // Try to create slot as customer (should fail with 403)
    const futureTime = new Date();
    futureTime.setDate(futureTime.getDate() + 10);
    const startTime = new Date(futureTime.setHours(10, 0, 0));
    const endTime = new Date(futureTime.setHours(11, 0, 0));

    const slotRes = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        mentorId: 6666,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      });

    console.log('Customer slot creation attempt:', slotRes.status);
    expect(slotRes.status).toBe(403); // MUST be forbidden
  });

  it('should prevent customer from cancelling another customers booking', async () => {
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
    futureTime.setDate(futureTime.getDate() + 12);
    const startTime = new Date(futureTime.setHours(13, 0, 0));
    const endTime = new Date(futureTime.setHours(14, 0, 0));

    const slotRes = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        mentorId: 7777,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      });

    const slotId = slotRes.body.data.id;

    // Customer 1 books the slot
    const customer1Res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Customer 1',
        email: `c1-${Date.now()}@test.com`,
        password: 'Pass123!'
      });

    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customer1Res.body.data.token}`)
      .send({ slot_id: slotId, user_id: customer1Res.body.data.user.id });

    const bookingId = bookRes.body.data.booking.id;

    // Customer 2 tries to cancel Customer 1's booking (should fail)
    const customer2Res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Customer 2',
        email: `c2-${Date.now() + 1}@test.com`,
        password: 'Pass123!'
      });

    const cancelRes = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${customer2Res.body.data.token}`);

    console.log('Cross-customer cancel attempt:', cancelRes.status);
    expect([403, 404]).toContain(cancelRes.status); // Should be forbidden or not found
  });

  it('should return 401 for requests without authentication token', async () => {
    const res = await request(app).get('/api/bookings/me');

    expect(res.status).toBe(401);
  });
});
