-- Remove the dead DeviceToken table; PushToken is the single source of truth for push tokens.
-- DeviceToken is a leaf table (only it FKs into User); nothing references it, so a plain drop is safe.
DROP TABLE IF EXISTS "DeviceToken";
