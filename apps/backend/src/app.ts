import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { query } from './config/db';
import bookingRoutes from './routes/bookingRoutes';
import slotRoutes from "./routes/slotRoutes";
import adminRoutes from "./routes/adminRoutes";
import authRoutes from './routes/authRoutes';

const app = express();

// Configure CORS for production
const allowedOrigins = [
  'http://localhost:5173', 
  'https://creator-pitch-scheduler-fronten-tushar-vermas-projects-f01f3eda.vercel.app',
  /^https:\/\/.*\.vercel\.app$/ 
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => 
      typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
    );
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

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

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/slots", slotRoutes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

export default app;
