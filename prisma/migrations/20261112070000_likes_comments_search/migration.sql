-- CreateTable
CREATE TABLE "ItemLike" (
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemLike_pkey" PRIMARY KEY ("userId","itemId")
);

-- CreateTable
CREATE TABLE "ItemComment" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemLike_itemId_idx" ON "ItemLike"("itemId");

-- CreateIndex
CREATE INDEX "ItemComment_itemId_createdAt_idx" ON "ItemComment"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "ItemComment_userId_idx" ON "ItemComment"("userId");

-- AddForeignKey
ALTER TABLE "ItemLike" ADD CONSTRAINT "ItemLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLike" ADD CONSTRAINT "ItemLike_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemComment" ADD CONSTRAINT "ItemComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemComment" ADD CONSTRAINT "ItemComment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Trigram search indexes (ILIKE / similarity)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Item_title_trgm_idx" ON "Item" USING gin ("title" gin_trgm_ops);
CREATE INDEX "Item_description_trgm_idx" ON "Item" USING gin ("description" gin_trgm_ops);
CREATE INDEX "Shelf_name_trgm_idx" ON "Shelf" USING gin ("name" gin_trgm_ops);
CREATE INDEX "User_username_trgm_idx" ON "User" USING gin ("username" gin_trgm_ops);
CREATE INDEX "User_displayName_trgm_idx" ON "User" USING gin ("displayName" gin_trgm_ops);
