-- PanoPublish D1 Database Schema (SQLite-compatible)

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  username TEXT UNIQUE,
  company_name TEXT,
  first_name TEXT,
  last_name TEXT,
  plan TEXT NOT NULL DEFAULT 'trial',
  credits INTEGER NOT NULL DEFAULT 0,
  trial_ends_at TEXT,
  onboarding_dismissed BOOLEAN NOT NULL DEFAULT 0,
  dark_mode BOOLEAN NOT NULL DEFAULT 0,
  phone TEXT,
  country_code TEXT DEFAULT 'US',
  logo_url TEXT,
  website_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  billing_cycle_tours_used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  business_type TEXT,
  phone TEXT,
  city TEXT,
  address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- Tours
CREATE TABLE IF NOT EXISTS tours (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'gmaps',
  status TEXT NOT NULL DEFAULT 'draft',
  address TEXT,
  google_place_url TEXT,
  google_place_id TEXT,
  cid TEXT,
  nadir_logo_url TEXT,
  nadir_type TEXT DEFAULT 'none',
  nadir_size TEXT DEFAULT '13%',
  nadir_pos TEXT DEFAULT 'btm',
  latitude REAL,
  longitude REAL,
  has_been_published BOOLEAN NOT NULL DEFAULT 0,
  streetview_connections_synced BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tours_user_id ON tours(user_id);

-- Islands
CREATE TABLE IF NOT EXISTS islands (
  id TEXT PRIMARY KEY,
  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_level BOOLEAN DEFAULT 0,
  level_number INTEGER DEFAULT 0,
  level_name TEXT DEFAULT 'L0',
  show_scene_names BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_islands_tour_id ON islands(tour_id);

-- Photos
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  island_id TEXT REFERENCES islands(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  filename TEXT,
  size_bytes INTEGER,
  status TEXT NOT NULL DEFAULT 'uploaded',
  latitude REAL,
  longitude REAL,
  heading REAL DEFAULT 0,
  pitch REAL DEFAULT 0,
  roll REAL DEFAULT 0,
  capture_time TEXT,
  streetview_photo_id TEXT,
  streetview_share_link TEXT,
  streetview_status TEXT DEFAULT 'NOT_PUBLISHED',
  order_index INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  uploaded_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_photos_tour_id ON photos(tour_id);
CREATE INDEX IF NOT EXISTS idx_photos_island_id ON photos(island_id);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  razorpay_subscription_id TEXT,
  start_date TEXT DEFAULT (datetime('now')),
  end_date TEXT,
  amount_inr INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Google Tokens
CREATE TABLE IF NOT EXISTS google_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Connections
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  tour_id TEXT REFERENCES tours(id) ON DELETE CASCADE,
  from_photo_id TEXT REFERENCES photos(id),
  to_photo_id TEXT REFERENCES photos(id),
  heading REAL,
  spacing TEXT DEFAULT '3m',
  is_locked BOOLEAN DEFAULT 0,
  constellation_name TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Constellations
CREATE TABLE IF NOT EXISTS constellations (
  id TEXT PRIMARY KEY,
  tour_id TEXT REFERENCES tours(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  discount_percent INTEGER NOT NULL DEFAULT 0,
  plan TEXT,
  is_used BOOLEAN NOT NULL DEFAULT 0,
  expires_at TEXT,
  used_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
