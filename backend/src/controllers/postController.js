import db from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../services/activityService.js';
import { generatePostContent, generateImage } from '../services/aiService.js';
import { createNotification } from '../services/notificationService.js';

export function getPosts(req, res, next) {
  try {
    const { client_id, status, post_type, month, year, page = 1, limit = 20 } = req.query;
    const lim    = Math.min(parseInt(limit) || 20, 100);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * lim;

    const where  = ['1=1'];
    const params = [];
    if (client_id) { where.push('p.client_id = ?'); params.push(client_id); }
    if (status)    { where.push('p.status = ?');    params.push(status); }
    if (post_type) { where.push('p.post_type = ?'); params.push(post_type); }
    if (month)     { where.push("CAST(strftime('%m', p.scheduled_at) AS INTEGER) = ?"); params.push(parseInt(month)); }
    if (year)      { where.push("strftime('%Y', p.scheduled_at) = ?"); params.push(String(year)); }

    const w     = where.join(' AND ');
    const total = db.prepare(`SELECT COUNT(*) as c FROM gbp_posts p WHERE ${w}`).get(...params)?.c ?? 0;
    const posts = db.prepare(`
      SELECT p.*, c.business_name FROM gbp_posts p
      LEFT JOIN clients c ON c.id = p.client_id
      WHERE ${w} ORDER BY p.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, lim, offset);

    res.json({ posts, total, page: parseInt(page) || 1, limit: lim });
  } catch (err) { next(err); }
}

export function getPost(req, res, next) {
  try {
    const post = db.prepare(
      'SELECT p.*, c.business_name FROM gbp_posts p LEFT JOIN clients c ON c.id=p.client_id WHERE p.id=?'
    ).get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ post });
  } catch (err) { next(err); }
}

export function createPost(req, res, next) {
  try {
    const { client_id, post_type, title, content, image_url, call_to_action, cta_url,
            status, scheduled_at, event_start, event_end, offer_coupon, offer_terms, notes } = req.body;
    if (!client_id) return res.status(400).json({ error: 'client_id is required' });
    if (!content)   return res.status(400).json({ error: 'content is required' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO gbp_posts (id, client_id, post_type, title, content, image_url, call_to_action, cta_url,
                             status, scheduled_at, event_start, event_end, offer_coupon, offer_terms, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, client_id, post_type || 'update', title || null, content, image_url || null,
           call_to_action || null, cta_url || null, status || 'draft', scheduled_at || null,
           event_start || null, event_end || null, offer_coupon || null, offer_terms || null,
           notes || null, req.user.id);

    logActivity(req.user.id, client_id, 'CREATE_POST', 'post', id, { title });
    res.status(201).json({ post: db.prepare('SELECT * FROM gbp_posts WHERE id = ?').get(id) });
  } catch (err) { next(err); }
}

export function updatePost(req, res, next) {
  try {
    const { id } = req.params;
    const post   = db.prepare('SELECT * FROM gbp_posts WHERE id = ?').get(id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const fields = ['post_type','title','content','image_url','image_prompt','call_to_action','cta_url',
                    'status','scheduled_at','event_start','event_end','offer_coupon','offer_terms','notes'];
    const sets   = [];
    const vals   = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(req.body[f]); }
    }
    if (req.body.status === 'published' && !post.published_at) {
      sets.push("published_at = datetime('now')");
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
    sets.push("updated_at = datetime('now')");
    vals.push(id);
    db.prepare(`UPDATE gbp_posts SET ${sets.join(', ')} WHERE id = ?`).run(...vals);

    const updatedPost = db.prepare('SELECT * FROM gbp_posts WHERE id = ?').get(id);

    // Extra log entry when a post is approved/published
    if (req.body.status === 'published' && post.status !== 'published') {
      logActivity(req.user.id, post.client_id, 'POST_APPROVED', 'post', id, {
        title: updatedPost.title || updatedPost.content?.slice(0, 60),
      });

      const client = db.prepare('SELECT business_name, assigned_to FROM clients WHERE id=?').get(post.client_id);
      const admins = db.prepare("SELECT id FROM users WHERE role='admin' AND status='active'").all();
      const userIds = new Set(admins.map(a => a.id));
      if (client?.assigned_to) userIds.add(client.assigned_to);
      for (const user_id of userIds) {
        createNotification({
          user_id,
          client_id: post.client_id,
          type:    'post_pending',
          title:   `Post approved: ${client?.business_name ?? ''}`,
          message: updatedPost.title || updatedPost.content?.slice(0, 80),
        });
      }
    } else {
      logActivity(req.user.id, post.client_id, 'UPDATE_POST', 'post', id, { title: req.body.title });
    }

    res.json({ post: updatedPost });
  } catch (err) { next(err); }
}

export function deletePost(req, res, next) {
  try {
    const post = db.prepare('SELECT * FROM gbp_posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    db.prepare('DELETE FROM gbp_posts WHERE id = ?').run(req.params.id);
    logActivity(req.user.id, post.client_id, 'DELETE_POST', 'post', req.params.id, {});
    res.json({ message: 'Post deleted' });
  } catch (err) { next(err); }
}

export async function generateContent(req, res, next) {
  try {
    const { client_id, post_type, topic, tone } = req.body;
    if (!client_id) return res.status(400).json({ error: 'client_id is required' });
    if (!topic)     return res.status(400).json({ error: 'topic is required' });
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);
    if (!client)    return res.status(404).json({ error: 'Client not found' });
    const content = await generatePostContent({ client, post_type, topic, tone });
    res.json({ content });
  } catch (err) { next(err); }
}

export async function generatePostImage(req, res, next) {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' });
    const imageUrl = await generateImage(prompt);
    res.json({ imageUrl });
  } catch (err) { next(err); }
}
