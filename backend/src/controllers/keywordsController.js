import db from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { generateKeywords as aiGenerateKeywords } from '../services/aiService.js';
import { logActivity } from '../services/activityService.js';

export function getKeywords(req, res, next) {
  try {
    const { clientId } = req.params;
    const { search, difficulty, selected, page = 1, limit = 100 } = req.query;
    const lim    = Math.min(parseInt(limit) || 100, 200);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * lim;

    const where  = ['client_id = ?'];
    const params = [clientId];
    if (search)     { where.push('keyword LIKE ?');  params.push(`%${search}%`); }
    if (difficulty) { where.push('difficulty = ?');   params.push(difficulty); }
    if (selected === 'true' || selected === '1') { where.push('selected = 1'); }

    const w     = where.join(' AND ');
    const total = db.prepare(`SELECT COUNT(*) as c FROM keywords WHERE ${w}`).get(...params).c;
    const rows  = db.prepare(`
      SELECT * FROM keywords WHERE ${w}
      ORDER BY
        CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, lim, offset);

    const selectedCount = db.prepare('SELECT COUNT(*) as c FROM keywords WHERE client_id = ? AND selected = 1').get(clientId).c;
    res.json({ keywords: rows, total, selected_count: selectedCount, page: parseInt(page) || 1, limit: lim });
  } catch (err) { next(err); }
}

export async function generateKeywordsForClient(req, res, next) {
  try {
    const { clientId } = req.params;
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const seoDetails = db.prepare('SELECT * FROM client_seo WHERE client_id = ?').get(clientId);
    const keywords   = await aiGenerateKeywords(client, seoDetails);

    if (!Array.isArray(keywords)) {
      return res.status(422).json(keywords.error ? keywords : { error: 'AI returned unexpected format' });
    }

    const insert = db.prepare(`
      INSERT OR IGNORE INTO keywords
        (id, client_id, keyword, volume, difficulty, intent, priority, ai_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAll = db.transaction(kws => {
      const inserted = [];
      for (const k of kws) {
        if (!k.keyword?.trim()) continue;
        const id  = uuidv4();
        const vol = k.competition_level === 'high' ? 1000 : k.competition_level === 'medium' ? 500 : 100;
        insert.run(
          id, clientId,
          k.keyword.trim(), vol,
          k.competition_level || 'medium',
          k.intent            || null,
          k.priority          || null,
          k.ai_reason         || null,
        );
        inserted.push(id);
      }
      return inserted;
    });

    const ids  = insertAll(keywords);
    const saved = ids.length > 0
      ? db.prepare(`SELECT * FROM keywords WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids)
      : [];

    logActivity(req.user.id, clientId, 'AI_KEYWORDS_GENERATED', 'keyword', null, {
      business_name: client.business_name,
      count: saved.length,
    });

    res.json({ keywords: saved, count: saved.length });
  } catch (err) { next(err); }
}

export function selectKeywords(req, res, next) {
  try {
    const { clientId } = req.params;
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });

    db.prepare('UPDATE keywords SET selected = 0 WHERE client_id = ?').run(clientId);
    if (ids.length > 0) {
      const ph = ids.map(() => '?').join(',');
      db.prepare(`UPDATE keywords SET selected = 1 WHERE id IN (${ph}) AND client_id = ?`).run(...ids, clientId);
    }

    const selectedCount = db.prepare(
      'SELECT COUNT(*) as c FROM keywords WHERE client_id = ? AND selected = 1'
    ).get(clientId).c;

    logActivity(req.user?.id, clientId, 'KEYWORDS_SELECTED', 'keyword', null, {
      count: selectedCount,
    });

    res.json({ message: 'Keywords selection updated', selected_count: selectedCount });
  } catch (err) { next(err); }
}

export function addKeyword(req, res, next) {
  try {
    const { clientId } = req.params;
    const { keyword, position, volume, difficulty, intent, priority } = req.body;
    if (!keyword?.trim()) return res.status(400).json({ error: 'keyword is required' });

    const id = uuidv4();
    db.prepare(
      'INSERT INTO keywords (id, client_id, keyword, position, volume, difficulty, intent, priority, source, selected) VALUES (?, ?, ?, ?, ?, ?, ?, ?, \'manual\', 1)'
    ).run(id, clientId, keyword.trim(), position ?? null, volume ?? null, difficulty ?? null, intent ?? null, priority ?? null);
    res.status(201).json({ keyword: db.prepare('SELECT * FROM keywords WHERE id = ?').get(id) });
  } catch (err) { next(err); }
}

export function bulkAddKeywords(req, res, next) {
  try {
    const { clientId } = req.params;
    const { keywords } = req.body;
    if (!Array.isArray(keywords) || !keywords.length) {
      return res.status(400).json({ error: 'keywords array is required' });
    }

    const insert = db.prepare(
      'INSERT OR IGNORE INTO keywords (id, client_id, keyword, position, volume, difficulty) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertMany = db.transaction(kws => {
      const inserted = [];
      for (const k of kws) {
        if (!k.keyword?.trim()) continue;
        const id = uuidv4();
        insert.run(id, clientId, k.keyword.trim(), k.position ?? null, k.volume ?? null, k.difficulty ?? null);
        inserted.push(id);
      }
      return inserted;
    });

    const ids  = insertMany(keywords);
    const saved = db.prepare(`SELECT * FROM keywords WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids);
    res.status(201).json({ keywords: saved, count: saved.length });
  } catch (err) { next(err); }
}

export function updateKeyword(req, res, next) {
  try {
    const { id } = req.params;
    const kw = db.prepare('SELECT id FROM keywords WHERE id = ?').get(id);
    if (!kw) return res.status(404).json({ error: 'Keyword not found' });

    const sets = [];
    const vals = [];
    for (const f of ['keyword','position','volume','difficulty','intent','priority','selected']) {
      if (req.body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(req.body[f]); }
    }
    sets.push("tracked_at = datetime('now')");
    vals.push(id);
    db.prepare(`UPDATE keywords SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    res.json({ keyword: db.prepare('SELECT * FROM keywords WHERE id = ?').get(id) });
  } catch (err) { next(err); }
}

export function deleteKeyword(req, res, next) {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM keywords WHERE id = ?').get(id)) {
      return res.status(404).json({ error: 'Keyword not found' });
    }
    db.prepare('DELETE FROM keywords WHERE id = ?').run(id);
    res.json({ message: 'Keyword deleted' });
  } catch (err) { next(err); }
}
