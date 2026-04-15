import swaggerJsdoc, { Options } from 'swagger-jsdoc';

export const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Kafountine Gestion Municipale API',
      version: '1.0.0',
      description: `
## Description
API REST pour la gestion municipale de Kafountine.

### Authentication
L'API utilise l'authentification JWT. Pour accéder aux endpoints protégés:
1. Authentifiez-vous via POST /api/v1/auth/login
2. Utilisez le token JWT dans le header Authorization: Bearer <token>

### Rate Limiting
- Auth endpoints: 5 requêtes par 15 minutes
- API générale: configurable via env

### Erreurs
Tous les endpoints peuvent retourner:
- 400: Requête invalide (validation échouée)
- 401: Non authentifié
- 403: Non autorisé (permissions insuffisantes)
- 404: Ressource non trouvée
- 500: Erreur serveur interne
      `,
      contact: {
        name: 'Support Technique',
        email: 'support@kafountine.mairie.sn',
      },
      license: {
        name: 'Propriétaire',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1 (Production)',
        variables: {
          baseUrl: {
            default: '/api/v1',
          },
        },
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token JWT pour l\'authentification',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'Cookie d\'authentification JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Message d\'erreur' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', items: {} },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['OK', 'ready', 'not ready'] },
            timestamp: { type: 'string', format: 'date-time' },
            service: { type: 'string' },
            checks: {
              type: 'object',
              properties: {
                database: { type: 'boolean' },
                redis: { type: 'boolean' },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'ID unique de l\'utilisateur' },
            email: { type: 'string', format: 'email', description: 'Email de l\'utilisateur' },
            nom: { type: 'string', description: 'Nom de l\'utilisateur' },
            prenom: { type: 'string', description: 'Prénom de l\'utilisateur' },
            role: { type: 'string', enum: ['ADMIN', 'SUPER_ADMIN', 'AGENT', 'COMPTABLE', 'SERVICE_FINANCES', 'QUAI_PECHE'], description: 'Rôle de l\'utilisateur' },
            isActive: { type: 'boolean', description: 'Statut actif' },
          },
          required: ['id', 'email', 'nom', 'prenom', 'role', 'isActive'],
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                accessToken: { type: 'string', description: 'JWT access token' },
                refreshToken: { type: 'string', description: 'JWT refresh token' },
              },
            },
          },
        },
        Contribuable: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nin: { type: 'string', description: 'Numéro d\'identification national' },
            nom: { type: 'string' },
            prenom: { type: 'string' },
            dateNaiss: { type: 'string' },
            lieuNaiss: { type: 'string' },
            adresse: { type: 'string' },
            telephone: { type: 'string' },
            email: { type: 'string' },
            profession: { type: 'string' },
            typeContribuable: { type: 'string', enum: ['PARTICULIER', 'ENTREPRISE', 'ASSOCIATION'] },
            zone: { type: 'string' },
            montantImpot: { type: 'number' },
            isActive: { type: 'boolean' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            contribuableId: { type: 'string', format: 'uuid' },
            type: { type: 'string' },
            service: { type: 'string' },
            quantite: { type: 'integer' },
            montant: { type: 'number' },
            modePaiement: { type: 'string', enum: ['ESPECE', 'VIREMENT', 'MOBILE_MONEY', 'CHEQUE'] },
            statut: { type: 'string', enum: ['PAYE', 'EN_ATTENTE', 'ANNULE'] },
            date: { type: 'string' },
            reference: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        DashboardStats: {
          type: 'object',
          properties: {
            totalRecettes: { type: 'number' },
            totalContribuables: { type: 'integer' },
            totalTransactions: { type: 'integer' },
            tauxRecouvrement: { type: 'number' },
            transactionsParMois: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  mois: { type: 'string' },
                  montant: { type: 'number' },
                },
              },
            },
          },
        },
      },
      responses: {
        BadRequest: {
          description: 'Requête invalide',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Unauthorized: {
          description: 'Non authentifié - Token JWT invalide ou expiré',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { success: false, message: 'Accès non autorisé' },
            },
          },
        },
        Forbidden: {
          description: 'Non autorisé - Permissions insuffisantes',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { success: false, message: 'Permission insuffisante' },
            },
          },
        },
        NotFound: {
          description: 'Ressource non trouvée',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { success: false, message: 'Ressource non trouvée' },
            },
          },
        },
        InternalServerError: {
          description: 'Erreur serveur interne',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { success: false, message: 'Erreur interne du serveur' },
            },
          },
        },
      },
      parameters: {
        id: {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'ID unique de la ressource',
        },
        year: {
          name: 'year',
          in: 'query',
          schema: { type: 'integer' },
          description: 'Année fiscale',
        },
        limit: {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 20 },
          description: 'Nombre maximum de résultats',
        },
      },
    },
    tags: [
      { name: 'Santé', description: 'Endpoints de santé et readiness' },
      { name: 'Auth', description: 'Authentication et gestion de session' },
      { name: 'Contribuables', description: 'Gestion des contribuables/taxpayers' },
      { name: 'Transactions', description: 'Gestion des transactions et paiements' },
      { name: 'Dashboard', description: 'Statistiques et tableaux de bord' },
      { name: 'Formations', description: 'Gestion des formations' },
      { name: 'Jeunes', description: 'Gestion des jeunes et inscriptions' },
      { name: 'État Civil', description: 'Gestion de l\'état civil' },
      { name: 'Urbanisme', description: 'Gestion des permis et urbanisme' },
      { name: 'Marché', description: 'Gestion du marché municipal' },
      { name: 'Motos', description: 'Gestion des motocyclettes et permis' },
      { name: 'Quai Pêche', description: 'Gestion du quai de pêche' },
      { name: 'Budget', description: 'Gestion du budget municipal' },
      { name: 'Paramètres', description: 'Configuration et paramètres système' },
      { name: 'Audit', description: 'Journal d\'audit et logs' },
      { name: 'Notifications', description: 'Gestion des notifications' },
      { name: 'Utilisateurs', description: 'Gestion des utilisateurs admin' },
      { name: 'Portail', description: 'Portail public pour contribuables' },
    ],
    paths: {},
  },
  apis: ['./src/modules/**/presentation/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);