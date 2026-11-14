-- AlterTable : jeton de réinitialisation du mot de passe (administrateurs de la plateforme)
ALTER TABLE "platform_admins" ADD COLUMN "tokenResetHash" VARCHAR(64),
ADD COLUMN "tokenResetExpire" TIMESTAMP(3);
