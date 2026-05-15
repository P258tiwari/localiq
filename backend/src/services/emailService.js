import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: { user: process.env.ZOHO_EMAIL, pass: process.env.ZOHO_PASSWORD }
});

export async function sendEmail({ to, subject, html, text, related_type, related_id }) {
  const db = getDb();
  const logId = uuidv4();

  db.prepare(`
    INSERT INTO email_logs (id, to_email, subject, body, status, related_type, related_id)
    VALUES (?, ?, ?, ?, 'pending', ?, ?)
  `).run(logId, to, subject, html ?? text, related_type ?? null, related_id ?? null);

  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'GMB Dashboard'}" <${process.env.ZOHO_EMAIL}>`,
      to, subject, html, text
    });
    db.prepare('UPDATE email_logs SET status=?, sent_at=? WHERE id=?')
      .run('sent', new Date().toISOString(), logId);
  } catch (err) {
    db.prepare('UPDATE email_logs SET status=?, error=? WHERE id=?')
      .run('failed', err.message, logId);
    throw err;
  }
}

export async function sendNewReviewAlert({ review, client }) {
  if (!client.contact_email) return;
  const stars = '⭐'.repeat(review.rating);
  await sendEmail({
    to: client.contact_email,
    subject: `New ${review.rating}-star review — ${client.business_name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2>New Google Review</h2>
        <p><strong>${client.business_name}</strong></p>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0">
          <p style="font-size:20px;margin:0">${stars}</p>
          <p style="font-weight:bold;margin:8px 0 4px">${review.reviewer_name}</p>
          <p style="color:#555;margin:0">${review.comment || '(no comment)'}</p>
        </div>
        <a href="${process.env.FRONTEND_URL}/reviews"
           style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">
          Reply on Dashboard
        </a>
      </div>`,
    related_type: 'review',
    related_id: review.id
  });
}

export async function sendWeeklyReport({ client, stats, recipientEmail }) {
  await sendEmail({
    to: recipientEmail,
    subject: `Weekly GMB Report — ${client.business_name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2>Weekly Report · ${client.business_name}</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee"><strong>New Reviews</strong></td>
              <td style="text-align:right;padding:8px 0;border-bottom:1px solid #eee">${stats.newReviews ?? 0}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee"><strong>Average Rating</strong></td>
              <td style="text-align:right;padding:8px 0;border-bottom:1px solid #eee">${stats.avgRating ? Number(stats.avgRating).toFixed(1) : 'N/A'} ⭐</td></tr>
          <tr><td style="padding:8px 0"><strong>Posts Published</strong></td>
              <td style="text-align:right;padding:8px 0">${stats.postsPublished ?? 0}</td></tr>
        </table>
        <br>
        <a href="${process.env.FRONTEND_URL}"
           style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">
          View Dashboard
        </a>
      </div>`,
    related_type: 'client',
    related_id: client.id
  });
}
