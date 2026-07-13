import prisma from '../../config/database';
import { PaginationParams } from '../../types';
import { Prisma } from '@prisma/client';

export class ClientService {
  async create(societeId: string, data: any) {
    const lastClient = await prisma.client.findFirst({
      where: { societeId },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    const nextCode = lastClient
      ? `CLI${(parseInt(lastClient.code.replace('CLI', '')) + 1).toString().padStart(5, '0')}`
      : 'CLI00001';

    return prisma.client.create({
      data: {
        ...data,
        societeId,
        code: nextCode,
      },
    });
  }

  async findAll(societeId: string, pagination: PaginationParams) {
    const { page = 1, limit = 20, sortBy = 'raisonSociale', sortOrder = 'asc', search } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.ClientWhereInput = {
      societeId,
      ...(search && {
        OR: [
          { raisonSociale: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
          { ncc: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { telephone: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { dossiers: true, factures: true },
          },
        },
      }),
      prisma.client.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string, societeId: string) {
    return prisma.client.findFirst({
      where: { id, societeId },
      include: {
        contacts: true,
        dossiers: {
          take: 20,
          orderBy: { dateCreation: 'desc' },
          select: {
            id: true, numero: true, nature: true, statut: true,
            dateCreation: true, valeurCAF: true,
          },
        },
        factures: {
          take: 20,
          orderBy: { dateFacture: 'desc' },
          select: {
            id: true, numero: true, type: true, statut: true,
            montantTTC: true, resteAPayer: true, dateFacture: true,
          },
        },
        paiements: {
          take: 20,
          orderBy: { datePaiement: 'desc' },
        },
        _count: {
          select: { dossiers: true, factures: true, documents: true },
        },
      },
    });
  }

  async update(id: string, societeId: string, data: any) {
    const existing = await prisma.client.findFirst({
      where: { id, societeId },
    });
    if (!existing) throw new Error('Client non trouvé');

    return prisma.client.update({
      where: { id },
      data,
    });
  }

  async bloquer(id: string, societeId: string, motif: string) {
    return prisma.client.update({
      where: { id },
      data: { bloque: true, motifBlocage: motif },
    });
  }

  async debloquer(id: string, societeId: string) {
    return prisma.client.update({
      where: { id },
      data: { bloque: false, motifBlocage: null },
    });
  }

  async archiver(id: string, societeId: string) {
    return prisma.client.update({
      where: { id },
      data: { archive: true, actif: false },
    });
  }

  async getSolde(id: string) {
    const factures = await prisma.facture.aggregate({
      where: { clientId: id, statut: { not: 'ANNULEE' } },
      _sum: { resteAPayer: true },
    });
    return factures._sum.resteAPayer || 0;
  }
}
