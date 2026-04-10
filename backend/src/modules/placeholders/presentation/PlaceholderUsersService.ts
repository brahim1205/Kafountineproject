import bcrypt from 'bcryptjs';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { validateStrongPassword } from '../../../shared/security/passwordPolicy';
import { PlaceholderSupportService } from './PlaceholderSupportService';

function mapUser(user: {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  telephone: string | null;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    nom: user.nom,
    prenom: user.prenom,
    role: user.role,
    telephone: user.telephone,
    isActive: user.isActive,
    lastLogin: null,
    createdAt: user.createdAt,
  };
}

export class PlaceholderUsersService {
  constructor(private readonly supportService: PlaceholderSupportService) {}

  async listUsers(search: string) {
    const normalizedSearch = search.trim();
    const users = await prisma.user.findMany({
      where: normalizedSearch
        ? {
            OR: [
              { email: { contains: normalizedSearch, mode: 'insensitive' } },
              { nom: { contains: normalizedSearch, mode: 'insensitive' } },
              { prenom: { contains: normalizedSearch, mode: 'insensitive' } },
              { telephone: { contains: normalizedSearch, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: [{ role: 'asc' }, { nom: 'asc' }, { prenom: 'asc' }],
    });

    return users.map(mapUser);
  }

  async createUser(req: AuthRequest) {
    const payload = req.body || {};
    const email = String(payload.email || '').trim().toLowerCase();
    const nom = String(payload.nom || '').trim();
    const prenom = String(payload.prenom || '').trim();
    const role = String(payload.role || 'AGENT').trim().toUpperCase();
    const telephone = payload.telephone ? String(payload.telephone).trim() : null;
    const password = String(payload.password || '').trim();

    if (!email || !nom || !prenom) {
      throw new ValidationError('Email, nom et prénom sont requis.');
    }
    if (!password) {
      throw new ValidationError('Le mot de passe est requis.');
    }

    validateStrongPassword(password);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError('Un utilisateur avec cet email existe déjà.');
    }

    const user = await prisma.user.create({
      data: {
        email,
        nom,
        prenom,
        role,
        telephone,
        password: await bcrypt.hash(password, 10),
      },
    });

    await this.supportService.writeAuditLog(req, {
      action: 'Création utilisateur',
      module: 'Utilisateurs',
      details: `Création du compte ${user.email} (${user.role})`,
    });

    return mapUser(user);
  }

  async updateUser(req: AuthRequest, userId: string) {
    const payload = req.body || {};
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new NotFoundError('Utilisateur introuvable.');
    }

    const nextEmail = payload.email ? String(payload.email).trim().toLowerCase() : existing.email;
    if (nextEmail !== existing.email) {
      const duplicate = await prisma.user.findUnique({ where: { email: nextEmail } });
      if (duplicate && duplicate.id !== existing.id) {
        throw new ConflictError('Un utilisateur avec cet email existe déjà.');
      }
    }

    const updateData: Record<string, string | boolean | null> = {
      email: nextEmail,
      nom: payload.nom ? String(payload.nom).trim() : existing.nom,
      prenom: payload.prenom ? String(payload.prenom).trim() : existing.prenom,
      role: payload.role ? String(payload.role).trim().toUpperCase() : existing.role,
      telephone: payload.telephone === undefined ? existing.telephone : String(payload.telephone || '').trim() || null,
      isActive: payload.isActive === undefined ? existing.isActive : Boolean(payload.isActive),
    };

    if (payload.password) {
      const password = String(payload.password).trim();
      validateStrongPassword(password);
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await this.supportService.writeAuditLog(req, {
      action: 'Mise à jour utilisateur',
      module: 'Utilisateurs',
      details: `Mise à jour du compte ${user.email}`,
    });

    return mapUser(user);
  }

  async deleteUser(req: AuthRequest, userId: string) {
    if (req.user?.userId === userId) {
      throw new ValidationError('Vous ne pouvez pas supprimer votre propre compte.');
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      include: { _count: { select: { transactions: true } } },
    });
    if (!existing) {
      throw new NotFoundError('Utilisateur introuvable.');
    }

    if (existing._count.transactions > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
      await this.supportService.writeAuditLog(req, {
        action: 'Désactivation utilisateur',
        module: 'Utilisateurs',
        details: `Compte ${existing.email} désactivé car lié à des transactions`,
      });
      return { message: 'Utilisateur désactivé car il possède déjà des transactions.' };
    }

    await prisma.user.delete({ where: { id: userId } });
    await this.supportService.writeAuditLog(req, {
      action: 'Suppression utilisateur',
      module: 'Utilisateurs',
      details: `Suppression du compte ${existing.email}`,
    });

    return { message: 'Suppression effectuée' };
  }
}
