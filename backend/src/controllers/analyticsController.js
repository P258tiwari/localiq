import db from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

export function getDashboardStats(req, res, next) {
  try {
    const month = new Date().toISOString().slice(0, 7);

    const activeClients   = db.prepare("SELECT COUNT(*) as c FROM clients WHERE status='active'").get().c;
    const totalClients    = db.prepare("SELECT COUNT(*) as c FROM clients").get().c;
    const inactiveClients = db.prepare("SELECT COUNT(*) as c FROM clients WHERE status='inactive'").get().c;
    const pendingReplies  = db.prepare("SELECT COUNT(*) as c FROM reviews WHERE reply_status='pending'").get().c;
    const postsThisMonth  = db.prepare("SELECT COUNT(*) as c FROM gbp_posts WHERE strftime('%Y-%m', created_at)=?").get(month).c;
    const newClientsThisMonth = db.prepare("SELECT COUNT(*) as c FROM clients WHERE strftime('%Y-%m', created_at)=?").get(month).c;
    const totalPaymentThisMonth = db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM payment_history WHERE strftime('%Y-%m', payment_date)=?").get(month).v;
    const overdueCount    = db.prepare("SELECT COUNT(*) as c FROM client_billing WHERE payment_status='overdue'").get().c;
    const totalMRR        = db.prepare("SELECT COALESCE(ROUND(SUM(monthly_amount),0),0) as v FROM client_billing cb INNER JOIN clients c ON c.id=cb.client_id WHERE c.status='active'").get().v;

    // Monthly revenue for last 12 months
    const now = new Date();
    const monthlyRevenue = [];
    for (let i = 11; i >= 0; i--) {
      const d  = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const rev = db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM payment_history WHERE strftime('%Y-%m', payment_date)=?").get(ym).v;
      monthlyRevenue.push({ month: ym, revenue: Number(rev) });
    }

    // Upcoming payments (non-paid, active clients, ordered by due date)
    const upcomingPayments = db.prepare(`
      SELECT c.id as client_id, c.business_name, c.city,
        cb.monthly_amount, cb.next_due_date, cb.payment_status
      FROM client_billing cb
      JOIN clients c ON c.id = cb.client_id
      WHERE c.status = 'active' AND cb.payment_status != 'paid'
        AND (cb.next_due_date IS NOT NULL OR cb.payment_status = 'overdue')
      ORDER BY
        CASE cb.payment_status WHEN 'overdue' THEN 0 ELSE 1 END,
        cb.next_due_date ASC
      LIMIT 8
    `).all();

    res.json({
      active_clients: activeClients,
      total_clients: totalClients,
      inactive_clients: inactiveClients,
      pending_replies: pendingReplies,
      posts_this_month: postsThisMonth,
      new_clients_this_month: newClientsThisMonth,
      total_payment_this_month: totalPaymentThisMonth,
      overdue_count: overdueCount,
      total_mrr: totalMRR,
      monthly_revenue: monthlyRevenue,
      upcoming_payments: upcomingPayments,
    });
  } catch (err) { next(err); }
}

export function getClientAnalytics(req, res, next) {
  try {
    const { client_id, start_date, end_date } = req.query;
    if (!client_id) return res.status(400).json({ error: 'client_id required' });

    const where  = ['client_id = ?'];
    const params = [client_id];
    if (start_date) { where.push('date >= ?'); params.push(start_date); }
    if (end_date)   { where.push('date <= ?'); params.push(end_date); }

    const w   = where.join(' AND ');
    const rows = db.prepare(`SELECT * FROM analytics WHERE ${w} ORDER BY date ASC`).all(...params);

    const totals = db.prepare(`
      SELECT
        SUM(views_search) as total_views_search,
        SUM(views_maps) as total_views_maps,
        SUM(clicks_website) as total_clicks_website,
        SUM(clicks_phone) as total_clicks_phone,
        SUM(clicks_directions) as total_clicks_directions,
        SUM(photo_views) as total_photo_views,
        SUM(new_reviews) as total_new_reviews,
        ROUND(AVG(CASE WHEN avg_rating IS NOT NULL THEN avg_rating END),1) as avg_rating
      FROM analytics WHERE ${w}
    `).get(...params);

    res.json({ analytics: rows, totals });
  } catch (err) { next(err); }
}

export function upsertAnalytics(req, res, next) {
  try {
    const { client_id, date, views_search, views_maps, clicks_website, clicks_phone,
            clicks_directions, photo_views, new_reviews, avg_rating } = req.body;

    if (!client_id) return res.status(400).json({ error: 'client_id required' });
    if (!date)      return res.status(400).json({ error: 'date required' });

    const existing = db.prepare('SELECT id FROM analytics WHERE client_id=? AND date=?').get(client_id, date);

    if (existing) {
      db.prepare(`
        UPDATE analytics SET views_search=?, views_maps=?, clicks_website=?, clicks_phone=?,
          clicks_directions=?, photo_views=?, new_reviews=?, avg_rating=? WHERE id=?
      `).run(views_search ?? 0, views_maps ?? 0, clicks_website ?? 0, clicks_phone ?? 0,
             clicks_directions ?? 0, photo_views ?? 0, new_reviews ?? 0, avg_rating ?? null, existing.id);
    } else {
      db.prepare(`
        INSERT INTO analytics (id, client_id, date, views_search, views_maps, clicks_website, clicks_phone,
                               clicks_directions, photo_views, new_reviews, avg_rating)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), client_id, date, views_search ?? 0, views_maps ?? 0, clicks_website ?? 0,
             clicks_phone ?? 0, clicks_directions ?? 0, photo_views ?? 0, new_reviews ?? 0, avg_rating ?? null);
    }

    const row = db.prepare('SELECT * FROM analytics WHERE client_id=? AND date=?').get(client_id, date);
    res.json({ analytics: row });
  } catch (err) { next(err); }
}
