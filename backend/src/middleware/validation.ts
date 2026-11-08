import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';
import { ApiResponse } from '../utils/apiResponse';

export const validate = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((e) => ({
          champ: e.path.join('.'),
          message: e.message,
        }));
        ApiResponse.badRequest(res, 'Données invalides', errors);
        return;
      }
      next(error);
    }
  };
};
