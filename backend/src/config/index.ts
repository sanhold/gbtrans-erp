import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  jwt: {
    secret: process.env.JWT_SECRET || 'gbtrans-dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((o) => o.trim()),
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },

  orange: {
    apiUrl: process.env.ORANGE_API_URL || '',
    apiKey: process.env.ORANGE_API_KEY || '',
    apiSecret: process.env.ORANGE_API_SECRET || '',
    sender: process.env.ORANGE_SENDER || 'GBTRANS',
  },

  mobileMoney: {
    orangeMoney: { merchantKey: process.env.ORANGE_MONEY_MERCHANT_KEY || '' },
    mtnMoney: { apiKey: process.env.MTN_MONEY_API_KEY || '' },
    wave: { apiKey: process.env.WAVE_API_KEY || '' },
    moovMoney: { apiKey: process.env.MOOV_MONEY_API_KEY || '' },
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs',
  },

  backup: {
    dir: process.env.BACKUP_DIR || './backups',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY || '',
  },

  security: {
    maxLoginAttempts: 5,
    lockoutDuration: 30, // minutes
    passwordMinLength: 8,
    passwordExpiryDays: 90,
    sessionTimeout: 480, // minutes (8h)
  },
} as const;
