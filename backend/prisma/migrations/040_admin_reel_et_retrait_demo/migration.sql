-- Cree le premier compte super-admin reel de la plateforme (demande explicite du
-- proprietaire) et supprime definitivement le compte de demonstration en lecture
-- seule qui servait jusqu'ici a tester l'espace super-admin sans acces reel.
-- Le mot de passe en clair n'apparait jamais ici : seul son hash bcrypt est stocke,
-- identique a ce que fait la route POST /platform/admins.

INSERT INTO "platform_admins" ("id", "email", "motDePasse", "nom", "prenom", "superAdmin", "actif", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid()::text,
    'sanogoholdingsarl@gmail.com',
    '$2a$12$RY9TeDAaNtItvqCjsMxAduxZMgaINx3bZpkmPHRrwQRmhy45qIXYu',
    'Sanogo',
    'Admin',
    true,
    true,
    NOW(),
    NOW()
)
ON CONFLICT ("email") DO NOTHING;

DELETE FROM "platform_admins" WHERE "superAdmin" = false;
