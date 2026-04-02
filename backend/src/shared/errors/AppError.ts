export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Accès non autorisé') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Accès interdit') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Ressource introuvable') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflit de données') {
    super(409, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Données invalides', details?: unknown) {
    super(400, message, details);
  }
}
