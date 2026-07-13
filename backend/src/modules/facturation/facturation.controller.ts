import { Response } from 'express';
import { FacturationService } from './facturation.service';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';

const service = new FacturationService();

export class FacturationController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const facture = await service.createFacture(req.user!.societeId, req.user!.id, req.body);
      ApiResponse.created(res, facture, 'Facture créée');
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
          page: parseInt(page as string) || 1,
          limit: parseInt(limit as string) || 20,
          sortBy: sortBy as string,
          sortOrder: sortOrder as 'asc' | 'desc',
          search: search as string,
        },
        filters
      );
      ApiResponse.paginated(res, result.data, result.total, result.page, result.limit);
    } catch (error: any) {
      ApiResponse.error(res, error.message);
    }
  }

  async findById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const facture = await service.findById(req.params.id, req.user!.societeId);
      if (!facture) { ApiResponse.notFound(res, 'Facture non trouvée'); return; }
      ApiResponse.success(res, facture);
    } catch (error: any) {
      ApiResponse.error(res, error.message);
    }
  }

  async valider(req: AuthRequest, res: Response): Promise<void> {
    try {
      const facture = await service.valider(req.params.id, req.user!.societeId);
      ApiResponse.success(res, facture, 'Facture validée');
    } catch (error: any) {
      ApiResponse.badRequest(res, error.message);
    }
  }

  async annuler(req: AuthRequest, res: Response): Promise<void> {
    try {
      const facture = await service.annuler(req.params.id, req.user!.societeId);
      ApiResponse.success(res, facture, 'Facture annulée');
    } catch (error: any) {
      ApiResponse.badRequest(res, error.message);
    }
  }

  async creerAvoir(req: AuthRequest, res: Response): Promise<void> {
    try {
      const avoir = await service.creerAvoir(req.params.id, req.user!.societeId, req.user!.id, req.body.motif);
      ApiResponse.created(res, avoir, 'Avoir créé');
    } catch (error: any) {
      ApiResponse.badRequest(res, error.message);
    }
  }

  async payer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { montant, modePaiement, reference, banque, caisseId, compteBancaireId } = req.body;
      const paiement = await service.enregistrerPaiement(
        req.user!.societeId,
        req.params.id,
        montant,
        modePaiement,
        reference,
        banque,
        caisseId,
        compteBancaireId,
        req.user!.id
      );
      ApiResponse.created(res, paiement, 'Paiement enregistré');
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
}
