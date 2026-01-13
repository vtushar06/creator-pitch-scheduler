import { Request, Response, NextFunction } from "express";
import { getClient } from "../config/db";

export const createBooking = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const { slot_id } = req.body;
  const userId = req.user?.userId;

  // Validate slot_id type and value
  if (!slot_id || typeof slot_id !== 'number' || !Number.isInteger(slot_id) || slot_id <= 0) {
    return res.status(400).json({
      status: "error",
      message: "slot_id must be a positive integer",
    });
  }

  // Generate idempotency key internally for retries
  const idempotencyKey = req.body.idempotencyKey || `${userId}-${slot_id}-${Date.now()}`;

  if (!userId) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required'
    });
  }

  const client = await getClient();

  try {
    await client.query("BEGIN");

    const slotResult = await client.query(
      "SELECT * FROM slots WHERE id = $1 FOR UPDATE",
      [slot_id]
    );

    if (slotResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        status: "error",
        message: "Slot not found",
      });
    }

    const slot = slotResult.rows[0];

    if (slot.status !== "AVAILABLE") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        status: "error",
        message: "Someone else just booked this slot",
        currentStatus: slot.status,
      });
    }

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
        message: "Cannot book at same time. You already have a booking at this time.",
      });
    }

    const bookingResult = await client.query(
      `INSERT INTO bookings (slot_id, user_id, idempotency_key, status, created_at)
       VALUES ($1, $2, $3, 'BOOKED', NOW())
       RETURNING *`,
      [slot_id, userId, idempotencyKey]
    );

    await client.query(`UPDATE slots SET status = 'BOOKED' WHERE id = $1`, [
      slot_id,
    ]);

    await client.query("COMMIT");

    res.status(201).json({
      status: "success",
      data: {
        booking: bookingResult.rows[0],
      },
    });
  } catch (error: any) {
    await client.query("ROLLBACK");

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
          message: "Booking already exists",
          data: {
            booking: existingBooking.rows[0],
          },
        });
      }
    }

    if (
      error.code === "23505" &&
      error.constraint === "unique_active_booking"
    ) {
      return res.status(409).json({
        status: "error",
        message: "Slot already booked",
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
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required",
    });
  }

  const client = await getClient();

  try {
    await client.query("BEGIN");

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

    if (booking.user_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        status: "error",
        message: "You can only cancel your own bookings",
      });
    }

    if (booking.status === "CANCELLED") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        status: "error",
        message: "Booking is already cancelled",
      });
    }

    await client.query(
      `UPDATE bookings 
       SET status = 'CANCELLED', cancelled_at = NOW() 
       WHERE id = $1`,
      [bookingId]
    );

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
    console.error('Error in getMyBookings:', error);
    next(error);
  } finally {
    client.release();
  }
};

export const getAllBookings = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const userRole = req.user?.role;

  if (userRole !== 'ADMIN') {
    return res.status(403).json({
      status: "error",
      message: "Admin access required",
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
        s.mentor_id,
        u.name as user_name,
        u.email as user_email
      FROM bookings b
      JOIN slots s ON b.slot_id = s.id
      JOIN users u ON b.user_id = u.id
      WHERE b.status IN ('BOOKED', 'CANCELLED')
      ORDER BY s.start_time DESC`
    );

    res.json({
      status: "success",
      data: result.rows,
    });
  } catch (error) {
    console.error('Error in getAllBookings:', error);
    next(error);
  } finally {
    client.release();
  }
};
