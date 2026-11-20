-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "linkCheck" TEXT,
ADD COLUMN     "originalUrl" TEXT,
ADD COLUMN     "reportCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "urlEditedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ItemReport" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemReport_itemId_idx" ON "ItemReport"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemReport_reporterId_itemId_key" ON "ItemReport"("reporterId", "itemId");

-- AddForeignKey
ALTER TABLE "ItemReport" ADD CONSTRAINT "ItemReport_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemReport" ADD CONSTRAINT "ItemReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

