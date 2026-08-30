-- CreateEnum
CREATE TYPE "EvidenceSupport" AS ENUM ('SUPPORTS', 'PARTIAL', 'UNRELATED', 'CONTRADICTS');

-- AlterEnum
ALTER TYPE "IssueStatus" ADD VALUE 'AUTO_REJECTED';

-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN     "support" "EvidenceSupport",
ADD COLUMN     "verificationNote" TEXT;

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "classification" JSONB,
ADD COLUMN     "classifiedAt" TIMESTAMP(3),
ADD COLUMN     "debateScore" INTEGER,
ADD COLUMN     "topic" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

