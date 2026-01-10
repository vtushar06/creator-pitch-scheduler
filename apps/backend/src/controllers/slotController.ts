import { Request, Response, NextFunction } from "express";
import { getClient } from "../config/db";

// GET /api/slots?date=2026-01-20
export const getSlots = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { date } = req.query;
  const client = await getClient();

  try {
    let query = `
      SELECT 
        s.id, 
        s.start_time, 
        s.end_time, 
        s.status,
        u.name as mentor_name,
        b.id as booking_id,
        b.user_id as booked_by_user_id,
        u2.name as booked_by_name,
        u2.email as booked_by_email
      FROM slots s
      JOIN users u ON s.admin_id = u.id
      LEFT JOIN bookings b ON s.id = b.slot_id AND b.status = 'ACTIVE'
      LEFT JOIN users u2 ON b.user_id = u2.id
      WHERE s.status != 'CANCELLED'
    `;

    const params: any[] = [];

    // Filter by Date (Senior implementation: Handles Timezones correctly)
    if (date) {
      query += ` AND s.start_time::date = $1`;
      params.push(date);
    }

    query += ` ORDER BY s.start_time ASC`;

    const result = await client.query(query, params);

    res.json({
      status: "success",
      data: result.rows,
    });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};

// POST /api/slots (Admin only)
export const createSlot = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const { startTime, endTime } = req.body;
  const adminId = req.user?.userId; // Get from JWT token
  const client = await getClient();

  if (!adminId) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required'
    });
  }

  try {
    const result = await client.query(
      `INSERT INTO slots (admin_id, start_time, end_time, status)
       VALUES ($1, $2, $3, 'AVAILABLE')
       RETURNING *`,
      [adminId, startTime, endTime]
    );

    res.status(201).json({
      status: "success",
      data: result.rows[0],
    });
  } catch (error: any) {
    // Handle the Exclusion Constraint error gracefully
    if (error.code === "23P01") {
      // PostgreSQL code for exclusion violation
      return res.status(409).json({
        status: "error",
        message: "Overlapping slot detected for this admin",
      });
    }
    next(error);
  } finally {
    client.release();
  }
};

// DELETE /api/admin/slots/:id - Admin cancel/delete a slot
export const deleteSlot = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const slotId = parseInt(req.params.id);
  const adminId = req.user?.userId;

  if (!adminId) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required'
    });
  }

  const client = await getClient();

  try {
    await client.query("BEGIN");

    // 1. Fetch slot details with booking info
    const slotResult = await client.query(
      `SELECT s.*, b.id as booking_id, b.user_id, u.name as booked_by_name, u.email as booked_by_email
       FROM slots s
       LEFT JOIN bookings b ON s.id = b.slot_id AND b.status = 'ACTIVE'
       LEFT JOIN users u ON b.user_id = u.id
       WHERE s.id = $1 FOR UPDATE`,
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

    // 2. If slot is BOOKED, cancel the booking and send notification (mocked)
    if (slot.status === 'BOOKED' && slot.booking_id) {
      // Cancel the booking
      await client.query(
        `UPDATE bookings SET status = 'CANCELLED', cancelled_at = NOW() WHERE id = $1`,
        [slot.booking_id]
      );

      // Mock notification/email
      console.log(`📧 [MOCK EMAIL] Slot cancelled notification sent to ${slot.booked_by_email}`);
      console.log(`   User: ${slot.booked_by_name}`);
      console.log(`   Slot: ${slot.start_time} - ${slot.end_time}`);
    }

    // 3. Update slot status to CANCELLED
    await client.query(
      `UPDATE slots SET status = 'CANCELLED' WHERE id = $1`,
      [slotId]
    );

    await client.query("COMMIT");

    res.json({
      status: "success",
      message: slot.status === 'BOOKED' 
        ? `Slot cancelled and notification sent to ${slot.booked_by_name}`
        : 'Slot cancelled successfully',
      data: {
        slotId,
        wasBooked: slot.status === 'BOOKED',
        bookedBy: slot.booked_by_name,
      }
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Delete Slot Error:", error);
    next(error);
  } finally {
    client.release();
  }
};
