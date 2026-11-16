ALTER TABLE "Item" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ItemComment" ADD COLUMN "parentId" TEXT;
CREATE INDEX "ItemComment_parentId_idx" ON "ItemComment"("parentId");
ALTER TABLE "ItemComment" ADD CONSTRAINT "ItemComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ItemComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "CommentReaction" (
  "commentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommentReaction_pkey" PRIMARY KEY ("commentId","userId","emoji")
);
CREATE INDEX "CommentReaction_userId_idx" ON "CommentReaction"("userId");
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ItemComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
