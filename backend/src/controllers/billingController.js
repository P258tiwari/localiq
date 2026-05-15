import db from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../services/activityService.js';
import { createNotification } from '../services/notificationService.js';

export function getBilling(req, res, next) {
  try {
    const billing = db.prepare('SELECT * FROM client_billing WHERE client_id = ?').get(req.params.clientId);
    res.json({ billing: billing || null });
  } catch (err) { next(err); }
}

export function upsertBilling(req, res, next) {
  try {
    const { clientId } = req.params;
    const body = req.body;

    const existing = db.prepare('SELECT * FROM client_billing WHERE client_id = ?').get(clientId);
    if (existing) {
      // Partial update — only overwrite fields explicitly present in request body
      const FIELDS = ['plan_name', 'monthly_amount', 'billing_cycle', 'next_due_date', 'payment_status', 'notes', 'start_date'];
      const sets   = [];
      const vals   = [];
      for (const f of FIELDS) {
        if (Object.prototype.hasOwnProperty.call(body, f)) {
          sets.push(`${f} = ?`);
          vals.push(body[f] ?? null);
        }
      }
      if (sets.length > 0) {
        sets.push("updated_at = datetime('now')");
        db.prepare(`UPDATE client_billing SET ${sets.join(', ')} WHERE client_id = ?`).run(...vals, clientId);
      }
    } else {
      db.prepare(`
        INSERT INTO client_billing (id, client_id, plan_name, monthly_amount, billing_cycle, next_due_date, payment_status, notes, start_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), clientId,
             body.plan_name ?? null, body.monthly_amount ?? 0, body.billing_cycle ?? 'monthly',
             body.next_due_date ?? null, body.payment_status ?? 'pending', body.notes ?? null, body.start_date ?? null);
    }
    const billing = db.prepare('SELECT * FROM client_billing WHERE client_id = ?').get(clientId);
    res.json({ billing });
  } catch (err) { next(err); }
}

export function getPayments(req, res, next) {
  try {
    const { clientId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const lim    = Math.min(parseInt(limit) || 20, 100);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * lim;
    const total  = db.prepare('SELECT COUNT(*) as c FROM payment_history WHERE client_id = ?').get(clientId).c;
    const payments = db.prepare(
      'SELECT * FROM payment_history WHERE client_id = ? ORDER BY payment_date DESC LIMIT ? OFFSET ?'
    ).all(clientId, lim, offset);
    res.json({ payments, total, page: parseInt(page) || 1, limit: lim });
  } catch (err) { next(err); }
}

export function addPayment(req, res, next) {
  try {
    const { clientId } = req.params;
    const { amount, payment_date, payment_method, reference_no, notes } = req.body;
    if (!amount || !payment_date) return res.status(400).json({ error: 'amount and payment_date required' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO payment_history (id, client_id, amount, payment_date, payment_method, reference_no, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, clientId, amount, payment_date, payment_method ?? null, reference_no ?? null, notes ?? null);

    // Update billing payment_status to 'paid' if this payment covers the due amount
    db.prepare("UPDATE client_billing SET payment_status='paid', updated_at=datetime('now') WHERE client_id=?").run(clientId);

    const clientRow = db.prepare('SELECT business_name, assigned_to FROM clients WHERE id=?').get(clientId);
    const amtFmt    = `₹${Number(amount).toLocaleString('en-IN')}`;

    logActivity(req.user.id, clientId, 'ADD_PAYMENT', 'payment', id, {
      amount,
      client_name: clientRow?.business_name,
    });

    // Notify all admins + assigned user about payment recorded
    const admins = db.prepare("SELECT id FROM users WHERE role='admin' AND status='active'").all();
    const userIds = new Set(admins.map(a => a.id));
    if (clientRow?.assigned_to) userIds.add(clientRow.assigned_to);
    for (const user_id of userIds) {
      createNotification({
        user_id,
        client_id: clientId,
        type:    'system',
        title:   `Payment recorded: ${clientRow?.business_name ?? clientId}`,
        message: `${amtFmt} received via ${payment_method || 'unspecified method'}.`,
      });
    }

    const payment = db.prepare('SELECT * FROM payment_history WHERE id = ?').get(id);
    res.status(201).json({ payment });
  } catch (err) { next(err); }
}

export function deletePayment(req, res, next) {
  try {
    const { id } = req.params;
    const payment = db.prepare('SELECT * FROM payment_history WHERE id = ?').get(id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    db.prepare('DELETE FROM payment_history WHERE id = ?').run(id);
    res.json({ message: 'Payment deleted' });
  } catch (err) { next(err); }
}

export function getAllClientsBilling(req, res, next) {
  try {
    const rows = db.prepare(`
      SELECT c.id AS client_id, c.business_name, c.city,
        COALESCE(cb.plan_name, 'No Plan') AS plan_name,
        COALESCE(cb.monthly_amount, 0)    AS monthly_amount,
        COALESCE(cb.payment_status, 'pending') AS payment_status,
        cb.next_due_date,
        (SELECT payment_date FROM payment_history
         WHERE client_id = c.id ORDER BY payment_date DESC LIMIT 1) AS last_paid_on
      FROM clients c
      LEFT JOIN client_billing cb ON cb.client_id = c.id
      WHERE c.status != 'inactive'
      ORDER BY
        CASE cb.payment_status WHEN 'overdue' THEN 1 WHEN 'due_soon' THEN 2 WHEN 'pending' THEN 3 ELSE 4 END,
        c.business_name
    `).all();
    res.json({ billing: rows, total: rows.length });
  } catch (err) { next(err); }
}

export function getBillingOverview(req, res, next) {
  try {
    const overdue   = db.prepare("SELECT COUNT(*) as c FROM client_billing WHERE payment_status='overdue'").get().c;
    const pending   = db.prepare("SELECT COUNT(*) as c FROM client_billing WHERE payment_status='pending'").get().c;
    const dueSoon   = db.prepare(
      "SELECT COUNT(*) as c FROM client_billing WHERE next_due_date BETWEEN date('now') AND date('now','+7 days') AND payment_status!='paid'"
    ).get().c;
    const totalMRR  = db.prepare(
      "SELECT ROUND(SUM(monthly_amount),2) as v FROM client_billing cb INNER JOIN clients c ON c.id=cb.client_id WHERE c.status='active'"
    ).get().v ?? 0;
    const overdueClients = db.prepare(`
      SELECT c.id, c.business_name, c.client_name, cb.monthly_amount, cb.next_due_date, cb.payment_status
      FROM client_billing cb
      JOIN clients c ON c.id = cb.client_id
      WHERE cb.payment_status = 'overdue'
      ORDER BY cb.next_due_date
    `).all();
    res.json({ overdue, pending, due_soon: dueSoon, total_mrr: totalMRR, overdue_clients: overdueClients });
  } catch (err) { next(err); }
}
