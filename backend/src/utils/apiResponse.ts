import { Response } from 'express';

export class ApiResponse {
  static success<T>(res: Response, data: T, message = 'Succès', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static created<T>(res: Response, data: T, message = 'Créé avec succès') {
    return this.success(res, data, message, 201);
  }

  static error(res: Response, message: string, statusCode = 500, errors?: unknown) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  static badRequest(res: Response, message = 'Requête invalide', errors?: unknown) {
    return this.error(res, message, 400, errors);
  }

  static unauthorized(res: Response, message = 'Non autorisé') {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message = 'Accès refusé') {
    return this.error(res, message, 403);
  }

  static notFound(res: Response, message = 'Ressource non trouvée') {
    return this.error(res, message, 404);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    message = 'Succès'
  ) {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
