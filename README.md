# Appointment Booking System

A full-stack booking application built to handle high concurrency and strict data integrity.

This isn't just a CRUD app. My primary focus was solving the **"Double Booking" problem**—ensuring that if two users click "Book" at the exact same millisecond, only one succeeds, and the system state remains consistent.

## 🛠 Tech Stack & Versions

I chose this stack to balance development speed with type safety and performance.

* **Backend:** Node.js (v18.x), Express, TypeScript
* **Database:** PostgreSQL (v15+) – *Chosen for Row-Level Locking capabilities.*
* **Frontend:** React (v18), Vite, TanStack Query, Tailwind CSS
* **Containerization:** Docker & Docker Compose

---

## 🚀 Setup Steps (Local)

You can run the entire system with one command using Docker.

**Option 1: Docker (Recommended)**

1. Clone the repository.
2. Create your env file: `cp .env.example .env`
3. Run:
```bash
docker-compose up --build

```


4. Access the app:
* **Frontend:** `http://localhost:5173`
* **Backend:** `http://localhost:3000`
* **DB Admin (Optional):** The database runs on port `5432`.



**Option 2: Manual Setup**

If you prefer running without Docker:

1. **Database:** Ensure you have PostgreSQL running locally.
2. **Backend:**
```bash
cd backend
npm install
npm run migrate  # Seeds the DB schema
npm run dev

```


3. **Frontend:**
```bash
cd frontend
npm install
npm run dev

```



---

## 🔑 Environment Variables

See `.env.example` for the template.

| Variable | Description |
| --- | --- |
| `PORT` | API server port (default: 3000) |
| `DATABASE_URL` | Connection string (e.g., `postgres://user:pass@localhost:5432/booking_db`) |
| `JWT_SECRET` | Secret key for signing auth tokens (e.g., generated via `openssl rand -hex 32`) |
| `NODE_ENV` | Set to `development` for local or `production` for deployment |

---

## 🗄 Database Migrations

Since this is a raw SQL/Node implementation (to demonstrate core backend skills without ORM magic hiding the logic), migrations are handled via SQL scripts.

* **Location:** `/backend/db/schema.sql`
* **How to run:**
* **Docker:** Runs automatically on container startup via `/docker-entrypoint-initdb.d`.
* **Manual:** I included a script: `npm run migrate`. This connects to your DB and executes the schema file.



---

## 🧪 How to Run Tests

I prioritized testing the "Complex Areas" mentioned in the requirements (Concurrency & Auth).

**Run all tests:**

```bash
cd backend
npm test

```

**Key Test Suites:**

1. `booking.concurrency.test.ts`: Fires 20 simultaneous booking requests for a single slot. Verifies that **exactly 1** succeeds and 19 fail with `409 Conflict`.
2. `auth.test.ts`: Verifies customers cannot cancel other people's bookings.
3. `slots.overlap.test.ts`: Attempts to create overlapping admin slots to ensure the DB constraint catches it.

---

## 🧠 Key Design Decisions

### 1. preventing Double Bookings (The Concurrency Mechanism)

This was the hardest part of the assignment. A standard `SELECT` then `UPDATE` logic is vulnerable to race conditions.

**My Solution: Pessimistic Locking**
I used a database transaction with `SELECT ... FOR UPDATE`.

* **The Logic:** When a booking request comes in, I open a transaction and query the slot row with a lock.
* **The SQL:** `SELECT * FROM slots WHERE id = $1 FOR UPDATE;`
* **Why:** This tells Postgres: *"Lock this row. No one else can read or write to it until I finish my transaction."*
* **Result:** Requests become serialized. The first one books it; the second one sees the status is now `BOOKED` and fails.

### 2. Preventing Slot Overlap

I needed to ensure an Admin doesn't accidentally create two slots that clash (e.g., 9:00-10:00 and 9:30-10:30).

**My Solution: Postgres Exclusion Constraints**
Instead of relying on JavaScript validation (which can be buggy), I enforced this at the database engine level using the `btree_gist` extension.

* **Constraint:** `EXCLUDE USING gist (tsrange(start_time, end_time) WITH &&)`
* **Why:** The database physically rejects any insert that overlaps with an existing range. It's foolproof.

### 3. Cancellation Behavior Rules

I implemented a **State Machine** approach rather than deleting data.

* **No Hard Deletes:** When a booking is cancelled, the row is **not** deleted.
* **State Transition:** The Booking status changes to `CANCELLED`, and the Slot status reverts to `AVAILABLE`.
* **Why:** This preserves the audit trail. We can see *who* cancelled and *when*, which is crucial for real-world admin disputes.

---

## ⚠️ Known Limitations & Future Improvements

1. **Pagination:** Currently, the `GET /slots` endpoint returns all data. For a production app, I would add `limit` and `offset` parameters to handle thousands of records.
2. **Notification System:** The assignment didn't ask for it, but in a real app, I'd integrate a job queue (like BullMQ) to send email confirmations asynchronously so the HTTP request remains fast.
3. **Timezones:** I store everything in UTC (best practice), but the frontend simply converts to the user's browser local time. A more robust system might allow users to pick their display timezone.