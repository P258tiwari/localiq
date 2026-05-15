import jwt from 'jsonwebtoken';
import db from '../db/index.js';

export function verifyToken(req, res, next) {
  const token = req.cookies?.token
    ?? req.headers.authorization?.replace('Bearer ', '');

  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare(
      'SELECT id, name, email, role, photo_url, status FROM users WHERE id = ?'
    ).get(userId);

    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

export function requireMember(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!['admin', 'member'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
}

// Aliases for older route files during migration
export const authenticate = verifyToken;
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};
