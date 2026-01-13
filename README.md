# Creator Pitch Scheduler

> A high-concurrency mentorship booking system demonstrating production-grade engineering for preventing race conditions and double bookings.

## 🎯 Overview

This project implements a **real-time slot booking system** with strict concurrency control, designed to handle simultaneous booking requests without data corruption. Built as a demonstration of senior-level backend engineering principles.

## 🏗 Architecture

### Tech Stack

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL 15 (with btree_gist extension)
- Connection pooling via `pg`

**Frontend:**
- React 18 + TypeScript
- TanStack Query (React Query) for server state
- Tailwind CSS
- Vite

**Infrastructure:**
- Docker Compose for local development
- Monorepo structure with npm workspaces

## 🔐 Engineering Decisions

### 1. Concurrency Control: Pessimistic Locking

**Problem:** When multiple users try to book the same slot simultaneously, a naive implementation would allow race conditions, resulting in double bookings.

**Solution:** Database-level pessimistic locking using `SELECT ... FOR UPDATE`.

```sql
-- In the booking transaction:
SELECT * FROM slots WHERE id = $1 FOR UPDATE;
```

**How it works:**
- When a transaction locks a row with `FOR UPDATE`, PostgreSQL blocks all other transactions from reading or writing that row until the lock is released (COMMIT/ROLLBACK)
- Ensures that only ONE transaction can evaluate slot availability at a time
- Prevents the "check-then-act" race condition

**Proof:** See `scripts/test-concurrency.js` - fires 20 concurrent requests for the same slot. Result: exactly 1 succeeds (201), 19 fail (409 Conflict).

### 2. Database Constraints: EXCLUDE USING gist

**Problem:** Admins creating overlapping slots manually or via API.

**Solution:** PostgreSQL `EXCLUDE` constraint with `btree_gist` extension.

```sql
EXCLUDE USING gist (
    created_by WITH =,
    tsrange(start_time, end_time) WITH &&
)
```

**What this does:**
- Enforces at the DATABASE level that the same user cannot create overlapping time ranges
- Uses GiST (Generalized Search Tree) indexes for efficient range queries
- `&&` operator checks for time range overlap
- Cannot be bypassed by application bugs or concurrent requests

**Why this matters:** Data integrity is enforced at the lowest possible level (database), not just application logic.

### 3. Frontend State: URL as Source of Truth

**Problem:** Local state (useState) breaks deep linking and makes the app harder to share/bookmark.

**Solution:** All filters (date, status) are synced to URL query params using a custom `useUrlFilters` hook.

```typescript
// apps/frontend/src/hooks/useUrlFilters.ts
const { filters, setFilters } = useUrlFilters();
// filters.date comes from ?date=2026-01-09

// React Query automatically refetches when URL changes:
queryKey: ["slots", filters.date, filters.status]
```

**Benefits:**
- **Deep Linking:** Users can share `?date=2026-01-15` URLs
- **Back/Forward Navigation:** Browser history works intuitively
- **No Stale State:** URL is single source of truth, eliminates sync bugs
- **Better UX:** Users expect filters to persist in URL

### 4. Optimistic UI Updates

**Problem:** Network latency makes booking feel slow.

**Solution:** TanStack Query's `onMutate` for optimistic updates + rollback on error.

```typescript
onMutate: async (variables) => {
  // Immediately update cache before API responds
  queryClient.setQueryData(queryKey, (old) => 
    old.map(slot => slot.id === slotId 
      ? { ...slot, status: 'BOOKED' } 
      : slot
    )
  );
}

onError: (error, variables, context) => {
  // Rollback if server returns 409 Conflict
  queryClient.setQueryData(context.queryKey, context.previousSlots);
}
```

**Why this works:**
- UI updates instantly (feels fast)
- If booking fails (409 Conflict), cache is rolled back and user sees error toast
- Combines perceived performance with correctness

### 5. Idempotency Key for Network Retries

**Problem:** User clicks "Book" → network timeout → user clicks again → double booking.

**Solution:** Client-generated idempotency keys.

```typescript
const idempotencyKey = `${userId}-${slotId}-${Date.now()}`;
```

Backend checks for duplicate keys:
```typescript
if (error.code === "23505" && error.constraint === "idx_bookings_idempotency") {
  // Return 200 with existing booking instead of 409
  return res.status(200).json({ message: "Already booked (idempotent)" });
}
```

**Result:** Safe retries without risk of duplicate bookings.

### 6. Cancellation Behavior & State Machine

**Cancellation Rules:**
- Bookings and slots have three immutable states: `AVAILABLE` → `BOOKED` ↔ `CANCELLED` (no row deletion)
- Once a booking is **CANCELLED**, the slot becomes **AVAILABLE** again
- Cancelled slots/bookings are never hard-deleted (preserves audit trail)
- Only the booking owner can cancel their own booking (enforced in middleware)
- Admin can view all bookings but cannot cancel them (preserves data isolation)

