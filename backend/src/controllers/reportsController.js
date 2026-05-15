import db from '../db/index.js';

function safeJSON(v, fallback) {
  try { return JSON.parse(v || 'null') ?? fallback; } catch { return fallback; }
}

/**
 * GET /api/reports/client/:client_id
 * Returns a full JSON summary for a client covering the current month.
 */
export function getClientReport(req, res, next) {
  try {
    const { client_id } = req.params;

    const client = db.prepare(`
      SELECT c.*, u.name AS assigned_user_name
      FROM clients c
      LEFT JOIN users u ON u.id = c.assigned_to
      WHERE c.id = ?
    `).get(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const month        = new Date().toISOString().slice(0, 7);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                            .toISOString()
                            .slice(0, 10);

    // ── Posts this month ───────────────────────────────────────────────────────
    const posts = db.prepare(`
      SELECT
        COUNT(*)                                        AS total,
        COUNT(CASE WHEN status = 'published' THEN 1 END) AS published,
        COUNT(CASE WHEN status = 'draft'     THEN 1 END) AS draft,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) AS scheduled,
        COUNT(CASE WHEN status = 'failed'    THEN 1 END) AS failed
      FROM gbp_posts
      WHERE client_id = ? AND strftime('%Y-%m', created_at) = ?
    `).get(client_id, month);

    // ── Keywords ───────────────────────────────────────────────────────────────
    const keywordStats = db.prepare(`
      SELECT
        COUNT(*)                                               AS total,
        COUNT(CASE WHEN difficulty = 'high'   THEN 1 END)    AS high,
        COUNT(CASE WHEN difficulty = 'medium' THEN 1 END)    AS medium,
        COUNT(CASE WHEN difficulty = 'low'    THEN 1 END)    AS low
      FROM keywords WHERE client_id = ?
    `).get(client_id);

    // ── Billing ────────────────────────────────────────────────────────────────
    const billing = db.prepare(
      'SELECT plan_name, monthly_amount, billing_cycle, payment_status, next_due_date FROM client_billing WHERE client_id = ?'
    ).get(client_id);

    // Most recent payment
    const lastPayment = db.prepare(
      'SELECT amount, payment_date, payment_method FROM payment_history WHERE client_id = ? ORDER BY payment_date DESC LIMIT 1'
    ).get(client_id);

    // ── Reviews this month ─────────────────────────────────────────────────────
    const reviews = db.prepare(`
      SELECT
        COUNT(*)                                               AS total,
        ROUND(AVG(rating), 1)                                  AS avg_rating,
        COUNT(CASE WHEN reply_status = 'replied' THEN 1 END)  AS replied,
        COUNT(CASE WHEN reply_status = 'pending' THEN 1 END)  AS pending,
        COUNT(CASE WHEN rating >= 4              THEN 1 END)  AS positive,
        COUNT(CASE WHEN rating <= 2              THEN 1 END)  AS negative
      FROM reviews
      WHERE client_id = ? AND strftime('%Y-%m', created_at) = ?
    `).get(client_id, month);

    // All-time review totals
    const reviewsAllTime = db.prepare(`
      SELECT COUNT(*) AS total, ROUND(AVG(rating),1) AS avg_rating
      FROM reviews WHERE client_id = ?
    `).get(client_id);

    // ── SEO ────────────────────────────────────────────────────────────────────
    const seo = db.prepare('SELECT * FROM client_seo WHERE client_id = ?').get(client_id);
    if (seo) seo.target_keywords = safeJSON(seo.target_keywords, []);

    // ── Activity log — last 30 days ────────────────────────────────────────────
    const activityLog = db.prepare(`
      SELECT al.action, al.entity_type, al.created_at, al.details, u.name AS user_name
      FROM activity_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.client_id = ? AND date(al.created_at) >= ?
      ORDER BY al.created_at DESC
      LIMIT 50
    `).all(client_id, thirtyDaysAgo).map(row => ({
      ...row,
      details: safeJSON(row.details, {}),
    }));

    res.json({
      generated_at: new Date().toISOString(),
      month,
      client: {
        id:                      client.id,
        business_name:           client.business_name,
        client_name:             client.client_name,
        category:                client.category,
        city:                    client.city,
        state:                   client.state,
        status:                  client.status,
        profile_completion_score: client.profile_completion_score,
        assigned_user:           client.assigned_user_name,
      },
      posts: {
        this_month: posts,
      },
      keywords: keywordStats,
      billing: billing
        ? { ...billing, last_payment: lastPayment ?? null }
        : null,
      reviews: {
        this_month:  reviews,
        all_time:    reviewsAllTime,
      },
      optimization_score: client.profile_completion_score ?? 0,
      seo_score:          seo?.seo_score ?? 0,
      seo,
      activity_log: activityLog,
    });
  } catch (err) { next(err); }
}
