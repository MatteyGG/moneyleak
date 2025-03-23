-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_familyId_fkey";

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "description" TEXT,
ADD COLUMN     "username" TEXT NOT NULL DEFAULT 'unknown';

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("familyId") ON DELETE RESTRICT ON UPDATE CASCADE;