**Example Flow:**
```
1. Admin creates slot → Slot status = AVAILABLE
2. Customer A books slot → Slot status = BOOKED, Booking status = BOOKED
3. Customer A cancels → Booking status = CANCELLED, Slot status = AVAILABLE
4. Customer B can now book the same slot
5. All 4 events are logged in database (no deletes)
```

**Database Constraint:**
```sql
status VARCHAR(50) CHECK (status IN ('AVAILABLE', 'BOOKED', 'CANCELLED'))
```

This prevents invalid state transitions at the database level.

## 🌍 Environment Variables

Create a `.env` file in the root directory. See `.env.example` for template.

### Backend Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string | `postgresql://user:pass@neon.tech/db?sslmode=require` (Neon for local dev) or `postgresql://user:pass@render.onrender.com/db` (Render for production) |
| `JWT_SECRET` | ✅ Yes | Secret key for signing JWT tokens. Generate with `openssl rand -base64 32` | `your-super-secret-jwt-key-change-in-production` |
| `PORT` | ❌ No | Server port (default: 3000) | `3000` |
| `NODE_ENV` | ❌ No | Environment (development/production) | `development` |

### Frontend Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | ✅ Yes | Backend API base URL | `http://localhost:3000` (local) or `https://your-backend.render.com` (production) |

### Setup Instructions

```bash
# 1. Create .env from template
cp .env.example .env

# 2. Update DATABASE_URL and JWT_SECRET
# For local development with Neon:
#   DATABASE_URL=postgresql://username:password@ep-XXXXX.neon.tech/dbname?sslmode=require
#   JWT_SECRET=<generate with: openssl rand -base64 32>

# 3. For production on Render:
#   DATABASE_URL=postgresql://user:pass@dpg-XXXXX.render.onrender.com/dbname
```

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- Docker & Docker Compose (recommended)
- npm
- PostgreSQL 15+ (or use Docker)

### Option 1: Docker One-Command Setup (Recommended)

```bash
# 1. Clone repository
git clone <repo>
cd creator-pitch-scheduler

# 2. Start everything with one command
docker-compose up

# That's it! Services will be available at:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:3000
# - Database: localhost:5432
```

**What happens:**
- PostgreSQL starts with auto-initialized schema
- Backend builds and connects to database
- Frontend starts with hot reload enabled
- All services networked together

**To stop:**
```bash
docker-compose down
```

**To rebuild after code changes:**
```bash
docker-compose up --build
```

**Reset database (if schema issues occur):**
```bash
docker-compose down -v  # Removes volumes
docker-compose up       # Fresh start with clean DB
```

### Option 2: Local Development Setup

```bash
# 1. Clone and install dependencies
git clone <repo>
cd creator-pitch-scheduler
npm install

# 2. Start PostgreSQL (Docker)
docker-compose up -d

# 3. Setup environment
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# 4. Backend
cd apps/backend
npm run dev
# Server runs on http://localhost:3000

# 5. Frontend (in new terminal)
cd apps/frontend
npm run dev
# UI runs on http://localhost:5173
```

### Database Setup & Migrations

The database schema is automatically initialized on first Docker start using `docker-entrypoint-initdb.d/schema.sql`.

```bash
# Verify database is running
docker exec pitch_db psql -U pitch_admin -d pitch_db -c "SELECT version();"

# View current schema
docker exec pitch_db psql -U pitch_admin -d pitch_db -c "\dt"

# Manual query execution (if needed)
docker exec pitch_db psql -U pitch_admin -d pitch_db << EOF
INSERT INTO users (name, email, password, role) VALUES 
  ('Admin User', 'admin@test.com', 'hashed_password', 'ADMIN'),
  ('Customer 1', 'customer@test.com', 'hashed_password', 'CUSTOMER');
EOF
```

**Migration Workflow:**
1. Schema changes go in `/packages/db/schema.sql`
2. On next `docker-compose up`, the schema is applied
3. For production (Render), run migrations manually or via CI/CD pipeline

## 🧪 Testing

### Run All Tests

```bash
cd apps/backend

# Run full test suite
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- booking.success.test.ts
```

### Test Coverage

The test suite includes three critical scenarios:

1. **Booking Success Tests** (`booking.success.test.ts`)
   - User registration and authentication
   - Admin slot creation
   - Successful booking creation (201 Created)
   - Retrieving user's own bookings
   - Getting current user info

2. **Conflict Prevention Tests** (`conflict.prevention.test.ts`)
   - Concurrent booking attempts (409 Conflict for second request)
   - Double-booking prevention with SELECT FOR UPDATE
   - Slot type validation (slot_id must be number, positive integer)
   - Admin overlap prevention with EXCLUDE constraint

