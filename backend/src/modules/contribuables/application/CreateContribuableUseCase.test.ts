import { ConflictError } from '../../../shared/errors/AppError';
import { CreateContribuableUseCase } from './CreateContribuableUseCase';
import type { Contribuable } from '../domain/Contribuable';
import type { ContribuableRepository } from '../domain/ContribuableRepository';

describe('CreateContribuableUseCase', () => {
  let useCase: CreateContribuableUseCase;
  let mockRepository: jest.Mocked<ContribuableRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findByNin: jest.fn(),
      findByTelephone: jest.fn(),
      search: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new CreateContribuableUseCase(mockRepository);
  });

  const validPayload = {
    nin: '123456789',
    nom: 'Diop',
    prenom: 'Amadou',
    dateNaiss: '1990-01-01',
    lieuNaiss: 'Dakar',
    adresse: 'Kafountine',
    telephone: '771234567',
  };

  const existingContribuable: Contribuable = {
    id: 'uuid-existing',
    ...validPayload,
    dateNaiss: new Date('1990-01-01'),
    email: null,
    profession: null,
    typeContribuable: 'PARTICULIER',
    zone: null,
    montantImpot: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should create a contribuable successfully when data is valid', async () => {
    mockRepository.findByNin.mockResolvedValue(null);
    mockRepository.findByTelephone.mockResolvedValue(null);
    mockRepository.create.mockResolvedValue({
      id: 'uuid-123',
      ...validPayload,
      dateNaiss: new Date('1990-01-01'),
      email: null,
      profession: null,
      typeContribuable: 'PARTICULIER',
      zone: null,
      montantImpot: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await useCase.execute(validPayload);

    expect(mockRepository.findByNin).toHaveBeenCalledWith('123456789');
    expect(mockRepository.findByTelephone).toHaveBeenCalledWith('771234567');
    expect(mockRepository.create).toHaveBeenCalled();
    expect(result).toHaveProperty('id', 'uuid-123');
    expect(result.nom).toBe('Diop');
  });

  it('should throw ConflictError if NIN already exists', async () => {
    mockRepository.findByNin.mockResolvedValue(existingContribuable);

    await expect(useCase.execute(validPayload)).rejects.toThrow(ConflictError);
    await expect(useCase.execute(validPayload)).rejects.toThrow('Ce numéro de carte d\'identité (NIN) est déjà utilisé');
    
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('should throw ConflictError if telephone already exists', async () => {
    mockRepository.findByNin.mockResolvedValue(null);
    mockRepository.findByTelephone.mockResolvedValue(existingContribuable);

    await expect(useCase.execute(validPayload)).rejects.toThrow(ConflictError);
    await expect(useCase.execute(validPayload)).rejects.toThrow('Ce numéro de téléphone est déjà utilisé');
    
    expect(mockRepository.create).not.toHaveBeenCalled();
  });
});
