import db from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

export function logActivity(userId, clientId, action, entityType = null, entityId = null, details = {}) {
  try {
    db.prepare(`
      INSERT INTO activity_logs (id, user_id, client_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), userId ?? null, clientId ?? null, action, entityType, entityId, JSON.stringify(details));
  } catch (e) {
    console.error('logActivity error:', e.message);
  }
}
