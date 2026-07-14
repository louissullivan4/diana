-- 012: Per-guild notification preferences (#120)
ALTER TABLE "guild_config"
    ADD COLUMN IF NOT EXISTS "notification_prefs" JSONB NOT NULL DEFAULT '{}'::jsonb;
