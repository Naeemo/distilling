-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('SIMILAR_TOPIC', 'CONTRADICTORY', 'SUPPORTIVE', 'REFERENCED', 'SEQUEL', 'SAME_AUTHOR', 'SHARED_ENTITY', 'TEMPORAL_CHAIN', 'CAUSAL', 'BROADER_CONTEXT', 'NARROWER_FOCUS');

-- CreateTable
CREATE TABLE "content_insights" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topics" JSONB,
    "keyEntities" JSONB,
    "sentiments" JSONB,
    "stance" TEXT,
    "keyClaims" JSONB,
    "infoPosition" JSONB,
    "temporalContext" JSONB,
    "qualityScore" DOUBLE PRECISION,
    "credibilityScore" DOUBLE PRECISION,
    "embedding" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_relations" (
    "id" TEXT NOT NULL,
    "contentAId" TEXT NOT NULL,
    "contentBId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relationType" "RelationType" NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "evidence" JSONB,
    "isDirectional" BOOLEAN NOT NULL DEFAULT false,
    "directionFrom" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "userConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_clusters" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keywords" JSONB,
    "contentCount" INTEGER NOT NULL DEFAULT 0,
    "avgQuality" DOUBLE PRECISION,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cluster_contents" (
    "clusterId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cluster_contents_pkey" PRIMARY KEY ("clusterId","contentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_insights_contentId_key" ON "content_insights"("contentId");

-- CreateIndex
CREATE INDEX "content_insights_userId_idx" ON "content_insights"("userId");

-- CreateIndex
CREATE INDEX "content_insights_contentId_idx" ON "content_insights"("contentId");

-- CreateIndex
CREATE INDEX "content_relations_userId_idx" ON "content_relations"("userId");

-- CreateIndex
CREATE INDEX "content_relations_contentAId_idx" ON "content_relations"("contentAId");

-- CreateIndex
CREATE INDEX "content_relations_contentBId_idx" ON "content_relations"("contentBId");

-- CreateIndex
CREATE INDEX "content_relations_relationType_idx" ON "content_relations"("relationType");

-- CreateIndex
CREATE UNIQUE INDEX "content_relations_contentAId_contentBId_relationType_key" ON "content_relations"("contentAId", "contentBId", "relationType");

-- CreateIndex
CREATE INDEX "topic_clusters_userId_idx" ON "topic_clusters"("userId");

-- CreateIndex
CREATE INDEX "cluster_contents_contentId_idx" ON "cluster_contents"("contentId");

-- CreateIndex (skip if exists, already created in previous migration)
-- CREATE UNIQUE INDEX "users_apiToken_key" ON "users"("apiToken");
-- CREATE INDEX "users_apiToken_idx" ON "users"("apiToken");

-- AddForeignKey
ALTER TABLE "content_insights" ADD CONSTRAINT "content_insights_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_insights" ADD CONSTRAINT "content_insights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_relations" ADD CONSTRAINT "content_relations_contentAId_fkey" FOREIGN KEY ("contentAId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_relations" ADD CONSTRAINT "content_relations_contentBId_fkey" FOREIGN KEY ("contentBId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_relations" ADD CONSTRAINT "content_relations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_clusters" ADD CONSTRAINT "topic_clusters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cluster_contents" ADD CONSTRAINT "cluster_contents_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "topic_clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cluster_contents" ADD CONSTRAINT "cluster_contents_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
