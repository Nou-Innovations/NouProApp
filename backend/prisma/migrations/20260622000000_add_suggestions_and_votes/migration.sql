-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuggestionVote" (
    "id" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuggestionVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Suggestion_categoryId_idx" ON "Suggestion"("categoryId");

-- CreateIndex
CREATE INDEX "Suggestion_createdAt_idx" ON "Suggestion"("createdAt");

-- CreateIndex
CREATE INDEX "Suggestion_userId_idx" ON "Suggestion"("userId");

-- CreateIndex
CREATE INDEX "SuggestionVote_userId_idx" ON "SuggestionVote"("userId");

-- CreateIndex
CREATE INDEX "SuggestionVote_suggestionId_idx" ON "SuggestionVote"("suggestionId");

-- CreateIndex
CREATE UNIQUE INDEX "SuggestionVote_suggestionId_userId_key" ON "SuggestionVote"("suggestionId", "userId");

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionVote" ADD CONSTRAINT "SuggestionVote_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "Suggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionVote" ADD CONSTRAINT "SuggestionVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
