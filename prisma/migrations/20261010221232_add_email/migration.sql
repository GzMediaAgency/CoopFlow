-- CreateEnum
CREATE TYPE "EmailKind" AS ENUM ('INVOICE', 'RECEIPT', 'ORDER_CONFIRMATION', 'REMINDER', 'TEST');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "emailAutoOrder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailAutoReminders" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "kind" "EmailKind" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "kind" "EmailKind" NOT NULL,
    "status" "EmailStatus" NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "error" TEXT,
    "invoiceId" UUID,
    "orderId" UUID,
    "paymentId" UUID,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_organizationId_kind_key" ON "email_templates"("organizationId", "kind");

-- CreateIndex
CREATE INDEX "email_logs_organizationId_createdAt_idx" ON "email_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "email_logs_invoiceId_kind_createdAt_idx" ON "email_logs"("invoiceId", "kind", "createdAt");

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
