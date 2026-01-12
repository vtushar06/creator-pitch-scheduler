import { Router } from 'express';
import { createBooking, cancelBooking, getMyBookings, getAllBookings } from '../controllers/bookingController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/me', authenticateToken, getMyBookings);
router.get('/all', authenticateToken, requireAdmin, getAllBookings);
router.post('/', authenticateToken, createBooking);
router.patch('/:id/cancel', authenticateToken, cancelBooking);

export default router;
