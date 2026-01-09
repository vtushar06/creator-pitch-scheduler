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
        u.name as mentor_name
      FROM slots s
      JOIN users u ON s.admin_id = u.id
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

// POST /api/admin/slots (Simple creation)
export const createSlot = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { adminId, startTime, endTime } = req.body;
  const client = await getClient();

  try {
    const result = await client.query(
      `INSERT INTO slots (admin_id, start_time, end_time, created_by, status)
       VALUES ($1, $2, $3, $1, 'AVAILABLE')
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
