import { Router } from "express";
import { createSlot, deleteSlot } from "../controllers/slotController";
import { authenticateToken, requireAdmin } from "../middleware/authMiddleware";

const router = Router();

// Protected route - only admins can create slots
router.post("/slots", authenticateToken, requireAdmin, createSlot);

// Protected route - only admins can delete slots
router.delete("/slots/:id", authenticateToken, requireAdmin, deleteSlot);

export default router;
