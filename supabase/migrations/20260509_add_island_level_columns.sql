ALTER TABLE islands ADD COLUMN is_level boolean DEFAULT false, ADD COLUMN level_number integer DEFAULT 0, ADD COLUMN level_name text DEFAULT 'L0', ADD COLUMN show_scene_names boolean DEFAULT true;
