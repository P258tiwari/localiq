import db from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const NOTE_TYPES = ['general', 'strategy', 'feedback', 'task'];

export function getNotes(req, res, next) {
  try {
    const { clientId } = req.params;
    const notes = db.prepare(`
      SELECT cn.*, u.name AS author_name
      FROM content_notes cn
      LEFT JOIN users u ON u.id = cn.user_id
      WHERE cn.client_id = ?
      ORDER BY cn.created_at DESC
    `).all(clientId);
    res.json({ notes });
  } catch (err) { next(err); }
}

export function addNote(req, res, next) {
  try {
    const { clientId } = req.params;
    const { note_text, note_type = 'general' } = req.body;

    if (!note_text?.trim()) return res.status(400).json({ error: 'note_text is required' });
    if (!NOTE_TYPES.includes(note_type)) return res.status(400).json({ error: `note_type must be one of: ${NOTE_TYPES.join(', ')}` });

    const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO content_notes (id, client_id, user_id, note_text, note_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, clientId, req.user.id, note_text.trim(), note_type);

    const note = db.prepare(`
      SELECT cn.*, u.name AS author_name
      FROM content_notes cn
      LEFT JOIN users u ON u.id = cn.user_id
      WHERE cn.id = ?
    `).get(id);

    res.status(201).json({ note });
  } catch (err) { next(err); }
}

export function deleteNote(req, res, next) {
  try {
    const { noteId } = req.params;
    const note = db.prepare('SELECT id FROM content_notes WHERE id = ?').get(noteId);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    db.prepare('DELETE FROM content_notes WHERE id = ?').run(noteId);
    res.json({ message: 'Note deleted' });
  } catch (err) { next(err); }
}
