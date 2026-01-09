import { Request, Response, NextFunction } from "express";
import { getClient } from "../config/db";

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { slotId, userId, idempotencyKey } = req.body;

  // Basic Validation
  if (!slotId || !userId || !idempotencyKey) {
    return res.status(400).json({
      status: "error",
      message: "slotId, userId, and idempotencyKey are required",
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
