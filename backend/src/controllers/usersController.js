import db from '../db/index.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export function getUsers(req, res, next) {
  try {
    const { status, role, search, page = 1, limit = 50 } = req.query;
    const lim    = Math.min(parseInt(limit) || 50, 100);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * lim;

    const where  = ['1=1'];
    const params = [];
    if (status) { where.push('status = ?');              params.push(status); }
    if (role)   { where.push('role = ?');                params.push(role); }
    if (search) { where.push('(name LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

    const w     = where.join(' AND ');
    const total = db.prepare(`SELECT COUNT(*) as c FROM users WHERE ${w}`).get(...params).c;
    const users = db.prepare(
      `SELECT id, name, email, role, photo_url, status, created_at, updated_at FROM users WHERE ${w} ORDER BY name LIMIT ? OFFSET ?`
    ).all(...params, lim, offset);

    res.json({ users, total, page: parseInt(page) || 1, limit: lim });
  } catch (err) { next(err); }
}

export async function createUser(req, res, next) {
  try {
    const { name, email, password, role = 'member' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
    if (!['admin','member'].includes(role)) return res.status(400).json({ error: 'role must be admin or member' });

    if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const id   = uuidv4();
    const hash = await bcrypt.hash(password, 12);
    db.prepare(
      'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
    ).run(id, name.trim(), email.toLowerCase().trim(), hash, role);

    res.status(201).json({
      user: db.prepare('SELECT id, name, email, role, status, created_at FROM users WHERE id=?').get(id)
    });
  } catch (err) { next(err); }
}

export function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM users WHERE id=?').get(id)) {
      return res.status(404).json({ error: 'User not found' });
    }
    const sets = [];
    const vals = [];
    const allowed = ['name','role','status','photo_url'];
    for (const f of allowed) {
      if (req.body[f] !== undefined) { sets.push(`${f}=?`); vals.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
    sets.push("updated_at=datetime('now')");
    vals.push(id);
    db.prepare(`UPDATE users SET ${sets.join(',')} WHERE id=?`).run(...vals);
    res.json({ user: db.prepare('SELECT id,name,email,role,status,photo_url,updated_at FROM users WHERE id=?').get(id) });
  } catch (err) { next(err); }
}

export function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot deactivate yourself' });
    if (!db.prepare('SELECT id FROM users WHERE id=?').get(id)) {
      return res.status(404).json({ error: 'User not found' });
    }
    db.prepare("UPDATE users SET status='inactive', updated_at=datetime('now') WHERE id=?").run(id);
    res.json({ message: 'User deactivated' });
  } catch (err) { next(err); }
}
