-- packages/db/schema.sql

-- Enable GiST for the exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'CUSTOMER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Slots Table
CREATE TABLE slots (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BOOKED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- SENIOR FEATURE: Prevent overlaps at DB level
    -- Allows same admin to create overlapping slots for different mentors
    CONSTRAINT no_overlap EXCLUDE USING gist (
        admin_id WITH =,
        mentor_id WITH =,
        tstzrange(start_time, end_time) WITH &&
    ) WHERE (status != 'CANCELLED')
);

-- Bookings Table
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    slot_id INTEGER REFERENCES slots(id),
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'BOOKED' CHECK (status IN ('BOOKED', 'CANCELLED')),
    idempotency_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- FIX: Create the partial unique constraint as a separate INDEX
-- This ensures a slot can only have ONE "BOOKED" status at a time.
CREATE UNIQUE INDEX unique_active_booking 
ON bookings (slot_id) 
WHERE status = 'BOOKED';

-- Idempotency Index
CREATE UNIQUE INDEX idx_bookings_idempotency 
ON bookings (user_id, idempotency_key);