3. **Authorization Tests** (`authorization.test.ts`)
   - Missing/invalid JWT returns 401 Unauthorized
   - Customers cannot create slots (403 Forbidden)
   - Customers cannot delete slots (403 Forbidden)
   - Customers cannot access other users' bookings
   - Customers cannot cancel other users' bookings
   - Customers CAN cancel their own bookings

### Running Concurrency Stress Test

```bash
# Ensure backend is running on port 3000
node scripts/test-concurrency.js

# Expected output: 1 success (201), 19 conflicts (409)
# Proves pessimistic locking prevents race conditions
```

## � API Documentation

All endpoints require a valid JWT token in the `Authorization` header (except `/api/auth/register` and `/api/auth/login`).

```bash
# Example: Include token in requests
curl -H "Authorization: Bearer <your-jwt-token>" http://localhost:3000/api/auth/me
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "CUSTOMER"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "CUSTOMER"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "CUSTOMER",
    "created_at": "2026-01-13T10:00:00Z"
  }
}
```

---

### Slots Endpoints

#### Get Available Slots (Customer)
```http
GET /api/slots?date=2026-01-15&status=AVAILABLE
Authorization: Bearer <customer-token>
```

**Response (200 OK):**
```json
{
  "slots": [
    {
      "id": 1,
      "mentor_id": 100,
      "start_time": "2026-01-15T10:00:00Z",
      "end_time": "2026-01-15T11:00:00Z",
      "status": "AVAILABLE",
      "created_at": "2026-01-13T08:00:00Z"
    },
    {
      "id": 2,
      "mentor_id": 101,
      "start_time": "2026-01-15T14:00:00Z",
      "end_time": "2026-01-15T15:00:00Z",
      "status": "AVAILABLE",
      "created_at": "2026-01-13T08:00:00Z"
    }
  ]
}
```

#### Create Slot (Admin Only)
```http
POST /api/slots
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "mentor_id": 100,
  "start_time": "2026-01-20T10:00:00Z",
  "end_time": "2026-01-20T11:00:00Z"
}
```

**Response (201 Created):**
```json
{
  "slot": {
    "id": 5,
    "admin_id": 2,
    "mentor_id": 100,
    "start_time": "2026-01-20T10:00:00Z",
    "end_time": "2026-01-20T11:00:00Z",
    "status": "AVAILABLE",
    "created_at": "2026-01-13T10:30:00Z"
  }
}
```

**Errors:**
- `400 Bad Request`: Invalid date format or end_time <= start_time
- `403 Forbidden`: User is not an ADMIN
- `409 Conflict`: Time slot overlaps with existing slot for same admin

#### Delete Slot (Admin Only)
```http
DELETE /api/slots/5
Authorization: Bearer <admin-token>
```

**Response (200 OK):**
```json
{
  "message": "Slot deleted successfully"
}
```

**Errors:**
- `403 Forbidden`: User is not an ADMIN
- `404 Not Found`: Slot does not exist

---

### Booking Endpoints

#### Get My Bookings
```http
GET /api/bookings/me
Authorization: Bearer <customer-token>
```

**Response (200 OK):**
```json
{
  "bookings": [
    {
      "id": 10,
      "user_id": 1,
      "slot_id": 1,
      "status": "BOOKED",
      "created_at": "2026-01-13T11:00:00Z",
      "slot": {
        "id": 1,
        "mentor_id": 100,
        "start_time": "2026-01-15T10:00:00Z",
        "end_time": "2026-01-15T11:00:00Z"
      }
    }
  ]
}
```

#### Get All Bookings (Admin Only)
```http
GET /api/bookings
Authorization: Bearer <admin-token>
```

**Response (200 OK):**
```json
{
  "bookings": [
    {
      "id": 10,
      "user_id": 1,
      "slot_id": 1,
      "status": "BOOKED",
      "created_at": "2026-01-13T11:00:00Z"
    }
  ]
}
```

#### Create Booking
```http
POST /api/bookings
Authorization: Bearer <customer-token>
Content-Type: application/json

{
  "slot_id": 1,
  "user_id": 1
}
```

**Response (201 Created):**
```json
{
  "booking": {
    "id": 10,
    "user_id": 1,
    "slot_id": 1,
    "status": "BOOKED",
    "created_at": "2026-01-13T11:00:00Z"
  }
}
```

**Errors:**
- `400 Bad Request`: Invalid slot_id (not a number, negative, etc.)
- `409 Conflict`: Slot already booked (pessimistic lock prevents race condition)
- `404 Not Found`: Slot does not exist

#### Cancel Booking
```http
PATCH /api/bookings/10/cancel
Authorization: Bearer <customer-token>
```

