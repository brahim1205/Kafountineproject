import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { validateStrongPassword } from '../../../shared/security/passwordPolicy';
import type { Actor, AuditTrail } from '../../../shared/audit/AuditTrail';
import type { PasswordHasher, Utilisateur, UtilisateurRepository, UtilisateurValues } from '../domain/Utilisateur';

export type UtilisateurInput = {
  email?: string;
  nom?: string;
  prenom?: string;
  role?: string;
  telephone?: string;
  password?: string;
  isActive?: boolean;
};

const ASSIGNABLE_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'AGENT', 'SERVICE_FINANCES', 'QUAI_PECHE', 'ETAT_CIVIL', 'REGISSEUR']);

/** Le régisseur ne gère que les comptes de terrain, jamais l'encadrement ni l'état civil. */
const ROLES_GERES_PAR_REGISSEUR = new Set(['AGENT', 'QUAI_PECHE', 'SERVICE_FINANCES']);

function assertPeutGerer(actor: Actor, cible: Utilisateur) {
  if (actor.role === 'REGISSEUR' && !ROLES_GERES_PAR_REGISSEUR.has(cible.role)) {
    throw new ForbiddenError('Permissions insuffisantes pour cette action');
  }
}

export function normalizeAssignableUserRole(input: unknown, actorRole?: string | null) {
  const role = String(input || 'AGENT').trim().toUpperCase();
  if (!ASSIGNABLE_ROLES.has(role)) {
    throw new ValidationError('Rôle utilisateur invalide.');
  }
  if (actorRole === 'REGISSEUR' && !ROLES_GERES_PAR_REGISSEUR.has(role)) {
    throw new ValidationError('Le régisseur ne peut attribuer que les rôles agent, quai de pêche et finances.');
  }
  if (role === 'SUPER_ADMIN' && actorRole !== 'SUPER_ADMIN') {
    throw new ValidationError('Seul un SUPER_ADMIN peut attribuer le rôle SUPER_ADMIN.');
  }
  return role;
}

function toView(user: Utilisateur) {
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

export class UtilisateurService {
  constructor(
    private readonly repository: UtilisateurRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly auditTrail: AuditTrail
  ) {}

  async list(search: string, actorRole?: string | null) {
    const users = await this.repository.search(search.trim());
    return users.filter((user) => actorRole !== 'REGISSEUR' || ROLES_GERES_PAR_REGISSEUR.has(user.role)).map(toView);
  }

  async create(actor: Actor, input: UtilisateurInput) {
    const email = String(input.email || '').trim().toLowerCase();
    const nom = String(input.nom || '').trim();
    const prenom = String(input.prenom || '').trim();
    const role = normalizeAssignableUserRole(input.role || 'AGENT', actor.role);
    const telephone = input.telephone ? String(input.telephone).trim() : null;
    const password = String(input.password || '').trim();

    if (!email || !nom || !prenom) {
      throw new ValidationError('Email, nom et prénom sont requis.');
    }
    if (!password) {
      throw new ValidationError('Le mot de passe est requis.');
    }

    validateStrongPassword(password);

    if (await this.repository.findByEmail(email)) {
      throw new ConflictError('Un utilisateur avec cet email existe déjà.');
    }

    const user = await this.repository.create({
      email,
      nom,
      prenom,
      role,
      telephone,
      passwordHash: await this.passwordHasher.hash(password),
    });

    await this.auditTrail.record(actor, {
      action: 'Création utilisateur',
      module: 'Utilisateurs',
      details: `Création du compte ${user.email} (${user.role})`,
    });

    return toView(user);
  }

  async update(actor: Actor, userId: string, input: UtilisateurInput) {
    const existing = await this.repository.findById(userId);
    if (!existing) {
      throw new NotFoundError('Utilisateur introuvable.');
    }
    assertPeutGerer(actor, existing);

    const nextEmail = input.email ? String(input.email).trim().toLowerCase() : existing.email;
    if (nextEmail !== existing.email) {
      const duplicate = await this.repository.findByEmail(nextEmail);
      if (duplicate && duplicate.id !== existing.id) {
        throw new ConflictError('Un utilisateur avec cet email existe déjà.');
      }
    }

    const values: UtilisateurValues = {
      email: nextEmail,
      nom: input.nom ? String(input.nom).trim() : existing.nom,
      prenom: input.prenom ? String(input.prenom).trim() : existing.prenom,
      role: input.role ? normalizeAssignableUserRole(input.role, actor.role) : existing.role,
      telephone: input.telephone === undefined ? existing.telephone : String(input.telephone || '').trim() || null,
      isActive: input.isActive === undefined ? existing.isActive : Boolean(input.isActive),
    };

    if (input.password) {
      const password = String(input.password).trim();
      validateStrongPassword(password);
      values.passwordHash = await this.passwordHasher.hash(password);
    }

    const user = await this.repository.update(userId, values);

    await this.auditTrail.record(actor, {
      action: 'Mise à jour utilisateur',
      module: 'Utilisateurs',
      details: `Mise à jour du compte ${user.email}`,
    });

    return toView(user);
  }

  async delete(actor: Actor, userId: string) {
    if (actor.userId === userId) {
      throw new ValidationError('Vous ne pouvez pas supprimer votre propre compte.');
    }

    const existing = await this.repository.findById(userId);
    const transactionCount = await this.repository.countTransactions(userId);
    if (!existing || transactionCount === null) {
      throw new NotFoundError('Utilisateur introuvable.');
    }
    assertPeutGerer(actor, existing);

    if (transactionCount > 0) {
      await this.repository.deactivate(userId);
      await this.auditTrail.record(actor, {
        action: 'Désactivation utilisateur',
        module: 'Utilisateurs',
        details: `Compte ${existing.email} désactivé car lié à des transactions`,
      });
      return 'Utilisateur désactivé car il possède déjà des transactions.';
    }

    await this.repository.delete(userId);
    await this.auditTrail.record(actor, {
      action: 'Suppression utilisateur',
      module: 'Utilisateurs',
      details: `Suppression du compte ${existing.email}`,
    });

    return 'Suppression effectuée';
  }
}
