import app from './app';
import dotenv from 'dotenv';
import { validateEnvironment } from './config/validateEnv';

dotenv.config();

// Validate environment variables before starting server
validateEnvironment();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