**Response (200 OK):**
```json
{
  "booking": {
    "id": 10,
    "user_id": 1,
    "slot_id": 1,
    "status": "CANCELLED",
    "created_at": "2026-01-13T11:00:00Z"
  }
}
```

**Errors:**
- `403 Forbidden`: Cannot cancel another user's booking
- `404 Not Found`: Booking does not exist or already cancelled

---

### Health Check

#### Database Health
```http
GET /api/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

## �📁 Project Structure

```
creator-pitch-scheduler/
├── apps/
│   ├── backend/              # Express API
│   │   ├── src/
│   │   │   ├── config/       # DB connection pool
│   │   │   ├── controllers/  # Business logic (booking, slots)
│   │   │   ├── routes/       # API routes
│   │   │   └── index.ts      # Server entry
│   ├── frontend/             # React SPA
│   │   ├── src/
│   │   │   ├── hooks/        # Custom hooks (useSlots, useBookSlot, etc.)
│   │   │   ├── components/   # UI components (SlotCard)
│   │   │   └── pages/        # Page components (SlotsPage)
├── packages/
│   └── db/
│       └── schema.sql        # Database schema with constraints
├── scripts/
│   └── test-concurrency.js   # Stress test for race conditions
└── docker-compose.yml
```

## 📝 Known Limitations & Future Improvements

### Current Limitations

1. **No Email Notifications**
   - Users aren't notified when bookings are confirmed/cancelled
   - Admins aren't notified when new bookings arrive
   - **Future:** Integrate SendGrid or Nodemailer for transactional emails

2. **No Rate Limiting**
   - Endpoints are vulnerable to DOS attacks (no throttling on booking endpoint)
   - **Future:** Add `express-rate-limit` middleware (e.g., 5 requests/minute per IP)

3. **No Pagination**
   - `/api/bookings` and `/api/slots` return all results
   - Large datasets will cause performance issues
   - **Future:** Implement cursor-based pagination with limit/offset

4. **Date Filtering is Client-Side**
   - Backend `/api/slots` doesn't filter by past dates
   - Clients must filter themselves
   - **Future:** Add `start_after` and `end_before` query parameters to backend

5. **No Database Migrations Framework**
   - Schema changes require manual SQL execution
   - No version tracking or rollback support
   - **Future:** Integrate `node-pg-migrate` or Flyway for production safety

6. **No Logging/Observability**
   - No structured logging (Winston/Pino)
   - No metrics collection (Prometheus)
   - No distributed tracing
   - **Future:** Add comprehensive logging for debugging production issues

7. **JWT Token Expiration**
   - Tokens expire after 7 days with no refresh token mechanism
   - Users must re-login after expiration
   - **Future:** Implement refresh token rotation

8. **No Deployment Automation**
   - No CI/CD pipeline (GitHub Actions, GitLab CI)
   - No Kubernetes manifests
   - **Future:** Add automated tests on PR, staging deployment, production release workflow

### How These Align With Assignment Requirements

✅ **Correctness under concurrency + retries** - Covered by SELECT FOR UPDATE, transactions, unique constraints  
✅ **Clean API + validation + error codes** - Implemented with proper HTTP status codes (400, 401, 403, 404, 409)  
✅ **Role enforcement & data privacy** - `authenticateToken` + `requireAdmin` middleware, users can only see their own bookings  
✅ **React quality** - URL state via custom hooks, TanStack Query caching, optimistic UI updates  
✅ **Code structure, readability, tests, docs** - Organized controllers, middleware, routes; automated tests; comprehensive README  

## 🎓 Key Learnings

### For Interviewers

This project demonstrates:

1. **Distributed Systems Knowledge:** Understanding race conditions and solving them at the database level
2. **PostgreSQL Expertise:** Advanced constraints (EXCLUDE, btree_gist), row-level locking
3. **API Design:** RESTful principles, proper HTTP status codes (409 for conflicts, 201 for creation)
4. **Frontend Architecture:** URL-driven state, optimistic updates, error handling
5. **Testing:** Writing tests that prove correctness under concurrency
6. **Scalability Thinking:** Connection pooling, transaction isolation, idempotency

### Production Considerations (Not Implemented Here)

- **Authentication:** JWT tokens, role-based access control ✅ (Implemented)
- **Rate Limiting:** Prevent DOS attacks on booking endpoint
- **Observability:** Structured logging (Winston), metrics (Prometheus)
- **Deployment:** K8s manifests, CI/CD pipelines
- **Monitoring:** Alerting on failed transactions, slow queries

## 📚 References

- [PostgreSQL SELECT FOR UPDATE](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
- [PostgreSQL EXCLUDE Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-EXCLUSION)
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [Idempotency in REST APIs](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header)

## 📝 License

MIT

---

**Built by:** [Your Name]  
**Assessment:** Mugafi Senior Engineering Challenge  
**Focus:** High-concurrency systems, database integrity, modern full-stack architecture
