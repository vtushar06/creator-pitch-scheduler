import { Router } from "express";
import { getSlots, createSlot, deleteSlot } from "../controllers/slotController";
import { authenticateToken, requireAdmin } from "../middleware/authMiddleware";

const router = Router();

// Public route - anyone can view available slots
router.get("/", getSlots);

// Protected route - only admins can create slots
router.post("/", authenticateToken, requireAdmin, createSlot);

// Protected route - only admins can delete slots
router.delete("/:id", authenticateToken, requireAdmin, deleteSlot);

export default router;
