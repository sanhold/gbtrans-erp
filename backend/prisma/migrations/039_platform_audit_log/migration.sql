-- Journal des actions des administrateurs de la plateforme (tracabilite), pour un
-- outil qui gere des abonnements payants et des acces a toutes les societes clientes.

CREATE TABLE "platform_audit_log" (
    "id" TEXT NOT NULL,
    "platformAdminId" TEXT,
    "adminEmail" VARCHAR(200) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "cibleType" VARCHAR(50),
    "cibleId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "platform_audit_log_platformAdminId_idx" ON "platform_audit_log"("platformAdminId");
CREATE INDEX "platform_audit_log_createdAt_idx" ON "platform_audit_log"("createdAt");
