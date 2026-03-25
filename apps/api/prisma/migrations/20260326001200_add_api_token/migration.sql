-- AlterTable
ALTER TABLE "users" ADD COLUMN     "apiToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_apiToken_key" ON "users"("apiToken");

-- CreateIndex
CREATE INDEX "users_apiToken_idx" ON "users"("apiToken");
