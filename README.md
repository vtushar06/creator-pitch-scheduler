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

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- Docker & Docker Compose
- npm

### Installation

```bash
# 1. Clone and install dependencies
git clone <repo>
cd creator-pitch-scheduler
npm install

# 2. Start PostgreSQL
npm run db:up

# 3. Backend
cd apps/backend
npm run dev

# 4. Frontend (in new terminal)
cd apps/frontend
npm run dev
```

### Database Setup

```sql
-- Create test users
docker exec -it pitch_db psql -U pitch_admin -d pitch_db

INSERT INTO users (name, email, role) VALUES 
  ('Admin User', 'admin@test.com', 'ADMIN'),
  ('Customer 1', 'customer1@test.com', 'CUSTOMER');

-- Create test slots
INSERT INTO slots (start_time, end_time, status, created_by) VALUES
  ('2026-01-09 10:00:00', '2026-01-09 11:00:00', 'AVAILABLE', 1),
  ('2026-01-09 14:00:00', '2026-01-09 15:00:00', 'AVAILABLE', 1);
```

## 🧪 Testing Concurrency

Run the concurrency stress test:

```bash
# Ensure backend is running on port 3000
node scripts/test-concurrency.js
```

**Expected output:**
```
✅ Successful bookings (201): 1
⚠️  Conflicts (409): 19
✅ PASS: Pessimistic Locking is working correctly!
```

## 📁 Project Structure

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

- **Authentication:** JWT tokens, role-based access control
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
