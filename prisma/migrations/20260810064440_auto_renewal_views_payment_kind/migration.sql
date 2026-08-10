-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('INITIAL', 'RENEWAL');

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "kind" "PaymentKind" NOT NULL DEFAULT 'INITIAL';

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "autoRenew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "renewalAmount" DECIMAL(10,2),
ADD COLUMN     "renewalAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "renewalNoticeSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
