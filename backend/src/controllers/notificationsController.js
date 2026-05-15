import db from '../db/index.js';
import { createNotification } from '../services/notificationService.js';

export { createNotification };

export function getNotifications(req, res, next) {
  try {
    const { page = 1, limit = 30, unread_only } = req.query;
    const lim    = Math.min(parseInt(limit) || 30, 100);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * lim;

    const where  = ['user_id = ?'];
    const params = [req.user.id];
    if (unread_only === 'true' || unread_only === '1') { where.push('is_read = 0'); }

    const w      = where.join(' AND ');
    const total  = db.prepare(`SELECT COUNT(*) as c FROM notifications WHERE ${w}`).get(...params).c;
    const unread = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND is_read=0').get(req.user.id).c;
    const rows   = db.prepare(
      `SELECT n.*, c.business_name AS client_name
       FROM notifications n
       LEFT JOIN clients c ON c.id = n.client_id
       WHERE ${w} ORDER BY n.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, lim, offset);

    res.json({ notifications: rows, total, unread, page: parseInt(page) || 1, limit: lim });
  } catch (err) { next(err); }
}

export function markRead(req, res, next) {
  try {
    db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?')
      .run(req.params.id, req.user.id);
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
}

export function markAllRead(req, res, next) {
  try {
    db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { next(err); }
}

export function deleteNotification(req, res, next) {
  try {
    db.prepare('DELETE FROM notifications WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
    res.json({ message: 'Notification deleted' });
  } catch (err) { next(err); }
}
