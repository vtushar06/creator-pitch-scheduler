import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { query } from './config/db';
import bookingRoutes from './routes/bookingRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query('SELECT 1 as health');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: result.rows[0].health === 1 ? 'connected' : 'disconnected'
    });
  } catch (error) {
    next(error);
  }
});

app.use('/api/bookings', bookingRoutes); 

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

export default app;
