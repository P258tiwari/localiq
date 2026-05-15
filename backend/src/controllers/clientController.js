import db from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../services/activityService.js';

const MAPS_FIELDS = [
  'place_name_on_maps','maps_rating','maps_review_count','maps_category_on_google',
  'maps_phone_on_google','maps_website_on_google','gbp_description_current','gbp_status'
];

const CLIENT_FIELDS = [
  'client_name','business_name','owner_name','category','industry','phone','whatsapp','email',
  'website','address','city','state','pincode','gbp_link','localo_link','opening_hours',
  'social_links','brand_images','status','assigned_to','notes',
  'business_type','services','usp','products','target_audience','target_areas',
  'brand_tone','language_preference','monthly_objective',
  ...MAPS_FIELDS, 'gbp_description_ai'
];

function parseJSON(v, fallback) {
  if (typeof v === 'object' && v !== null) return v;
  try { return JSON.parse(v || 'null') ?? fallback; } catch { return fallback; }
}

function parseClient(c) {
  if (!c) return null;
  return {
    ...c,
    opening_hours: parseJSON(c.opening_hours, {}),
    social_links:  parseJSON(c.social_links, {}),
    brand_images:  parseJSON(c.brand_images, {}),
  };
}

function computeScore(clientId) {
  const client  = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
  if (!client) return 0;
  const seo     = db.prepare('SELECT * FROM client_seo WHERE client_id = ?').get(clientId);
  const billing = db.prepare('SELECT * FROM client_billing WHERE client_id = ?').get(clientId);
  const kwCount = db.prepare('SELECT COUNT(*) as c FROM keywords WHERE client_id = ?').get(clientId)?.c ?? 0;
  const month   = new Date().toISOString().slice(0, 7);
  const posts   = db.prepare(
    "SELECT COUNT(*) as c FROM gbp_posts WHERE client_id = ? AND strftime('%Y-%m', created_at) = ?"
  ).get(clientId, month)?.c ?? 0;

  let score = 0;
  const basic  = ['business_name','client_name','phone','email','address','city','state','category','website'];
  const filled = basic.filter(f => client[f]?.toString().trim()).length;
  score += Math.round(filled / basic.length * 30);

  if (seo?.meta_title?.trim())       score += 8;
  if (seo?.meta_description?.trim()) score += 8;
  if (parseJSON(seo?.target_keywords, []).length > 0) score += 9;

  if (billing?.plan_name?.trim()) score += 8;
  if ((billing?.monthly_amount ?? 0) > 0) score += 7;

  score += Math.round(Math.min(kwCount, 5) / 5 * 15);
  if (posts > 0) score += 15;

  return Math.min(100, score);
}

