-- Additive only: a private "Want" list table and indexes for discovery. No drops, renames or type changes.
-- (Hand-edited: Prisma's diff also proposed dropping the hand-made pg_trgm search indexes; those are kept.)

-- CreateTable
CREATE TABLE IF NOT EXISTS "SavedItem" (
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedItem_pkey" PRIMARY KEY ("userId","itemId")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SavedItem_userId_createdAt_idx" ON "SavedItem"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "SavedItem_itemId_idx" ON "SavedItem"("itemId");
CREATE INDEX IF NOT EXISTS "SavedItem_createdAt_idx" ON "SavedItem"("createdAt");
CREATE INDEX IF NOT EXISTS "Follow_createdAt_idx" ON "Follow"("createdAt");

-- AddForeignKey
ALTER TABLE "SavedItem" ADD CONSTRAINT "SavedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedItem" ADD CONSTRAINT "SavedItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
