import { Response } from 'express';
import { DossierService } from './dossiers.service';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';

const service = new DossierService();

export class DossierController {
  async suggestionNumeroPhysique(req: AuthRequest, res: Response): Promise<void> {
    try {
      const nature = req.query.nature as string;
      const annee = req.query.annee ? parseInt(req.query.annee as string) : undefined;
      if (!nature) {
        ApiResponse.badRequest(res, 'Le paramètre nature est requis');
        return;
      }
      const numeroPhysique = await service.suggestionNumeroPhysique(req.user!.societeId, nature, annee);
      ApiResponse.success(res, { numeroPhysique });
    } catch (error: any) {
      ApiResponse.error(res, error.message);
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = {
        ...req.body,
        societeId: req.user!.societeId,
        agenceId: req.user!.agenceId,
      };
      const dossier = await service.create(data, req.user!.id);
      ApiResponse.created(res, dossier, 'Dossier créé avec succès');
    } catch (error: any) {
      ApiResponse.badRequest(res, error.message);
    }
  }

  async findAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder, search, ...filters } = req.query;
      const result = await service.findAll(
        req.user!.societeId,
        {
          ...filters,
          search: search as string,
          ...(filters.annee && { annee: parseInt(filters.annee as string, 10) }),
        },
        {
          page: parseInt(page as string) || 1,
          limit: parseInt(limit as string) || 20,
          sortBy: sortBy as string,
          sortOrder: sortOrder as 'asc' | 'desc',
        }
      );
      ApiResponse.paginated(res, result.data, result.total, result.page, result.limit);
    } catch (error: any) {
      ApiResponse.error(res, error.message);
    }
  }

  async findById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const dossier = await service.findById(req.params.id, req.user!.societeId);
      if (!dossier) {
        ApiResponse.notFound(res, 'Dossier non trouvé');
        return;
      }
      ApiResponse.success(res, dossier);
    } catch (error: any) {
      ApiResponse.error(res, error.message);
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const utilisateur = `${req.user!.prenom} ${req.user!.nom}`;
      const dossier = await service.update(req.params.id, req.user!.societeId, req.body, utilisateur);
      ApiResponse.success(res, dossier, 'Dossier modifié');
    } catch (error: any) {
      ApiResponse.badRequest(res, error.message);
    }
  }

  async changeStatut(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { statut, commentaire } = req.body;
      const utilisateur = `${req.user!.prenom} ${req.user!.nom}`;
      const dossier = await service.changeStatut(req.params.id, req.user!.societeId, statut, utilisateur, commentaire);
      ApiResponse.success(res, dossier, `Statut modifié: ${statut}`);
    } catch (error: any) {
      ApiResponse.badRequest(res, error.message);
    }
  }

  async archiver(req: AuthRequest, res: Response): Promise<void> {
    try {
      const utilisateur = `${req.user!.prenom} ${req.user!.nom}`;
      const dossier = await service.archiver(req.params.id, req.user!.societeId, utilisateur);
      ApiResponse.success(res, dossier, 'Dossier archivé');
    } catch (error: any) {
      ApiResponse.badRequest(res, error.message);
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await service.delete(req.params.id, req.user!.societeId);
      ApiResponse.success(res, result);
    } catch (error: any) {
      ApiResponse.badRequest(res, error.message);
    }
  }

  async statistiques(req: AuthRequest, res: Response): Promise<void> {
    try {
      const annee = req.query.annee ? parseInt(req.query.annee as string) : undefined;
      const stats = await service.getStatistiques(req.user!.societeId, annee);
      ApiResponse.success(res, stats);
    } catch (error: any) {
      ApiResponse.error(res, error.message);
    }
  }

  async bilan(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { annee, statut, clientId, page, limit } = req.query;
      const result = await service.getBilanDossiers(req.user!.societeId, {
        annee: annee ? parseInt(annee as string) : undefined,
        statut: statut as string | undefined,
        clientId: clientId as string | undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      ApiResponse.paginated(res, result.data, result.total, result.page, result.limit);
    } catch (error: any) {
      ApiResponse.error(res, error.message);
    }
  }
}
