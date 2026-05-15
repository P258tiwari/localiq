import cron from 'node-cron';
import { checkPaymentDueDates, checkClientsNeedingPosts } from './notificationService.js';

/**
 * Initialize all scheduled cron jobs.
 * Call once after the database is ready.
 *
 * Schedule notes (IST = UTC+5:30):
 *   9:00 AM IST  = 03:30 UTC
 *   8:00 AM IST  = 02:30 UTC
 */
export function initCrons() {
  // Daily at 9:00 AM IST — check payment due dates
  cron.schedule('30 3 * * *', () => {
    console.log('[Cron] checkPaymentDueDates triggered');
    checkPaymentDueDates();
  }, { timezone: 'UTC' });

  // Every Monday at 8:00 AM IST — check which clients need posts this month
  cron.schedule('30 2 * * 1', () => {
    console.log('[Cron] checkClientsNeedingPosts triggered');
    checkClientsNeedingPosts();
  }, { timezone: 'UTC' });

  console.log('[Cron] Jobs initialized — payment check: daily 9 AM IST | post check: Monday 8 AM IST');
}
