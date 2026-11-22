-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "discordId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Edition" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "signupOpensAt" TIMESTAMP(3) NOT NULL,
    "signupClosesAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Edition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudgeApplication" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "editionId" UUID NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL,
    "consentVersion" TEXT NOT NULL,

    CONSTRAINT "JudgeApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "Edition_slug_key" ON "Edition"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "JudgeApplication_userId_editionId_key" ON "JudgeApplication"("userId", "editionId");

-- AddForeignKey
ALTER TABLE "JudgeApplication" ADD CONSTRAINT "JudgeApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeApplication" ADD CONSTRAINT "JudgeApplication_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
