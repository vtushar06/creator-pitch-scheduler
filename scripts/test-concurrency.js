const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testConcurrency() {
  console.log('Starting Concurrency Test for Creator Pitch Scheduler\n');

  try {
    // Step 1: Fetch an available slot
    console.log('Step 1: Fetching available slots...');
    const slotsResponse = await axios.get(`${BASE_URL}/api/slots?date=2026-01-09`);
    const availableSlots = slotsResponse.data.data.filter(
      (slot) => slot.status === 'AVAILABLE'
    );

    if (availableSlots.length === 0) {
      console.log('No available slots found. Please create slots first.');
      console.log('Run this SQL command:');
      console.log(`   INSERT INTO slots (start_time, end_time, status, created_by) 
   VALUES ('2026-01-09 10:00:00', '2026-01-09 11:00:00', 'AVAILABLE', 1);`);
      return;
    }

    const targetSlot = availableSlots[0];
    console.log(`Found available slot: ID ${targetSlot.id}`);
    console.log(`   Time: ${targetSlot.start_time} - ${targetSlot.end_time}\n`);

    // Step 2: Fire 20 concurrent booking requests
    console.log('Step 2: Firing 20 concurrent booking requests...\n');

    const requests = [];
    for (let userId = 100; userId < 120; userId++) {
      const idempotencyKey = `test-${userId}-${targetSlot.id}-${Date.now()}`;
      
      const request = axios
        .post(`${BASE_URL}/api/bookings`, {
          slotId: targetSlot.id,
          userId,
          idempotencyKey,
        })
        .then((response) => ({
          userId,
          status: response.status,
          success: true,
          message: response.data.message || 'Booking created',
        }))
        .catch((error) => ({
          userId,
          status: error.response?.status || 500,
          success: false,
          message: error.response?.data?.message || error.message,
        }));

      requests.push(request);
    }

    const results = await Promise.all(requests);

    // Step 3: Analyze results
    console.log('Results:\n');
    const successful = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409);
    const others = results.filter((r) => r.status !== 201 && r.status !== 409);

    console.log(`Successful bookings (201): ${successful.length}`);
    successful.forEach((r) => {
      console.log(`   → User ${r.userId}: ${r.message}`);
    });

    console.log(`\n Conflicts (409): ${conflicts.length}`);
    if (conflicts.length > 0 && conflicts.length <= 5) {
      conflicts.forEach((r) => {
        console.log(`   → User ${r.userId}: ${r.message}`);
      });
    } else if (conflicts.length > 5) {
      console.log(`  (Showing first 5 of ${conflicts.length})`);
      conflicts.slice(0, 5).forEach((r) => {
        console.log(`  → User ${r.userId}: ${r.message}`);
      });
    }

    if (others.length > 0) {
      console.log(`\n Other errors: ${others.length}`);
      others.forEach((r) => {
        console.log(`   → User ${r.userId} (${r.status}): ${r.message}`);
      });
    }

    console.log

    // Step 4: Final verdict
    console.log('\n Test Verdict:\n');

    if (successful.length === 1 && conflicts.length === 19 && others.length === 0) {
      console.log(' PASS: Exactly 1 booking succeeded, 19 were rejected (409)');
      console.log(' Pessimistic Locking (SELECT FOR UPDATE) is working correctly!');
      console.log(' No double bookings occurred.');
    } else {
      console.log(' FAIL: Expected 1 success and 19 conflicts');
      console.log(`   Got: ${successful.length} success, ${conflicts.length} conflicts, ${others.length} other errors`);
      
      if (successful.length > 1) {
        console.log(' WARNING: Multiple bookings succeeded! Double booking detected!');
        console.log('   Check your database transaction isolation and FOR UPDATE implementation.');
      }
    }
  } catch (error) {
    console.error(' Test failed with error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testConcurrency();
