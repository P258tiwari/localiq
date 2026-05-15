import db from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

export function getTeamAssignments(req, res, next) {
  try {
    const { client_id } = req.params;
    const assignments = db.prepare(`
      SELECT ta.*, u.name as user_name, u.email as user_email, u.photo_url
      FROM team_assignments ta
      JOIN users u ON u.id = ta.user_id
      WHERE ta.client_id = ?
      ORDER BY ta.assigned_at
    `).all(client_id);
    res.json({ assignments });
  } catch (err) { next(err); }
}

export function assignUser(req, res, next) {
  try {
    const { client_id } = req.params;
    const { user_id, role = 'handler' } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const existing = db.prepare('SELECT id FROM team_assignments WHERE client_id=? AND user_id=?').get(client_id, user_id);
    if (existing) return res.status(409).json({ error: 'User already assigned to this client' });

    const id = uuidv4();
    db.prepare('INSERT INTO team_assignments (id, client_id, user_id, role) VALUES (?, ?, ?, ?)')
      .run(id, client_id, user_id, role);

    // Keep assigned_to in sync (primary assignee)
    const count = db.prepare('SELECT COUNT(*) as c FROM team_assignments WHERE client_id=?').get(client_id).c;
    if (count === 1) {
      db.prepare("UPDATE clients SET assigned_to=?, updated_at=datetime('now') WHERE id=?").run(user_id, client_id);
    }

    const assignment = db.prepare(`
      SELECT ta.*, u.name as user_name, u.email as user_email FROM team_assignments ta
      JOIN users u ON u.id=ta.user_id WHERE ta.id=?
    `).get(id);
    res.status(201).json({ assignment });
  } catch (err) { next(err); }
}

export function removeAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const assignment = db.prepare('SELECT * FROM team_assignments WHERE id=?').get(id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    db.prepare('DELETE FROM team_assignments WHERE id=?').run(id);
    res.json({ message: 'Assignment removed' });
  } catch (err) { next(err); }
}

export function getUserClients(req, res, next) {
  try {
    const { user_id } = req.params;
    const clients = db.prepare(`
      SELECT c.id, c.business_name, c.client_name, c.city, c.status, c.profile_completion_score,
        ta.role as assignment_role, ta.assigned_at
      FROM team_assignments ta
      JOIN clients c ON c.id = ta.client_id
      WHERE ta.user_id = ?
      ORDER BY ta.assigned_at DESC
    `).all(user_id);
    res.json({ clients });
  } catch (err) { next(err); }
}

export function updateAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'role is required' });
    const assignment = db.prepare('SELECT id FROM team_assignments WHERE id=?').get(id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    db.prepare('UPDATE team_assignments SET role=? WHERE id=?').run(role, id);
    res.json({ assignment: db.prepare('SELECT * FROM team_assignments WHERE id=?').get(id) });
  } catch (err) { next(err); }
}
