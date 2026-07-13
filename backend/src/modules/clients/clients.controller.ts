import { Response } from 'express';
import { ClientService } from './clients.service';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';

const service = new ClientService();

export class ClientController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const client = await service.create(req.user!.societeId, req.body);
      ApiResponse.created(res, client, 'Client créé');
    } catch (error: any) {
      ApiResponse.badRequest(res, error.message);
    }
  }

  async findAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder, search } = req.query;
      const result = await service.findAll(req.user!.societeId, {
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        search: search as string,
      });
      ApiResponse.paginated(res, result.data, result.total, result.page, result.limit);
    } catch (error: any) {
      ApiResponse.error(res, error.message);
    }
  }

  async findById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const client = await service.findById(req.params.id, req.user!.societeId);
      if (!client) { ApiResponse.notFound(res, 'Client non trouvé'); return; }
      ApiResponse.success(res, client);
    } catch (error: any) {
      ApiResponse.error(res, error.message);
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const client = await service.update(req.params.id, req.user!.societeId, req.body);
      ApiResponse.success(res, client, 'Client modifié');
    } catch (error: any) {
      ApiResponse.badRequest(res, error.message);
    }
  }

  async bloquer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const client = await service.bloquer(req.params.id, req.user!.societeId, req.body.motif);
      ApiResponse.success(res, client, 'Client bloqué');
    } catch (error: any) {
      ApiResponse.badRequest(res, error.message);
    }
  }

  async debloquer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const client = await service.debloquer(req.params.id, req.user!.societeId);
      ApiResponse.success(res, client, 'Client débloqué');
    } catch (error: any) {
      ApiResponse.badRequest(res, error.message);
    }
  }

  async archiver(req: AuthRequest, res: Response): Promise<void> {
    try {
      const client = await service.archiver(req.params.id, req.user!.societeId);
      ApiResponse.success(res, client, 'Client archivé');
    } catch (error: any) {
      ApiResponse.badRequest(res, error.message);
    }
  }
}
