-- DropForeignKey
ALTER TABLE "JudgeApplication" DROP CONSTRAINT "JudgeApplication_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "JudgeApplication" ADD CONSTRAINT "JudgeApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
