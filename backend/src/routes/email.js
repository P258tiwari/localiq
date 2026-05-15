import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendEmail, sendWeeklyReport } from '../services/emailService.js';
import { getDb } from '../db/database.js';

const r = Router();
r.use(authenticate);

r.post('/send',
  requireRole('admin', 'manager'),
  body('to').isEmail(),
  body('subject').notEmpty(),
  body('html').notEmpty(),
  validate,
  async (req, res) => {
    await sendEmail(req.body);
    res.json({ message: 'Email sent' });
  }
);

r.post('/weekly-report/:clientId',
  requireRole('admin', 'manager'),
  async (req, res) => {
    const db = getDb();
    const client = db.prepare('SELECT * FROM clients WHERE id=?').get(req.params.clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const stats = db.prepare(`
      SELECT ROUND(AVG(r.rating),1) avgRating, COUNT(r.id) newReviews
      FROM reviews r
      WHERE r.client_id=? AND r.review_date >= date('now','-7 days')
    `).get(client.id);

    const { postsPublished } = db.prepare(`
      SELECT COUNT(*) postsPublished FROM posts
      WHERE client_id=? AND status='published' AND published_at >= date('now','-7 days')
    `).get(client.id);

    await sendWeeklyReport({
      client,
      stats: { ...stats, postsPublished },
      recipientEmail: req.body.email || client.contact_email
    });

    res.json({ message: 'Weekly report sent' });
  }
);

r.get('/logs', requireRole('admin'), (_req, res) => {
  const logs = getDb().prepare(
    'SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 100'
  ).all();
  res.json({ logs });
});

export default r;
