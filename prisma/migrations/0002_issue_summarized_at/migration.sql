-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "summarizedAt" TIMESTAMP(3),
ADD COLUMN     "summarizedArticleCount" INTEGER NOT NULL DEFAULT 0;
