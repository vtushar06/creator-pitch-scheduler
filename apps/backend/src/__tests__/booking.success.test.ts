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

describe('Booking Success Test', () => {
  it('should complete full booking flow: register → admin creates slot → customer books slot', async () => {
    // Step 1: Create admin directly in database with hashed password
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    const adminResult = await client.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      ['Admin User', `admin-${Date.now()}@test.com`, hashedPassword, 'ADMIN']
    );

    const admin = adminResult.rows[0];
    const adminToken = jwt.sign(
      { userId: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Step 2: Admin creates a slot
    const futureTime = new Date();
    futureTime.setDate(futureTime.getDate() + 5);
    const startTime = new Date(futureTime.setHours(10, 0, 0));
    const endTime = new Date(futureTime.setHours(11, 0, 0));

    const slotRes = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        mentorId: 100,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      });

    expect(slotRes.status).toBe(201);
    expect(slotRes.body.data.status).toBe('AVAILABLE');
    const slotId = slotRes.body.data.id;

    // Step 3: Register customer
    const customerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Customer User',
        email: `customer-${Date.now()}@test.com`,
        password: 'Customer123!'
      });

    expect(customerRes.status).toBe(201);
    const customerId = customerRes.body.data.user.id;
    const customerToken = customerRes.body.data.token;

    // Step 4: Customer books the slot (THIS IS THE MAIN TEST)
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        slot_id: slotId,
        user_id: customerId
      });

    console.log('Booking response:', bookingRes.status); // debug
    expect(bookingRes.status).toBe(201); // MUST return 201 Created
    expect(bookingRes.body.data.booking.status).toBe('BOOKED');
    expect(bookingRes.body.data.booking.user_id).toBe(customerId);
  });
});
