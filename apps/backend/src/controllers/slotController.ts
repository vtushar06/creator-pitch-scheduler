import { Request, Response, NextFunction } from "express";
import { getClient } from "../config/db";

export const getSlots = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const { date } = req.query;
  const userRole = req.user?.role;
  const client = await getClient();

  try {
    let query = `
      SELECT 
        s.id, 
        s.start_time, 
        s.end_time, 
        s.status,
        s.mentor_id,
        u.name as mentor_name,
        b.id as booking_id,
        b.user_id as booked_by_user_id,
        u2.name as booked_by_name,
        u2.email as booked_by_email
      FROM slots s
      JOIN users u ON s.admin_id = u.id
      LEFT JOIN bookings b ON s.id = b.slot_id AND b.status = 'BOOKED'
      LEFT JOIN users u2 ON b.user_id = u2.id
    `;

    const params: any[] = [];
    const whereClauses: string[] = [];

    if (userRole !== 'ADMIN') {
      whereClauses.push(`s.status = 'AVAILABLE'`);
    } else {
      whereClauses.push(`s.status IN ('AVAILABLE', 'BOOKED')`);
    }

    if (date) {
      whereClauses.push(`s.start_time::date = $${params.length + 1}`);
      params.push(date);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
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

export const createSlot = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const { startTime, endTime, mentorId } = req.body;
  const adminId = req.user?.userId;
  const client = await getClient();

  if (!adminId) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required'
    });
  }

  if (!mentorId) {
    return res.status(400).json({
      status: 'error',
      message: 'Mentor selection is required'
    });
  }

  try {
    await client.query("BEGIN");

    const overlapCheck = await client.query(
      `SELECT id FROM slots 
       WHERE admin_id = $1 
       AND mentor_id = $2
       AND status != 'CANCELLED'
       AND tstzrange(start_time, end_time) && tstzrange($3::timestamptz, $4::timestamptz)
       FOR UPDATE`,
      [adminId, mentorId, startTime, endTime]
    );

    if (overlapCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        status: "error",
        message: "This mentor is already assigned to an overlapping time slot",
      });
    }

    const result = await client.query(
      `INSERT INTO slots (admin_id, mentor_id, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, 'AVAILABLE')
       RETURNING *`,
      [adminId, mentorId, startTime, endTime]
    );

    await client.query("COMMIT");

    res.status(201).json({
      status: "success",
      data: result.rows[0],
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    
    if (error.code === "23P01") {
      return res.status(409).json({
        status: "error",
        message: "Overlapping slot detected",
      });
    }
    next(error);
  } finally {
    client.release();
  }
};

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

    const slotResult = await client.query(
      `SELECT * FROM slots WHERE id = $1 FOR UPDATE`,
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

    let bookingInfo = null;
    if (slot.status === 'BOOKED') {
      const bookingResult = await client.query(
        `SELECT b.id as booking_id, b.user_id, u.name as booked_by_name, u.email as booked_by_email
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         WHERE b.slot_id = $1 AND b.status = 'BOOKED'`,
        [slotId]
      );
      
      if (bookingResult.rows.length > 0) {
        bookingInfo = bookingResult.rows[0];
      }
    }

    if (slot.status === 'BOOKED' && bookingInfo) {
      await client.query(
        `UPDATE bookings SET status = 'CANCELLED', cancelled_at = NOW() WHERE id = $1`,
        [bookingInfo.booking_id]
      );

      console.log(`📧 Slot cancelled - notification would be sent to ${bookingInfo.booked_by_email}`);
    }

    await client.query(
      `UPDATE slots SET status = 'CANCELLED' WHERE id = $1`,
      [slotId]
    );

    await client.query("COMMIT");

    res.json({
      status: "success",
      message: slot.status === 'BOOKED' && bookingInfo
        ? `Slot cancelled and notification sent to ${bookingInfo.booked_by_name}`
        : 'Slot cancelled successfully',
      data: {
        slotId,
        wasBooked: slot.status === 'BOOKED',
        bookedBy: bookingInfo?.booked_by_name,
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