export function getClients(req, res, next) {
  try {
    const { status, city, category, assigned_user_id, search, missing_details, page = 1, limit = 20 } = req.query;
    const lim    = Math.min(parseInt(limit) || 20, 100);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * lim;

    const where  = ['1=1'];
    const params = [];

    if (status)           { where.push('c.status = ?');                     params.push(status); }
    if (city)             { where.push('LOWER(c.city) LIKE LOWER(?)');      params.push(`%${city}%`); }
    if (category)         { where.push('c.category = ?');                   params.push(category); }
    if (assigned_user_id) { where.push('c.assigned_to = ?');                params.push(assigned_user_id); }
    if (missing_details === 'true' || missing_details === '1') {
      where.push('c.profile_completion_score < 60');
    }
    if (search) {
      where.push('(c.business_name LIKE ? OR c.client_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const w     = where.join(' AND ');
    const total = db.prepare(`SELECT COUNT(*) as c FROM clients c WHERE ${w}`).get(...params)?.c ?? 0;
    const rows  = db.prepare(`
      SELECT c.*,
        cb.plan_name, cb.monthly_amount, cb.payment_status, cb.next_due_date,
        u.name AS assigned_user_name,
        (SELECT COUNT(*) FROM reviews r WHERE r.client_id = c.id) AS review_count,
        (SELECT ROUND(AVG(rating),1) FROM reviews r WHERE r.client_id = c.id) AS avg_rating,
        (SELECT COUNT(*) FROM reviews r WHERE r.client_id = c.id AND r.reply_status='pending') AS pending_replies
      FROM clients c
      LEFT JOIN client_billing cb ON cb.client_id = c.id
      LEFT JOIN users u ON u.id = c.assigned_to
      WHERE ${w}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, lim, offset);

    res.json({ clients: rows.map(parseClient), total, page: parseInt(page) || 1, limit: lim });
  } catch (err) { next(err); }
}

export function getClient(req, res, next) {
  try {
    const { id } = req.params;
    const client = db.prepare(`
      SELECT c.*, u.name AS assigned_user_name, u.email AS assigned_user_email
      FROM clients c
      LEFT JOIN users u ON u.id = c.assigned_to
      WHERE c.id = ?
    `).get(id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const seo     = db.prepare('SELECT * FROM client_seo WHERE client_id = ?').get(id);
    const billing = db.prepare('SELECT * FROM client_billing WHERE client_id = ?').get(id);

    const posts = db.prepare(`
      SELECT COUNT(*) AS total,
        COUNT(CASE WHEN status='published' THEN 1 END) AS published,
        COUNT(CASE WHEN status='draft'     THEN 1 END) AS draft,
        COUNT(CASE WHEN status='scheduled' THEN 1 END) AS scheduled
      FROM gbp_posts WHERE client_id = ?
    `).get(id);

    const reviews = db.prepare(`
      SELECT COUNT(*) AS total,
        ROUND(AVG(rating),1) AS avg_rating,
        COUNT(CASE WHEN reply_status='pending' THEN 1 END) AS pending_replies,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) AS positive
      FROM reviews WHERE client_id = ?
    `).get(id);

    const keyword_count = db.prepare('SELECT COUNT(*) as c FROM keywords WHERE client_id = ?').get(id)?.c ?? 0;

    if (seo) seo.target_keywords = parseJSON(seo.target_keywords, []);
    res.json({ client: parseClient(client), seo, billing, stats: { ...posts, ...reviews, keyword_count } });
  } catch (err) { next(err); }
}

export function createClient(req, res, next) {
  try {
    const id   = uuidv4();
    const body = req.body;
    const jsonFields = ['opening_hours','social_links','brand_images'];

    const cols = ['id'];
    const vals = [id];
    for (const f of CLIENT_FIELDS) {
      if (body[f] !== undefined) {
        cols.push(f);
        vals.push(jsonFields.includes(f) ? JSON.stringify(body[f]) : body[f]);
      }
    }

    db.prepare(`INSERT INTO clients (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...vals);

    db.prepare(`INSERT INTO client_seo (id, client_id, meta_title, meta_description, target_keywords) VALUES (?, ?, ?, ?, ?)`
    ).run(uuidv4(), id, body.meta_title || null, body.meta_description || null, JSON.stringify(body.target_keywords || []));

    if (body.plan_name || body.monthly_amount) {
      db.prepare(`INSERT INTO client_billing (id, client_id, plan_name, monthly_amount, billing_cycle, next_due_date, payment_status)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(uuidv4(), id, body.plan_name || null, body.monthly_amount || 0,
            body.billing_cycle || 'monthly', body.next_due_date || null, body.payment_status || 'pending');
    }

    const score = computeScore(id);
    db.prepare('UPDATE clients SET profile_completion_score = ? WHERE id = ?').run(score, id);

    logActivity(req.user.id, id, 'CREATE_CLIENT', 'client', id, { business_name: body.business_name });
    const created = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    res.status(201).json({ client: parseClient(created), profile_completion_score: score });
  } catch (err) { next(err); }
}

export function updateClient(req, res, next) {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM clients WHERE id = ?').get(id)) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const jsonFields = ['opening_hours','social_links','brand_images'];
    const sets = [];
    const vals = [];
    for (const f of CLIENT_FIELDS) {
      if (req.body[f] !== undefined) {
        sets.push(`${f} = ?`);
        vals.push(jsonFields.includes(f) ? JSON.stringify(req.body[f]) : req.body[f]);
      }
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
    sets.push("updated_at = datetime('now')");
    vals.push(id);
    db.prepare(`UPDATE clients SET ${sets.join(', ')} WHERE id = ?`).run(...vals);

    const score = computeScore(id);
    db.prepare('UPDATE clients SET profile_completion_score = ? WHERE id = ?').run(score, id);

    logActivity(req.user.id, id, 'UPDATE_CLIENT', 'client', id, { business_name: req.body.business_name });
    const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    res.json({ client: parseClient(updated), profile_completion_score: score });
  } catch (err) { next(err); }
}

export function deleteClient(req, res, next) {
  try {
    const { id } = req.params;
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    res.json({ message: 'Client deleted' });
  } catch (err) { next(err); }
}

export function getClientSeo(req, res, next) {
  try {
    const seo = db.prepare('SELECT * FROM client_seo WHERE client_id = ?').get(req.params.id);
    if (!seo) return res.status(404).json({ error: 'SEO record not found' });
    seo.target_keywords = parseJSON(seo.target_keywords, []);
    res.json({ seo });
  } catch (err) { next(err); }
}

export function updateClientSeo(req, res, next) {
  try {
    const { id } = req.params;
    const seo    = db.prepare('SELECT id FROM client_seo WHERE client_id = ?').get(id);
    const { meta_title, meta_description, target_keywords, seo_score, audit_notes } = req.body;

    if (!seo) {
      db.prepare(`INSERT INTO client_seo (id, client_id, meta_title, meta_description, target_keywords, seo_score, audit_notes)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(uuidv4(), id, meta_title ?? null, meta_description ?? null,
            JSON.stringify(target_keywords ?? []), seo_score ?? 0, audit_notes ?? null);
    } else {
      const sets = ["updated_at = datetime('now')"];
      const vals = [];
      if (meta_title       !== undefined) { sets.push('meta_title = ?');       vals.push(meta_title); }
      if (meta_description !== undefined) { sets.push('meta_description = ?'); vals.push(meta_description); }
      if (target_keywords  !== undefined) { sets.push('target_keywords = ?');  vals.push(JSON.stringify(target_keywords)); }
      if (seo_score        !== undefined) { sets.push('seo_score = ?');         vals.push(seo_score); }
      if (audit_notes      !== undefined) { sets.push('audit_notes = ?');       vals.push(audit_notes); }
      vals.push(id);
      db.prepare(`UPDATE client_seo SET ${sets.join(', ')} WHERE client_id = ?`).run(...vals);
    }

    const score = computeScore(id);
    db.prepare('UPDATE clients SET profile_completion_score = ? WHERE id = ?').run(score, id);

    const updated = db.prepare('SELECT * FROM client_seo WHERE client_id = ?').get(id);
    updated.target_keywords = parseJSON(updated.target_keywords, []);
    res.json({ seo: updated, profile_completion_score: score });
  } catch (err) { next(err); }
}

export function getMapsInfo(req, res, next) {
  try {
    const client = db.prepare(`SELECT ${MAPS_FIELDS.join(',')} FROM clients WHERE id = ?`).get(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({ maps_info: client });
  } catch (err) { next(err); }
}

export function updateMapsInfo(req, res, next) {
  try {
    const { id } = req.params;
    const sets = [];
    const vals = [];
    for (const f of MAPS_FIELDS) {
      if (req.body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
    sets.push("updated_at = datetime('now')");
    vals.push(id);
    db.prepare(`UPDATE clients SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    const updated = db.prepare(`SELECT ${MAPS_FIELDS.join(',')} FROM clients WHERE id = ?`).get(id);
    res.json({ maps_info: updated });
  } catch (err) { next(err); }
}

export function getStatsOverview(req, res, next) {
  try {
    const total    = db.prepare("SELECT COUNT(*) as c FROM clients").get().c;
    const active   = db.prepare("SELECT COUNT(*) as c FROM clients WHERE status='active'").get().c;
    const inactive = db.prepare("SELECT COUNT(*) as c FROM clients WHERE status='inactive'").get().c;
    const draft    = db.prepare("SELECT COUNT(*) as c FROM clients WHERE status IN ('draft','paused')").get().c;
    const missing  = db.prepare("SELECT COUNT(*) as c FROM clients WHERE profile_completion_score < 60 AND status='active'").get().c;

    const needingPosts = db.prepare(`
      SELECT COUNT(*) as c FROM clients c WHERE c.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM gbp_posts p WHERE p.client_id = c.id
        AND strftime('%Y-%m', p.created_at) = strftime('%Y-%m','now')
      )
    `).get().c;

    const paymentDueSoon = db.prepare(`
      SELECT COUNT(*) as c FROM client_billing
      WHERE next_due_date BETWEEN date('now') AND date('now','+7 days')
      AND payment_status != 'paid'
    `).get().c;

    const paymentOverdue = db.prepare(`
      SELECT COUNT(*) as c FROM client_billing
      WHERE date(next_due_date) < date('now') AND payment_status != 'paid'
    `).get().c;

    res.json({ total, active, inactive, draft, missing_details: missing,
               needing_posts: needingPosts, payment_due_soon: paymentDueSoon, payment_overdue: paymentOverdue });
  } catch (err) { next(err); }
}

export function calculateScore(req, res, next) {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM clients WHERE id = ?').get(id)) {
      return res.status(404).json({ error: 'Client not found' });
    }
    const score = computeScore(id);
    db.prepare('UPDATE clients SET profile_completion_score = ? WHERE id = ?').run(score, id);
    res.json({ profile_completion_score: score });
  } catch (err) { next(err); }
}

export function uploadClientLogo(req, res, next) {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM clients WHERE id = ?').get(id)) {
      return res.status(404).json({ error: 'Client not found' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const logo_url = `/uploads/${req.file.filename}`;
    db.prepare("UPDATE clients SET logo_url = ?, updated_at = datetime('now') WHERE id = ?").run(logo_url, id);
    res.json({ logo_url });
  } catch (err) { next(err); }
}

