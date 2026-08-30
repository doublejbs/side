-- AlterTable
ALTER TABLE "ClaimFeedbackRecord" ADD COLUMN     "userId" TEXT,
ALTER COLUMN "anonId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Vote" ADD COLUMN     "userId" TEXT,
ALTER COLUMN "anonId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ClaimFeedbackRecord_userId_idx" ON "ClaimFeedbackRecord"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimFeedbackRecord_claimId_userId_key" ON "ClaimFeedbackRecord"("claimId", "userId");

-- CreateIndex
CREATE INDEX "Vote_userId_idx" ON "Vote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_issueId_userId_key" ON "Vote"("issueId", "userId");

