import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email invalide'),
    motDePasse: z.string().min(1, 'Mot de passe requis'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    ancienMotDePasse: z.string().min(1, 'Ancien mot de passe requis'),
    nouveauMotDePasse: z
      .string()
      .min(8, 'Minimum 8 caractères')
      .regex(/[A-Z]/, 'Au moins une majuscule')
      .regex(/[a-z]/, 'Au moins une minuscule')
      .regex(/[0-9]/, 'Au moins un chiffre')
      .regex(/[^A-Za-z0-9]/, 'Au moins un caractère spécial'),
  }),
});

export const verify2FASchema = z.object({
  body: z.object({
    email: z.string().email(),
    code: z.string().length(6, 'Code à 6 chiffres requis'),
    token: z.string(),
  }),
});
