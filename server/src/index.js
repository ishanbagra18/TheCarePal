import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { config } from './config/env.js';
import db from './db/connection.js';
import initSchema from './db/schema.js';
import { seedDatabase } from '../seed.js';
import authRoutes from './routes/authRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import careRoutes from './routes/careRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB schema on startup
initSchema(db);

// Auto-seed if database is freshly deployed (e.g. on Render)
try {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get()?.count || 0;
  if (userCount === 0) {
    console.log('[TheCarePal Server] Fresh database detected. Auto-seeding 35 days of clinical data...');
    seedDatabase(db);
  }
} catch (e) {
  console.warn('[TheCarePal Server] Auto-seed check notice:', e.message);
}

// Ensure uploads directory exists
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const app = express();

// Middlewares
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://localhost:3000',
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(s => s.trim()) : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-side)
    if (!origin) return callback(null, true);
    
    // Allow configured origins or any vercel.app deployment
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    callback(null, true); // Fallback allow to prevent production blockages
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded photos statically
app.use('/uploads', express.static(uploadsDir));

// Root landing route for health & deployment verification
app.get('/', (req, res) => {
  res.json({
    service: 'TheCarePal API Server',
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      demoAccounts: '/api/auth/demo-accounts',
      login: 'POST /api/auth/login',
    },
    message: 'TheCarePal backend is running successfully. Connect your Vercel frontend by setting VITE_API_URL to this URL + /api'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'TheCarePal API', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients/:patientId', careRoutes);
app.use('/api/patients', patientRoutes);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server if not running in test suite
if (process.env.NODE_ENV !== 'test' && !process.argv.some(arg => arg.includes('test'))) {
  app.listen(config.port, () => {
    console.log(`[TheCarePal Server] Running on http://localhost:${config.port} in ${config.nodeEnv} mode`);
  });
}

export default app;

