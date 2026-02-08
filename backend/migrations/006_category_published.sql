-- 006_category_published.sql
ALTER TABLE categories ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT true;

-- Set all to published by default
UPDATE categories SET published = true WHERE published IS NULL;
