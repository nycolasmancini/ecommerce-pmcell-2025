-- Add cartData column to Visit table
-- This column was missing and causing errors in the analytics tracking

-- AddForeignKey
ALTER TABLE "Visit" ADD COLUMN "cartData" JSONB;