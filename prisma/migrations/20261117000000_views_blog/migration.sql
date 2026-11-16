
-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ItemView" (
    "itemId" TEXT NOT NULL,
    "viewerKey" TEXT NOT NULL,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemView_pkey" PRIMARY KEY ("itemId","viewerKey")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL DEFAULT '',
    "excerpt" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPostItem" (
    "postId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BlogPostItem_pkey" PRIMARY KEY ("postId","itemId")
);

-- CreateIndex
CREATE INDEX "ItemView_lastViewedAt_idx" ON "ItemView"("lastViewedAt");

-- CreateIndex
CREATE INDEX "BlogPost_userId_updatedAt_idx" ON "BlogPost"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "BlogPost_status_publishedAt_idx" ON "BlogPost"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "BlogPostItem_itemId_idx" ON "BlogPostItem"("itemId");

-- AddForeignKey
ALTER TABLE "ItemView" ADD CONSTRAINT "ItemView_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostItem" ADD CONSTRAINT "BlogPostItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostItem" ADD CONSTRAINT "BlogPostItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

