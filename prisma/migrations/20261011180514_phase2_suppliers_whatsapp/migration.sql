-- CreateEnum
CREATE TYPE "WhatsappKind" AS ENUM ('ORDER', 'INVOICE', 'REMINDER');

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "onCredit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "whatsapp_logs" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "kind" "WhatsappKind" NOT NULL,
    "status" "EmailStatus" NOT NULL,
    "toPhone" TEXT NOT NULL,
    "externalId" TEXT,
    "error" TEXT,
    "invoiceId" UUID,
    "orderId" UUID,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_logs_organizationId_createdAt_idx" ON "whatsapp_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_logs_externalId_idx" ON "whatsapp_logs"("externalId");

-- CreateIndex
CREATE INDEX "whatsapp_logs_invoiceId_kind_createdAt_idx" ON "whatsapp_logs"("invoiceId", "kind", "createdAt");

-- AddForeignKey
ALTER TABLE "whatsapp_logs" ADD CONSTRAINT "whatsapp_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
