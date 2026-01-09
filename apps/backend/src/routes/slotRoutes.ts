import { Router } from "express";
import { getSlots, createSlot } from "../controllers/slotController";

const router = Router();

router.get("/", getSlots);
router.post("/", createSlot); 

export default router;
