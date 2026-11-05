-- AlterTable
-- Add nullable thumbnail_data column for image attachments.
-- Existing records keep their current resized data in `data` and will use it as fallback.
ALTER TABLE "attachments" ADD COLUMN "thumbnail_data" BYTEA;