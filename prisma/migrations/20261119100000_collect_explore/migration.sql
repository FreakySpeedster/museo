-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "canonicalKey" TEXT,
ADD COLUMN     "imageHeight" INTEGER,
ADD COLUMN     "imageWidth" INTEGER,
ADD COLUMN     "sourceItemId" TEXT;

-- CreateIndex
CREATE INDEX "Item_canonicalKey_userId_idx" ON "Item"("canonicalKey", "userId");

-- CreateIndex
CREATE INDEX "Item_sourceItemId_idx" ON "Item"("sourceItemId");

-- CreateIndex
CREATE INDEX "ItemLike_createdAt_idx" ON "ItemLike"("createdAt");

-- CreateIndex
CREATE INDEX "Shelf_category_idx" ON "Shelf"("category");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_sourceItemId_fkey" FOREIGN KEY ("sourceItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

