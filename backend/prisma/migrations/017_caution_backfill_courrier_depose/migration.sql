-- Aligne l'état des cautions déjà déposées (dateDepotCourrier renseignée) sur le nouvel état intermédiaire.
UPDATE "cautions" SET "statut" = 'COURRIER_DEPOSE' WHERE "statut" = 'EN_ATTENTE' AND "dateDepotCourrier" IS NOT NULL;
