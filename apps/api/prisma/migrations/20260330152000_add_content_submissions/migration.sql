-- CreateEnum
CREATE TYPE "ContentSubmissionSource" AS ENUM ('QUICK_PASTE', 'BROWSER_EXTENSION', 'IOS_SHORTCUT');

-- CreateEnum
CREATE TYPE "ContentSubmissionStatus" AS ENUM ('FETCHING', 'REUSING', 'SUMMARIZING', 'DIGESTED', 'DUPLICATE', 'FAILED');

-- CreateTable
CREATE TABLE "content_submissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT,
    "duplicateOfSubmissionId" TEXT,
    "source" "ContentSubmissionSource" NOT NULL,
    "status" "ContentSubmissionStatus" NOT NULL DEFAULT 'FETCHING',
    "title" TEXT NOT NULL,
    "url" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_submissions_userId_submittedAt_idx" ON "content_submissions"("userId", "submittedAt");

-- CreateIndex
CREATE INDEX "content_submissions_contentId_idx" ON "content_submissions"("contentId");

-- CreateIndex
CREATE INDEX "content_submissions_duplicateOfSubmissionId_idx" ON "content_submissions"("duplicateOfSubmissionId");

-- AddForeignKey
ALTER TABLE "content_submissions" ADD CONSTRAINT "content_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_submissions" ADD CONSTRAINT "content_submissions_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_submissions" ADD CONSTRAINT "content_submissions_duplicateOfSubmissionId_fkey" FOREIGN KEY ("duplicateOfSubmissionId") REFERENCES "content_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
