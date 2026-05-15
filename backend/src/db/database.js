import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'gmb_dashboard.sqlite');

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

let db;

export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initializeDatabase() first.');
  return db;
}

export function initializeDatabase() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  createTables();
  seedAdminUser();
  console.log(`Database ready at ${DB_PATH}`);
  return db;
}

function createTables() {
  db.exec(`
    -- ─── Users (agency staff) ────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      name        TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'staff'
                    CHECK(role IN ('admin','manager','staff')),
      avatar      TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      last_login  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── Clients (one record = one GBP listing) ──────────────────────────
    CREATE TABLE IF NOT EXISTS clients (
      id                  TEXT PRIMARY KEY,
      -- Business identity
      business_name       TEXT NOT NULL,
      category            TEXT,
      industry            TEXT,
      -- Primary contact
      contact_name        TEXT,
      contact_email       TEXT,
      contact_phone       TEXT,
      -- GBP-facing details (what appears on Google)
      gbp_phone           TEXT,
      website             TEXT,
      gbp_url             TEXT,
      -- Address
      address             TEXT,
      city                TEXT,
      state               TEXT,
      pincode             TEXT,
      -- Agency management
      status              TEXT NOT NULL DEFAULT 'active'
                            CHECK(status IN ('active','inactive','prospect')),
      assigned_to         TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_by          TEXT REFERENCES users(id) ON DELETE SET NULL,
      notes               TEXT,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── Reviews ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS reviews (
      id                  TEXT PRIMARY KEY,
      client_id           TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      google_review_id    TEXT,
      reviewer_name       TEXT NOT NULL,
      reviewer_photo      TEXT,
      rating              INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment             TEXT,
      reply               TEXT,
      reply_at            TEXT,
      reply_by            TEXT REFERENCES users(id) ON DELETE SET NULL,
      review_date         TEXT NOT NULL,
      is_replied          INTEGER NOT NULL DEFAULT 0,
      sentiment           TEXT CHECK(sentiment IN ('positive','neutral','negative')),
      ai_suggested_reply  TEXT,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── Posts ───────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS posts (
      id              TEXT PRIMARY KEY,
      client_id       TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      title           TEXT,
      content         TEXT NOT NULL,
      image_url       TEXT,
      post_type       TEXT NOT NULL DEFAULT 'update'
                        CHECK(post_type IN ('update','offer','event','product')),
      status          TEXT NOT NULL DEFAULT 'draft'
                        CHECK(status IN ('draft','scheduled','published','failed')),
      scheduled_at    TEXT,
      published_at    TEXT,
      call_to_action  TEXT,
      cta_url         TEXT,
      event_start     TEXT,
      event_end       TEXT,
      offer_coupon    TEXT,
      offer_terms     TEXT,
      notes           TEXT,
      created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── Analytics (manual entry per client per day) ─────────────────────
    CREATE TABLE IF NOT EXISTS analytics (
      id                  TEXT PRIMARY KEY,
      client_id           TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      date                TEXT NOT NULL,
      views_search        INTEGER NOT NULL DEFAULT 0,
      views_maps          INTEGER NOT NULL DEFAULT 0,
      clicks_website      INTEGER NOT NULL DEFAULT 0,
      clicks_phone        INTEGER NOT NULL DEFAULT 0,
      clicks_directions   INTEGER NOT NULL DEFAULT 0,
      photo_views         INTEGER NOT NULL DEFAULT 0,
      total_reviews       INTEGER NOT NULL DEFAULT 0,
      avg_rating          REAL    NOT NULL DEFAULT 0,
      new_reviews         INTEGER NOT NULL DEFAULT 0,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(client_id, date)
    );

    -- ─── Email logs ───────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS email_logs (
      id            TEXT PRIMARY KEY,
      to_email      TEXT NOT NULL,
      subject       TEXT NOT NULL,
      body          TEXT,
      status        TEXT NOT NULL DEFAULT 'pending'
                      CHECK(status IN ('pending','sent','failed')),
      error         TEXT,
      related_type  TEXT,
      related_id    TEXT,
      sent_at       TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── Activity log ─────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS activity_log (
      id            TEXT PRIMARY KEY,
      user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
      action        TEXT NOT NULL,
      entity_type   TEXT,
      entity_id     TEXT,
      details       TEXT,
      ip_address    TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

async function seedAdminUser() {
  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?')
      .get('admin@agency.com');
    if (existing) return;

    const bcrypt = (await import('bcryptjs')).default;
    const hash = bcrypt.hashSync('Admin@123', 12);
    db.prepare(`
      INSERT INTO users (id, email, password, name, role)
      VALUES ('admin-seed-001', 'admin@agency.com', ?, 'Agency Admin', 'admin')
    `).run(hash);
    console.log('Admin seeded → admin@agency.com / Admin@123');
  } catch (e) {
    console.warn('Seed skipped:', e.message);
  }
}
