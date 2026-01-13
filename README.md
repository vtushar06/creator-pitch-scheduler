# Appointment Booking System

A full-stack booking application built to handle high concurrency and strict data integrity.

My primary focus was solving the **"Double Booking" problem**—ensuring that if two users click "Book" at the exact same millisecond, only one succeeds, and the system state remains consistent.This isn't just a CRUD app.

## 🛠 Tech Stack & Versions

I chose this stack to balance development speed with type safety and performance.

* **Backend:** Node.js (v18.x), Express, TypeScript
* **Database:** PostgreSQL (v15+) 
* **Frontend:** React (v18), Vite, TanStack Query, Tailwind CSS
* **Containerization:** Docker & Docker Compose

---

## � Prerequisites

Before you start, make sure you have these installed:

* **Node.js:** v18.x or higher ([Download here](https://nodejs.org/))
* **npm:** v8.x or higher (comes with Node.js)
* **Docker & Docker Compose:** Latest version (if using Docker setup) ([Download here](https://www.docker.com/))
* **PostgreSQL:** v15+ (only if running without Docker) ([Download here](https://www.postgresql.org/download/))
* **Git:** For cloning the repository

**Quick version checks:**
```bash
node --version   # Should show v18.x or higher
npm --version    # Should show v8.x or higher
docker --version # Should show Docker version
```

---

## 🚀 Complete Setup Guide (For New Users/Forked Repos)

Follow these steps to get the project running on your local machine.

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/creator-pitch-scheduler.git
cd creator-pitch-scheduler
```

### Step 2: Install Dependencies

This is a monorepo structure. Install dependencies from the root:

```bash
npm install
```

This will install all dependencies for both backend and frontend.

### Step 3: Configure Environment Variables

Create your local environment file:

```bash
cp .env.example .env
```

Now edit the `.env` file with your values:

```env
# Database connection
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/booking_db

# JWT Secret (generate a secure one using the command below)
JWT_SECRET=your-secret-here-use-openssl-command-below

# Server config
PORT=3000
NODE_ENV=development
```

**Generate a secure JWT_SECRET:**
```bash
openssl rand -base64 32
```
Copy the output and paste it as your `JWT_SECRET` value.

### Step 4: Start the Application

**Option A: Docker (Recommended - Easiest)**

This starts everything (PostgreSQL + Backend + Frontend) with one command:

```bash
docker-compose up --build
```

Wait for all services to start. You'll see:
* ✅ Database initialized
* ✅ Backend running on port 3000
* ✅ Frontend running on port 5173

**Access the application:**
* **Frontend:** http://localhost:5173
* **Backend API:** http://localhost:3000
* **Database:** localhost:5432 (credentials: postgres/postgres)

**Option B: Manual Setup (Without Docker)**

If you prefer running services individually:

**1. Start PostgreSQL**
Make sure PostgreSQL is running on your machine.

**2. Create the database:**
```bash
createdb booking_db
```

**3. Run database migrations:**
```bash
cd apps/backend
npm run migrate
```

This will create all tables (users, slots, bookings) with proper constraints.

**4. Start the backend:**
```bash
cd apps/backend
npm run dev
```

Backend will start on http://localhost:3000

**5. Start the frontend (in a new terminal):**
```bash
cd apps/frontend
npm run dev
```

Frontend will start on http://localhost:5173

### Step 5: Create Your First Admin User

**The application requires at least one admin to create booking slots.**

**Before you start:** Make sure you completed Step 2 (`npm install`) and Step 4 (Docker containers are running).

**Quick Check:**
```bash
# Verify Docker containers are running
docker ps --filter "name=postgres"

# You should see the postgres container with status "Up"
```

---

**Method 1: Simplified Two-Step Setup (Docker Users - Recommended)**

**Step 1:** Generate the admin user SQL
```bash
cd apps/backend
node -e "const bcrypt = require('bcrypt'); const hash = bcrypt.hashSync('AdminPassword123', 10); console.log(\`INSERT INTO users (name, email, password, role) VALUES ('Admin User', 'admin@example.com', '\${hash}', 'ADMIN') ON CONFLICT (email) DO NOTHING;\`);"
```

💡 **Change `'AdminPassword123'` to your desired password before running!**

This outputs a SQL INSERT statement. Copy it.

**Step 2:** Run the SQL in your database
```bash
docker exec -i $(docker ps -qf "name=postgres") psql -U postgres -d booking_db
```

This opens a psql prompt. Paste your SQL statement and press Enter. Type `\q` to exit.

**Expected output:**
```
INSERT 0 1
```
This means 1 row was inserted successfully!

**Verify it worked:**
```bash
docker exec -i $(docker ps -qf "name=postgres") psql -U postgres -d booking_db -c "SELECT name, email, role FROM users WHERE role='ADMIN';"
```

You should see:
```
     name     |       email        | role  
--------------+-------------------+-------
 Admin User   | admin@example.com | ADMIN
```

✅ **Success!** You can now login with:
- Email: `admin@example.com`
- Password: `AdminPassword123` (or whatever you set)

---

**Method 2: Manual Setup (Non-Docker Users)**

**Step 2.1: Generate the password hash**
```bash
cd apps/backend
node -e "const bcrypt = require('bcrypt'); const password = 'YourPassword123'; console.log(bcrypt.hashSync(password, 10));"
```

Copy the hash output (starts with `$2b$10$...`)

**Step 2.2: Insert into database**
```bash
psql postgresql://postgres:postgres@localhost:5432/booking_db
```

Then run this SQL (replace `PASTE_HASH_HERE` with your copied hash):
```sql
INSERT INTO users (name, email, password, role) 
VALUES ('Admin User', 'admin@example.com', 'PASTE_HASH_HERE', 'ADMIN');
```

Type `\q` to exit psql.

---

**Method 3: Register via Frontend, Then Promote**

This is useful if you want to test the registration flow first:

1. Open http://localhost:5173 and register a new account
2. Then promote that user to admin in the database:

**Docker:**
```bash
docker exec -i $(docker ps -qf "name=postgres") psql -U postgres -d booking_db -c "UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';"
```

**Non-Docker:**
```bash
psql postgresql://postgres:postgres@localhost:5432/booking_db -c "UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';"
```

---

**🔍 Troubleshooting Admin Creation**

**Container name not found?** 
Find your actual container name:
```bash
docker ps --filter "name=postgres"
```
Then use the exact name in the docker exec command.

**bcrypt module not found?**
Make sure you ran `npm install` first:
```bash
cd apps/backend && npm install
```

**"duplicate key value violates unique constraint"?**
Admin already exists! Try logging in with the existing credentials, or delete and recreate:
```bash
docker exec -i $(docker ps -qf "name=postgres") psql -U postgres -d booking_db -c "DELETE FROM users WHERE email='admin@example.com';"
```
Then run the admin creation command again.

### Step 6: Verify Everything Works

**Test the backend API:**
```bash
# Health check
curl http://localhost:3000/health

# Login with your admin account
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"AdminPassword123"}'
```

You should get back a JWT token.

**Test the frontend:**
1. Open http://localhost:5173 in your browser
2. Login with your admin credentials
3. Try creating a booking slot

### Step 7: Run Tests (Optional)

Verify the test suite passes:

```bash
cd apps/backend
npm test
```

You should see:
```
Test Suites: 3 passed, 3 total
Tests:       5 passed, 5 total
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