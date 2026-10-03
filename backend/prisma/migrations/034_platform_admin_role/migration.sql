-- Distingue les super-admins (acces complet) des comptes de demonstration en lecture seule.
ALTER TABLE "platform_admins" ADD COLUMN "superAdmin" BOOLEAN NOT NULL DEFAULT true;
