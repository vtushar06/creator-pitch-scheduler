import { Router } from 'express';
import { createBooking } from '../controllers/bookingController';

const router = Router();

router.post('/', createBooking);

export default router;
