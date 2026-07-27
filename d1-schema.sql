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
  custom_settings TEXT DEFAULT '{}',
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
  metadata TEXT DEFAULT '{}',
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

-- Native Users (Cloudflare-only Auth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Email Verification Tokens (OTP codes sent on signup)
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);

-- Password Reset Tokens (OTP codes sent on forgot password)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- Temporary storage for signups prior to OTP verification completion
CREATE TABLE IF NOT EXISTS pending_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  code TEXT NOT NULL,
  metadata TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─── Content / SEO Tables ─────────────────────────────────────────────────

-- Authors (content creators / team bios)
CREATE TABLE IF NOT EXISTS authors (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  photo_url TEXT,
  credentials TEXT,
  linkedin_url TEXT,
  years_experience INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_authors_slug ON authors(slug);

-- Seed: real author record
INSERT OR IGNORE INTO authors (id, slug, name, title, bio, credentials, years_experience, created_at)
VALUES (
  'auth-01-prashant',
  'prashant-kumar',
  'Prashant Kumar',
  '360° Virtual Tour Specialist & Founder, PanoPublish',
  'Prashant Kumar is the founder of PanoPublish and a Google Street View certified specialist with 4 years of hands-on experience helping hotels, restaurants, gyms, schools, and real estate firms across Gujarat publish immersive 360° virtual tours on Google Maps. He has published over 500 panoramic photo spheres for clients across Ahmedabad, Rajkot, Surat, Bhavnagar, and Junagadh. Prashant combines technical expertise in panoramic photography workflows with deep knowledge of Google Street View API, EXIF GPS metadata, and nadir branding to deliver turn-key virtual tour publishing for Indian businesses.',
  'Google Street View Trusted Photographer | 360° Panoramic Photography | Google Maps Publishing',
  4,
  datetime('now')
);

-- Case Studies
CREATE TABLE IF NOT EXISTS case_studies (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  client_type TEXT NOT NULL,
  city TEXT,
  challenge TEXT,
  solution TEXT,
  results TEXT DEFAULT '{}',
  photo_urls TEXT DEFAULT '[]',
  tour_embed_url TEXT,
  testimonial_quote TEXT,
  published_at TEXT,
  author_id TEXT REFERENCES authors(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_case_studies_slug ON case_studies(slug);
CREATE INDEX IF NOT EXISTS idx_case_studies_client_type ON case_studies(client_type);

-- Testimonials
CREATE TABLE IF NOT EXISTS testimonials (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_company TEXT,
  client_photo_url TEXT,
  quote TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK(rating BETWEEN 1 AND 5),
  source TEXT DEFAULT 'whatsapp',
  city TEXT,
  service_used TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_testimonials_is_featured ON testimonials(is_featured);

-- FAQs (categorized, for hub page + reusable blocks)
CREATE TABLE IF NOT EXISTS faqs (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);

-- WhatsApp Proof Screenshots (admin managed)
CREATE TABLE IF NOT EXISTS whatsapp_proofs (
  id TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  caption TEXT,
  client_name TEXT,
  blurred INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

