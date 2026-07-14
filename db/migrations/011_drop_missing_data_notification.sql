-- 011: Remove the unused missing-data notification column (#121)
ALTER TABLE "summoners" DROP COLUMN IF EXISTS "lastMissingDataNotification";
