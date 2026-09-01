-- CreateTable
CREATE TABLE "modeles_courrier" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "nom" VARCHAR(200) NOT NULL,
    "type" "TypeCourrier" NOT NULL DEFAULT 'SORTANT',
    "objet" VARCHAR(500) NOT NULL,
    "contenu" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modeles_courrier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "modeles_courrier_societeId_idx" ON "modeles_courrier"("societeId");

-- CreateIndex
CREATE INDEX "modeles_courrier_type_idx" ON "modeles_courrier"("type");

-- AddForeignKey
ALTER TABLE "modeles_courrier" ADD CONSTRAINT "modeles_courrier_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

