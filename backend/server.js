import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDb } from './src/db/init.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { initCrons } from './src/services/cronJobs.js';

import authRoutes          from './src/routes/auth.js';
import userRoutes          from './src/routes/users.js';
import clientRoutes        from './src/routes/clients.js';
import billingRoutes       from './src/routes/billing.js';
import keywordsRoutes      from './src/routes/keywords.js';
import reviewRoutes        from './src/routes/reviews.js';
import postRoutes          from './src/routes/posts.js';
import analyticsRoutes     from './src/routes/analytics.js';
import aiRoutes            from './src/routes/ai.js';
import teamRoutes          from './src/routes/team.js';
import notificationsRoutes from './src/routes/notifications.js';
import categoriesRoutes    from './src/routes/categories.js';
import reportsRoutes       from './src/routes/reports.js';
import publicRoutes        from './src/routes/public.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT      = process.env.PORT || 3000;

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', process.env.FRONTEND_URL].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/clients',       clientRoutes);
app.use('/api/billing',       billingRoutes);
app.use('/api/keywords',      keywordsRoutes);
app.use('/api/reviews',       reviewRoutes);
app.use('/api/posts',         postRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/team',          teamRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/categories',    categoriesRoutes);
app.use('/api/reports',       reportsRoutes);
app.use('/api/public',        publicRoutes);

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

initDb()
  .then(() => {
    initCrons();
    app.listen(PORT, () =>
      console.log(`GMB Dashboard running at http://localhost:${PORT}`)
    );
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

export default app;
