import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';

const r = Router();

/* GET /api/public/:token — no auth, returns read-only client data */
r.get('/:token', (req, res) => {
  const { token } = req.params;
  const client = db.prepare(
    'SELECT id, business_name, city, category, logo_url, status FROM clients WHERE public_token = ?'
  ).get(token);
  if (!client) return res.status(404).json({ error: 'Link not found or expired' });

  const billing = db.prepare(
    'SELECT plan_name, monthly_amount, next_due_date, payment_status, start_date FROM client_billing WHERE client_id = ?'
  ).get(client.id);

  // Posts: published, most recent 20
  const posts = db.prepare(
    `SELECT id, title, content, image_url, post_type, published_at, scheduled_at, call_to_action, cta_url
     FROM gbp_posts
     WHERE client_id = ? AND status IN ('published','scheduled')
     ORDER BY COALESCE(published_at, scheduled_at) DESC
     LIMIT 20`
  ).all(client.id);

  // Selected keywords only
  const keywords = db.prepare(
    `SELECT keyword, volume, difficulty, intent
     FROM keywords
     WHERE client_id = ? AND selected = 1
     ORDER BY priority ASC, volume DESC`
  ).all(client.id);

  res.json({ client, billing: billing || null, posts, keywords });
});

/* POST /api/public/generate/:clientId — protected, generate/refresh token */
import { verifyToken } from '../middleware/auth.js';

r.post('/generate/:clientId', verifyToken, (req, res) => {
  const { clientId } = req.params;
  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const token = uuidv4();
  db.prepare('UPDATE clients SET public_token = ? WHERE id = ?').run(token, clientId);
  res.json({ token });
});

/* GET /api/public/token/:clientId — protected, get current token */
r.get('/token/:clientId', verifyToken, (req, res) => {
  const { clientId } = req.params;
  const row = db.prepare('SELECT public_token FROM clients WHERE id = ?').get(clientId);
  if (!row) return res.status(404).json({ error: 'Client not found' });
  res.json({ token: row.public_token || null });
});

export default r;
