import { Router } from 'express';
import { createBooking, cancelBooking, getMyBookings } from '../controllers/bookingController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// All booking routes require authentication
router.get('/me', authenticateToken, getMyBookings);
router.post('/', authenticateToken, createBooking);
router.patch('/:id/cancel', authenticateToken, cancelBooking);

export default router;
