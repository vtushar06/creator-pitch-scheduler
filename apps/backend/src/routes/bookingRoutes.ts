import { Router } from 'express';
import { createBooking } from '../controllers/bookingController';
import { createSlot } from '../controllers/slotController';

const router = Router();

router.post('/', createBooking);
router.post("/", createSlot);

export default router;
