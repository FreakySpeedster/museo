-- AlterTable
ALTER TABLE "User" ADD COLUMN "socialLinks" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Page" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'public';

-- AlterTable
ALTER TABLE "Shelf" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'public';

-- AlterTable
ALTER TABLE "Item" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'public';

-- CreateIndex
CREATE INDEX "Page_visibility_idx" ON "Page"("visibility");

-- CreateIndex
CREATE INDEX "Shelf_visibility_idx" ON "Shelf"("visibility");

-- CreateIndex
CREATE INDEX "Item_visibility_idx" ON "Item"("visibility");
