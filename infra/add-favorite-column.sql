-- Add is_favorite column to photo table
-- Run this script if Hibernate doesn't automatically add the column

ALTER TABLE photo 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_photo_favorite ON photo(is_favorite);

-- Update existing photos to have is_favorite = false (if column was just added)
UPDATE photo SET is_favorite = false WHERE is_favorite IS NULL;

