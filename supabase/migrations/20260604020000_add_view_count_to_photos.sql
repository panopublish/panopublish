-- Add view_count column to photos table to track street view view counts
ALTER TABLE photos ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
