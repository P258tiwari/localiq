import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
};

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = db.prepare(
      "SELECT * FROM users WHERE email = ? AND status = 'active'"
    ).get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.cookie('token', token, COOKIE_OPTS);
    res.json({ user: sanitize(user), token });
  } catch (err) {
    next(err);
  }
}

export function logout(req, res) {
  res.clearCookie('token', COOKIE_OPTS);
  res.json({ message: 'Logged out' });
}

export function getMe(req, res, next) {
  try {
    const user = db.prepare(
      'SELECT id, name, email, role, photo_url, status, created_at FROM users WHERE id = ?'
    ).get(req.user.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(hash, req.user.id);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
}

function sanitize(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, photo_url: u.photo_url };
}
