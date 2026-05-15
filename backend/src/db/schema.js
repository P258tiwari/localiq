export const SQL = `

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin','member')),
  photo_url     TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id                        TEXT PRIMARY KEY,
  client_name               TEXT NOT NULL,
  business_name             TEXT NOT NULL,
  owner_name                TEXT,
  category                  TEXT,
  industry                  TEXT,
  phone                     TEXT,
  whatsapp                  TEXT,
  email                     TEXT,
  website                   TEXT,
  address                   TEXT,
  city                      TEXT,
  state                     TEXT,
  pincode                   TEXT,
  gbp_link                  TEXT,
  localo_link               TEXT,
  opening_hours             TEXT DEFAULT '{}',
  social_links              TEXT DEFAULT '{}',
  brand_images              TEXT DEFAULT '{}',
  profile_completion_score  INTEGER DEFAULT 0,
  status                    TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','paused','draft')),
  assigned_to               TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes                     TEXT,
  place_name_on_maps        TEXT,
  maps_rating               REAL,
  maps_review_count         INTEGER DEFAULT 0,
  maps_category_on_google   TEXT,
  maps_phone_on_google      TEXT,
  maps_website_on_google    TEXT,
  gbp_description_current   TEXT,
  gbp_status                TEXT,
  gbp_description_ai        TEXT,
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS client_seo (
  id                  TEXT PRIMARY KEY,
  client_id           TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  meta_title          TEXT,
  meta_description    TEXT,
  target_keywords     TEXT DEFAULT '[]',
  seo_score           INTEGER DEFAULT 0,
  last_audit_at       TEXT,
  audit_notes         TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gbp_suggestions (
  id              TEXT PRIMARY KEY,
  client_id       TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK(type IN ('post','reply','description','category','photo','attribute')),
  suggestion_text TEXT NOT NULL,
  ai_generated    INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected')),
  created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS client_billing (
  id              TEXT PRIMARY KEY,
  client_id       TEXT NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  plan_name       TEXT,
  monthly_amount  REAL DEFAULT 0,
  billing_cycle   TEXT DEFAULT 'monthly' CHECK(billing_cycle IN ('monthly','quarterly','annually')),
  next_due_date   TEXT,
  payment_status  TEXT DEFAULT 'pending' CHECK(payment_status IN ('paid','pending','overdue')),
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payment_history (
  id              TEXT PRIMARY KEY,
  client_id       TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount          REAL NOT NULL,
  payment_date    TEXT NOT NULL,
  payment_method  TEXT,
  reference_no    TEXT,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS keywords (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  keyword     TEXT NOT NULL,
  position    INTEGER,
  volume      INTEGER,
  difficulty  TEXT CHECK(difficulty IN ('low','medium','high')),
  tracked_at  TEXT NOT NULL DEFAULT (datetime('now')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gbp_posts (
  id              TEXT PRIMARY KEY,
  client_id       TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  post_type       TEXT NOT NULL DEFAULT 'update' CHECK(post_type IN ('update','offer','event','product')),
  title           TEXT,
  content         TEXT NOT NULL,
  image_url       TEXT,
  call_to_action  TEXT,
  cta_url         TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','published','failed')),
  scheduled_at    TEXT,
  published_at    TEXT,
  event_start     TEXT,
  event_end       TEXT,
  offer_coupon    TEXT,
  offer_terms     TEXT,
  notes           TEXT,
  created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id              TEXT PRIMARY KEY,
  client_id       TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  reviewer_name   TEXT,
  rating          INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  review_text     TEXT,
  review_date     TEXT,
  reply_text      TEXT,
  replied_at      TEXT,
  reply_status    TEXT NOT NULL DEFAULT 'pending' CHECK(reply_status IN ('pending','replied','ignored')),
  sentiment       TEXT CHECK(sentiment IN ('positive','neutral','negative')),
  source          TEXT DEFAULT 'google',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS review_replies (
  id          TEXT PRIMARY KEY,
  review_id   TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  reply_text  TEXT NOT NULL,
  ai_draft    TEXT,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent')),
  sent_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
  sent_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analytics (
  id                  TEXT PRIMARY KEY,
  client_id           TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date                TEXT NOT NULL,
  views_search        INTEGER DEFAULT 0,
  views_maps          INTEGER DEFAULT 0,
  clicks_website      INTEGER DEFAULT 0,
  clicks_phone        INTEGER DEFAULT 0,
  clicks_directions   INTEGER DEFAULT 0,
  photo_views         INTEGER DEFAULT 0,
  new_reviews         INTEGER DEFAULT 0,
  avg_rating          REAL,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(client_id, date)
);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  client_id   TEXT REFERENCES clients(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT,
  is_read     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  client_id   TEXT REFERENCES clients(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  details     TEXT DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gbp_categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  industry    TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS team_assignments (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT DEFAULT 'handler',
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(client_id, user_id)
);

CREATE TABLE IF NOT EXISTS content_notes (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  note_text   TEXT NOT NULL,
  note_type   TEXT DEFAULT 'general' CHECK(note_type IN ('general','strategy','feedback','task')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

`;
