import db from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Insert a notification for a user.
 * type: 'payment_due' | 'post_pending' | 'ai_ready' | 'team' | 'system'
 */
export function createNotification({ user_id, client_id = null, type, title, message = null }) {
  try {
    db.prepare(`
      INSERT INTO notifications (id, user_id, client_id, type, title, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), user_id, client_id ?? null, type, title, message ?? null);
  } catch (e) {
    console.error('[notificationService] createNotification error:', e.message);
  }
}

/**
 * Query active clients with billing and create payment-due notifications
 * for 7-day, 3-day, today, and overdue thresholds.
 * Called by daily cron job.
 */
export function checkPaymentDueDates() {
  try {
    const admins = db.prepare(
      "SELECT id FROM users WHERE status='active' AND role='admin'"
    ).all();
    if (!admins.length) return;

    const clients = db.prepare(`
      SELECT c.id, c.business_name, c.assigned_to,
             cb.next_due_date, cb.monthly_amount, cb.plan_name, cb.payment_status
      FROM clients c
      JOIN client_billing cb ON cb.client_id = c.id
      WHERE c.status = 'active'
        AND cb.next_due_date IS NOT NULL
        AND cb.payment_status != 'paid'
    `).all();

    const todayMs = new Date().setHours(0, 0, 0, 0);

    for (const client of clients) {
      if (!client.next_due_date) continue;

      const dueMs   = new Date(client.next_due_date).setHours(0, 0, 0, 0);
      const diffDays = Math.round((dueMs - todayMs) / 86_400_000);
      const amt      = `₹${Number(client.monthly_amount).toLocaleString('en-IN')}`;

      let notif = null;

      if (diffDays < 0) {
        notif = {
          type: 'payment_due',
          title: `Overdue: ${client.business_name}`,
          message: `${amt} was due on ${client.next_due_date}. Please collect payment.`,
        };
      } else if (diffDays === 0) {
        notif = {
          type: 'payment_due',
          title: `Payment Due Today: ${client.business_name}`,
          message: `${amt} is due today for ${client.plan_name || 'their plan'}.`,
        };
      } else if (diffDays === 3) {
        notif = {
          type: 'payment_due',
          title: `Due in 3 Days: ${client.business_name}`,
          message: `${amt} is due on ${client.next_due_date}.`,
        };
      } else if (diffDays === 7) {
        notif = {
          type: 'payment_due',
          title: `Due in 7 Days: ${client.business_name}`,
          message: `${amt} is due on ${client.next_due_date}.`,
        };
      }

      if (!notif) continue;

      const userIds = new Set(admins.map(a => a.id));
      if (client.assigned_to) userIds.add(client.assigned_to);

      for (const user_id of userIds) {
        createNotification({ ...notif, user_id, client_id: client.id });
      }
    }

    console.log(`[Cron] checkPaymentDueDates: processed ${clients.length} clients.`);
  } catch (e) {
    console.error('[Cron] checkPaymentDueDates error:', e.message);
  }
}

/**
 * Check which active clients have no posts for the current month.
 * Creates a single consolidated notification per user.
 * Called by weekly Monday cron job.
 */
export function checkClientsNeedingPosts() {
  try {
    const admins = db.prepare(
      "SELECT id FROM users WHERE status='active' AND role='admin'"
    ).all();
    if (!admins.length) return;

    const month = new Date().toISOString().slice(0, 7);

    const clientsWithoutPosts = db.prepare(`
      SELECT c.id, c.business_name, c.assigned_to
      FROM clients c
      WHERE c.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM gbp_posts p
          WHERE p.client_id = c.id
            AND strftime('%Y-%m', p.created_at) = ?
        )
    `).all(month);

    if (!clientsWithoutPosts.length) {
      console.log('[Cron] checkClientsNeedingPosts: all clients have posts this month.');
      return;
    }

    const names = clientsWithoutPosts.slice(0, 3).map(c => c.business_name).join(', ');
    const extra = clientsWithoutPosts.length > 3
      ? ` +${clientsWithoutPosts.length - 3} more`
      : '';
    const title   = `${clientsWithoutPosts.length} client${clientsWithoutPosts.length > 1 ? 's' : ''} need posts this month`;
    const message = `${names}${extra} have no posts for ${month}. Generate AI posts to stay on schedule.`;

    const userIds = new Set(admins.map(a => a.id));
    for (const c of clientsWithoutPosts) {
      if (c.assigned_to) userIds.add(c.assigned_to);
    }

    for (const user_id of userIds) {
      createNotification({ user_id, type: 'post_pending', title, message });
    }

    console.log(`[Cron] checkClientsNeedingPosts: ${clientsWithoutPosts.length} clients need posts.`);
  } catch (e) {
    console.error('[Cron] checkClientsNeedingPosts error:', e.message);
  }
}
