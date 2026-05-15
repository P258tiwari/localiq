import db from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { recommendCategories } from '../services/aiService.js';

export function getCategories(req, res, next) {
  try {
    const { search, industry, page = 1, limit = 50 } = req.query;
    const lim    = Math.min(parseInt(limit) || 50, 200);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * lim;

    const where  = ['1=1'];
    const params = [];
    if (search)   { where.push('(LOWER(name) LIKE LOWER(?) OR LOWER(industry) LIKE LOWER(?))'); params.push(`%${search}%`, `%${search}%`); }
    if (industry) { where.push('LOWER(industry) = LOWER(?)'); params.push(industry); }

    const w       = where.join(' AND ');
    const total   = db.prepare(`SELECT COUNT(*) as c FROM gbp_categories WHERE ${w}`).get(...params).c;
    const categories = db.prepare(
      `SELECT * FROM gbp_categories WHERE ${w} ORDER BY name LIMIT ? OFFSET ?`
    ).all(...params, lim, offset);

    const industries = db.prepare('SELECT DISTINCT industry FROM gbp_categories ORDER BY industry').all().map(r => r.industry);
    res.json({ categories, total, industries, page: parseInt(page) || 1, limit: lim });
  } catch (err) { next(err); }
}

export function createCategory(req, res, next) {
  try {
    const { name, industry } = req.body;
    if (!name?.trim())     return res.status(400).json({ error: 'name is required' });
    if (!industry?.trim()) return res.status(400).json({ error: 'industry is required' });

    const exists = db.prepare('SELECT id FROM gbp_categories WHERE LOWER(name)=LOWER(?)').get(name.trim());
    if (exists) return res.status(409).json({ error: 'Category already exists' });

    const id = uuidv4();
    db.prepare('INSERT INTO gbp_categories (id, name, industry) VALUES (?, ?, ?)').run(id, name.trim(), industry.trim());
    res.status(201).json({ category: db.prepare('SELECT * FROM gbp_categories WHERE id=?').get(id) });
  } catch (err) { next(err); }
}

export function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM gbp_categories WHERE id=?').get(id)) {
      return res.status(404).json({ error: 'Category not found' });
    }
    const { name, industry } = req.body;
    const sets = [];
    const vals = [];
    if (name)     { sets.push('name = ?');     vals.push(name.trim()); }
    if (industry) { sets.push('industry = ?'); vals.push(industry.trim()); }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(id);
    db.prepare(`UPDATE gbp_categories SET ${sets.join(', ')} WHERE id=?`).run(...vals);
    res.json({ category: db.prepare('SELECT * FROM gbp_categories WHERE id=?').get(id) });
  } catch (err) { next(err); }
}

export function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM gbp_categories WHERE id=?').get(id)) {
      return res.status(404).json({ error: 'Category not found' });
    }
    db.prepare('DELETE FROM gbp_categories WHERE id=?').run(id);
    res.json({ message: 'Category deleted' });
  } catch (err) { next(err); }
}

export async function recommendForClient(req, res, next) {
  try {
    const { client_id } = req.params;
    const client = db.prepare('SELECT * FROM clients WHERE id=?').get(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const allCats = db.prepare('SELECT * FROM gbp_categories ORDER BY name').all();
    const recommended = await recommendCategories(client, allCats);

    const matched = allCats.filter(c => recommended.includes(c.name));
    res.json({ recommendations: matched, raw: recommended });
  } catch (err) { next(err); }
}
