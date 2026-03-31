-- CreateEnum
CREATE TYPE "WorkspaceItemType" AS ENUM ('ARTICLE');

-- CreateEnum
CREATE TYPE "WorkspaceItemStatus" AS ENUM ('GENERATING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "workspace_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WorkspaceItemType" NOT NULL DEFAULT 'ARTICLE',
    "status" "WorkspaceItemStatus" NOT NULL DEFAULT 'GENERATING',
    "initialIdea" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '生成中...',
    "body" TEXT,
    "excerpt" TEXT,
    "generationError" TEXT,
    "lastGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_references" (
    "id" TEXT NOT NULL,
    "workspaceItemId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_items_userId_updatedAt_idx" ON "workspace_items"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "workspace_items_userId_type_updatedAt_idx" ON "workspace_items"("userId", "type", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_references_workspaceItemId_contentId_key" ON "workspace_references"("workspaceItemId", "contentId");

-- CreateIndex
CREATE INDEX "workspace_references_workspaceItemId_rank_idx" ON "workspace_references"("workspaceItemId", "rank");

-- CreateIndex
CREATE INDEX "workspace_references_contentId_idx" ON "workspace_references"("contentId");

-- AddForeignKey
ALTER TABLE "workspace_items" ADD CONSTRAINT "workspace_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_references" ADD CONSTRAINT "workspace_references_workspaceItemId_fkey" FOREIGN KEY ("workspaceItemId") REFERENCES "workspace_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_references" ADD CONSTRAINT "workspace_references_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
