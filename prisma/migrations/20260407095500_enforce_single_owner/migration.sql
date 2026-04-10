CREATE UNIQUE INDEX IF NOT EXISTS "User_single_owner_idx"
ON "User" ("isOwner")
WHERE "isOwner" = true;