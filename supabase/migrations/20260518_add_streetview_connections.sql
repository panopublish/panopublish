-- Add columns to photos table
ALTER TABLE photos
ADD COLUMN IF NOT EXISTS latitude FLOAT,
ADD COLUMN IF NOT EXISTS longitude FLOAT,
ADD COLUMN IF NOT EXISTS heading FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS pitch FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS roll FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS capture_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS streetview_photo_id TEXT,
ADD COLUMN IF NOT EXISTS streetview_share_link TEXT,
ADD COLUMN IF NOT EXISTS streetview_status TEXT DEFAULT 'NOT_PUBLISHED';

-- Create google_tokens table
CREATE TABLE IF NOT EXISTS google_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create connections table
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
    from_photo_id UUID REFERENCES photos(id),
    to_photo_id UUID REFERENCES photos(id),
    heading FLOAT,
    spacing TEXT DEFAULT '3m',
    is_locked BOOLEAN DEFAULT false,
    constellation_name TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for google_tokens
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own google tokens"
    ON google_tokens
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS for connections
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view connections for their tours"
    ON connections FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM tours 
        WHERE tours.id = connections.tour_id 
        AND tours.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert connections for their tours"
    ON connections FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM tours 
        WHERE tours.id = connections.tour_id 
        AND tours.user_id = auth.uid()
    ));

CREATE POLICY "Users can update connections for their tours"
    ON connections FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM tours 
        WHERE tours.id = connections.tour_id 
        AND tours.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM tours 
        WHERE tours.id = connections.tour_id 
        AND tours.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete connections for their tours"
    ON connections FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM tours 
        WHERE tours.id = connections.tour_id 
        AND tours.user_id = auth.uid()
    ));
