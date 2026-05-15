import db from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../services/activityService.js';
import { generateReviewReply } from '../services/aiService.js';

export function getReviews(req, res, next) {
  try {
    const { client_id, reply_status, rating, sentiment, page = 1, limit = 20 } = req.query;
    const lim    = Math.min(parseInt(limit) || 20, 100);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * lim;

    const where  = ['1=1'];
    const params = [];
    if (client_id)    { where.push('r.client_id = ?');    params.push(client_id); }
    if (reply_status) { where.push('r.reply_status = ?'); params.push(reply_status); }
    if (rating)       { where.push('r.rating = ?');       params.push(parseInt(rating)); }
    if (sentiment)    { where.push('r.sentiment = ?');    params.push(sentiment); }

    const w       = where.join(' AND ');
    const total   = db.prepare(`SELECT COUNT(*) as c FROM reviews r WHERE ${w}`).get(...params)?.c ?? 0;
    const reviews = db.prepare(`
      SELECT r.*, c.business_name FROM reviews r
      LEFT JOIN clients c ON c.id = r.client_id
      WHERE ${w} ORDER BY r.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, lim, offset);

    res.json({ reviews, total, page: parseInt(page) || 1, limit: lim });
  } catch (err) { next(err); }
}

export function getReview(req, res, next) {
  try {
    const review = db.prepare(
      'SELECT r.*, c.business_name FROM reviews r LEFT JOIN clients c ON c.id=r.client_id WHERE r.id=?'
    ).get(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json({ review });
  } catch (err) { next(err); }
}

export function createReview(req, res, next) {
  try {
    const { client_id, reviewer_name, rating, review_text, review_date, source, sentiment } = req.body;
    if (!client_id) return res.status(400).json({ error: 'client_id is required' });
    if (!rating)    return res.status(400).json({ error: 'rating is required' });

    const id = uuidv4();
    const derived = sentiment || (rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral');
    db.prepare(`
      INSERT INTO reviews (id, client_id, reviewer_name, rating, review_text, review_date, sentiment, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, client_id, reviewer_name || null, rating, review_text || null,
           review_date || new Date().toISOString().split('T')[0], derived, source || 'google');

    logActivity(req.user.id, client_id, 'CREATE_REVIEW', 'review', id, { rating });
    res.status(201).json({ review: db.prepare('SELECT * FROM reviews WHERE id = ?').get(id) });
  } catch (err) { next(err); }
}

export function updateReview(req, res, next) {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM reviews WHERE id = ?').get(id)) {
      return res.status(404).json({ error: 'Review not found' });
    }
    const fields = ['reviewer_name','rating','review_text','review_date','reply_status','sentiment','source'];
    const sets   = [];
    const vals   = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
    sets.push("updated_at = datetime('now')");
    vals.push(id);
    db.prepare(`UPDATE reviews SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    res.json({ review: db.prepare('SELECT * FROM reviews WHERE id = ?').get(id) });
  } catch (err) { next(err); }
}

export function deleteReview(req, res, next) {
  try {
    if (!db.prepare('SELECT id FROM reviews WHERE id = ?').get(req.params.id)) {
      return res.status(404).json({ error: 'Review not found' });
    }
    db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
    res.json({ message: 'Review deleted' });
  } catch (err) { next(err); }
}

export async function suggestReply(req, res, next) {
  try {
    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(review.client_id);
    const reply  = await generateReviewReply(review, client);

    db.prepare(`
      INSERT INTO review_replies (id, review_id, client_id, reply_text, ai_draft, status)
      VALUES (?, ?, ?, ?, ?, 'draft')
    `).run(uuidv4(), review.id, review.client_id, reply, reply);

    res.json({ reply, review_id: review.id });
  } catch (err) { next(err); }
}

export function saveReply(req, res, next) {
  try {
    const { id } = req.params;
    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const { reply_text } = req.body;
    if (!reply_text?.trim()) return res.status(400).json({ error: 'reply_text is required' });

    db.prepare(`
      UPDATE reviews SET reply_text=?, reply_status='replied', replied_at=datetime('now'), updated_at=datetime('now')
      WHERE id=?
    `).run(reply_text, id);

    db.prepare(`
      UPDATE review_replies SET status='sent', sent_by=?, sent_at=datetime('now')
      WHERE review_id=? AND status='draft'
    `).run(req.user.id, id);

    logActivity(req.user.id, review.client_id, 'REPLY_REVIEW', 'review', id, {});
    res.json({ review: db.prepare('SELECT * FROM reviews WHERE id = ?').get(id) });
  } catch (err) { next(err); }
}

export function getStats(req, res, next) {
  try {
    const { client_id } = req.query;
    if (!client_id) return res.status(400).json({ error: 'client_id required' });

    const summary = db.prepare(`
      SELECT COUNT(*) as total, ROUND(AVG(rating),1) as avg_rating,
        COUNT(CASE WHEN reply_status='pending' THEN 1 END) as pending,
        COUNT(CASE WHEN reply_status='replied' THEN 1 END) as replied,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive,
        COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative
      FROM reviews WHERE client_id = ?
    `).get(client_id);

    const distribution = db.prepare(
      'SELECT rating, COUNT(*) as count FROM reviews WHERE client_id=? GROUP BY rating ORDER BY rating'
    ).all(client_id);

    const monthly = db.prepare(`
      SELECT strftime('%Y-%m', COALESCE(review_date, created_at)) as month,
        COUNT(*) as count, ROUND(AVG(rating),1) as avg_rating
      FROM reviews WHERE client_id=?
      GROUP BY month ORDER BY month DESC LIMIT 12
    `).all(client_id);

    res.json({ ...summary, distribution, monthly });
  } catch (err) { next(err); }
}
