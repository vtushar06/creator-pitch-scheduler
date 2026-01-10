import { Request, Response, NextFunction } from "express";
import { getClient } from "../config/db";

export const createBooking = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const { slotId, idempotencyKey } = req.body;
  const userId = req.user?.userId; // Get from JWT token

  // Basic Validation
  if (!slotId || !idempotencyKey) {
    return res.status(400).json({
      status: "error",
      message: "slotId and idempotencyKey are required",
    });
  }

  if (!userId) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required'
    });
  }

  const client = await getClient();

  try {
    // 1. Start Transaction
    await client.query("BEGIN");

    // 2. Lock the Slot (PESSIMISTIC LOCKING)
    // This freezes the row so no other transaction can read/write it until we commit.
    const slotResult = await client.query(
      "SELECT * FROM slots WHERE id = $1 FOR UPDATE",
      [slotId]
    );

    if (slotResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        status: "error",
        message: "Slot not found",
      });
    }

    const slot = slotResult.rows[0];

    // 3. Business Rule: Check if Available
    if (slot.status !== "AVAILABLE") {
      await client.query("ROLLBACK");
      // 409 Conflict is the correct status for "Resource state prevents action"
      return res.status(409).json({
        status: "error",
        message: "Slot is not available",
        currentStatus: slot.status,
      });
    }

    // 3.5. Check if user already has an overlapping booking
    const userOverlapCheck = await client.query(
      `SELECT b.id 
       FROM bookings b 
       JOIN slots s ON b.slot_id = s.id 
       WHERE b.user_id = $1 
       AND b.status = 'BOOKED' 
       AND s.status = 'BOOKED'
       AND tstzrange(s.start_time, s.end_time) && tstzrange($2::timestamptz, $3::timestamptz)`,
      [userId, slot.start_time, slot.end_time]
    );

    if (userOverlapCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        status: "error",
        message: "You already have a booking at this time. Please choose a different time slot.",
      });
    }

    // 4. Create Booking
    const bookingResult = await client.query(
      `INSERT INTO bookings (slot_id, user_id, idempotency_key, status, created_at)
       VALUES ($1, $2, $3, 'BOOKED', NOW())
       RETURNING *`,
      [slotId, userId, idempotencyKey]
    );

    // 5. Update Slot Status
    await client.query(`UPDATE slots SET status = 'BOOKED' WHERE id = $1`, [
      slotId,
    ]);

    // 6. Commit Transaction
    await client.query("COMMIT");

    res.status(201).json({
      status: "success",
      data: {
        booking: bookingResult.rows[0],
      },
    });
  } catch (error: any) {
    await client.query("ROLLBACK");

    // Handle Idempotency (Network Retry)
    // Constraint name matches your SQL: CREATE UNIQUE INDEX idx_bookings_idempotency ...
    if (
      error.code === "23505" &&
      error.constraint === "idx_bookings_idempotency"
    ) {
      const existingBooking = await client.query(
        "SELECT * FROM bookings WHERE idempotency_key = $1",
        [idempotencyKey]
      );

      if (existingBooking.rows.length > 0) {
        return res.status(200).json({
          status: "success",
          message: "Booking already exists (idempotent retry)",
          data: {
            booking: existingBooking.rows[0],
          },
        });
      }
    }

    // Handle Race Condition / Double Booking
    // Constraint name matches your SQL: CREATE UNIQUE INDEX unique_active_booking ...
    if (
      error.code === "23505" &&
      error.constraint === "unique_active_booking"
    ) {
      return res.status(409).json({
        status: "error",
        message:
          "Slot already has an active booking (Double booking prevented)",
      });
    }

    console.error("Booking Transaction Error:", error);
    next(error);
  } finally {
    client.release();
  }
};

export const cancelBooking = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const bookingId = parseInt(req.params.id);
  const userId = req.user?.userId; // Get from JWT token

  if (!userId) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required",
    });
  }

  const client = await getClient();

  try {
    await client.query("BEGIN");

    // 1. Lock and fetch the booking
    const bookingResult = await client.query(
      "SELECT * FROM bookings WHERE id = $1 FOR UPDATE",
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        status: "error",
        message: "Booking not found",
      });
    }

    const booking = bookingResult.rows[0];

    // 2. Authorization: User can only cancel their own booking
    if (booking.user_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        status: "error",
        message: "You can only cancel your own bookings",
      });
    }

    // 3. Check if already cancelled
    if (booking.status === "CANCELLED") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        status: "error",
        message: "Booking is already cancelled",
      });
    }

    // 4. Update booking status
    await client.query(
      `UPDATE bookings 
       SET status = 'CANCELLED', cancelled_at = NOW() 
       WHERE id = $1`,
      [bookingId]
    );

    // 5. Release the slot back to AVAILABLE
    await client.query(
      `UPDATE slots 
       SET status = 'AVAILABLE' 
       WHERE id = $1`,
      [booking.slot_id]
    );

    await client.query("COMMIT");

    res.status(200).json({
      status: "success",
      message: "Booking cancelled successfully",
      data: {
        bookingId,
        slotId: booking.slot_id,
      },
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Cancel Booking Error:", error);
    next(error);
  } finally {
    client.release();
  }
};

// GET /api/bookings/me - Fetch current user's bookings
export const getMyBookings = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required",
    });
  }

  const client = await getClient();

  try {
    const result = await client.query(
      `SELECT 
        b.id,
        b.slot_id,
        b.user_id,
        b.status as booking_status,
        b.created_at,
        b.cancelled_at,
        s.start_time,
        s.end_time,
        s.status as slot_status,
        s.mentor_id
      FROM bookings b
      JOIN slots s ON b.slot_id = s.id
      WHERE b.user_id = $1 AND b.status IN ('BOOKED', 'CANCELLED')
      ORDER BY s.start_time DESC`,
      [userId]
    );

    res.json({
      status: "success",
      data: result.rows,
    });
  } catch (error) {
    console.error('❌ Error in getMyBookings:', error);
    next(error);
  } finally {
    client.release();
  }
};
