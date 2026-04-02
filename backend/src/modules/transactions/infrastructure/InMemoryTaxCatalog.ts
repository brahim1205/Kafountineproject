import type { TaxCatalog } from '../domain/TaxCatalog';

export class InMemoryTaxCatalog implements TaxCatalog {
  private readonly categories = [
    { id: 'etat-civil', nom: 'État Civil', icon: 'ri-file-text-line', color: 'emerald', description: 'Documents administratifs' },
    { id: 'urbanisme', nom: 'Urbanisme', icon: 'ri-building-line', color: 'sky', description: 'Dossiers urbanisme' },
    { id: 'marche', nom: 'Marché', icon: 'ri-store-line', color: 'amber', description: 'Taxes de marché' },
    { id: 'transport', nom: 'Transport', icon: 'ri-car-line', color: 'orange', description: 'Stationnement et transport' },
  ];

  private readonly servicesByCategory = {
    'etat-civil': [{ id: 'extrait-naissance', nom: 'Extrait de naissance', tarif: 500, unite: 'document' }],
    urbanisme: [{ id: 'permis-construire', nom: 'Permis de construire', tarif: 5000, unite: 'm²', calcul: 'surface' }],
    marche: [{ id: 'place-marche', nom: 'Location place marché', tarif: 500, unite: 'jour' }],
    transport: [{ id: 'stationnement-moto', nom: 'Stationnement moto', tarif: 1000, unite: 'an' }],
  };

  listCategories() {
    return this.categories;
  }

  listServices(categoryId: string) {
    return this.servicesByCategory[categoryId as keyof typeof this.servicesByCategory] || [];
  }
}
