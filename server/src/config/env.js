import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '../../');

// Load .env from server directory
dotenv.config({ path: path.resolve(serverRoot, '.env') });

const rawDbPath = process.env.DATABASE_PATH || 'carepal.db';
const resolvedDbPath = path.isAbsolute(rawDbPath)
  ? rawDbPath
  : path.resolve(serverRoot, rawDbPath);

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'thecarepal_super_secure_jwt_secret_dev_key_2025',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databasePath: resolvedDbPath,
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'no-reply@thecarepal.com',
  }
};

