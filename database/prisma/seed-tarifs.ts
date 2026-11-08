import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tarifsParDefaut = [
  // Taxes
  { categorie: 'Taxes', nom: 'Taxe d\'habitation', montant: 5000, unite: 'an', description: 'Taxe annuelle sur l\'habitation' },
  { categorie: 'Taxes', nom: 'Taxe foncière', montant: 10000, unite: 'an', description: 'Taxe annuelle sur la propriété foncière' },
  { categorie: 'Taxes', nom: 'Taxe professionnelle', montant: 15000, unite: 'an', description: 'Taxe annuelle sur l\'activité professionnelle' },
  { categorie: 'Taxes', nom: 'Taxe sur les véhicules', montant: 8000, unite: 'an', description: 'Taxe annuelle sur les véhicules' },
  
  // État Civil
  { categorie: 'État Civil', nom: 'Acte de naissance', montant: 1000, unite: 'acte', description: 'Délivrance d\'un acte de naissance' },
  { categorie: 'État Civil', nom: 'Acte de mariage', montant: 2000, unite: 'acte', description: 'Délivrance d\'un acte de mariage' },
  { categorie: 'État Civil', nom: 'Acte de décès', montant: 1000, unite: 'acte', description: 'Délivrance d\'un acte de décès' },
  { categorie: 'État Civil', nom: 'Certificat de résidence', montant: 500, unite: 'certificat', description: 'Certificat de résidence' },
  
  // Urbanisme
  { categorie: 'Urbanisme', nom: 'Permis de construire', montant: 25000, unite: 'permis', description: 'Autorisation de construire' },
  { categorie: 'Urbanisme', nom: 'Permis d\'habiter', montant: 10000, unite: 'permis', description: 'Autorisation d\'habiter' },
  { categorie: 'Urbanisme', nom: 'Certificat d\'urbanisme', montant: 5000, unite: 'certificat', description: 'Certificat d\'urbanisme' },
  { categorie: 'Urbanisme', nom: 'Autorisation de lotir', montant: 50000, unite: 'autorisation', description: 'Autorisation de lotissement' },
  
  // Marché
  { categorie: 'Marché', nom: 'Place de marché journalière', montant: 200, unite: 'jour', description: 'Taxe journalière pour une place au marché' },
  { categorie: 'Marché', nom: 'Place de marché mensuelle', montant: 5000, unite: 'mois', description: 'Taxe mensuelle pour une place au marché' },
  { categorie: 'Marché', nom: 'Place de marché annuelle', montant: 50000, unite: 'an', description: 'Taxe annuelle pour une place au marché' },
  { categorie: 'Marché', nom: 'Taxe sur les étalages', montant: 1000, unite: 'mètre', description: 'Taxe par mètre d\'étalage' },
  
  // Motos-Taxis
  { categorie: 'Motos-Taxis', nom: 'Licence moto-taxi', montant: 10000, unite: 'an', description: 'Licence annuelle pour moto-taxi' },
  { categorie: 'Motos-Taxis', nom: 'Taxe journalière moto', montant: 300, unite: 'jour', description: 'Taxe journalière pour moto' },
  { categorie: 'Motos-Taxis', nom: 'Carte professionnelle moto', montant: 2000, unite: 'carte', description: 'Carte professionnelle pour conducteur de moto' },
  
  // Quai de Pêche
  { categorie: 'Quai de Pêche', nom: 'Droit de débarquement', montant: 500, unite: 'kg', description: 'Droit par kg de poisson débarqué' },
  { categorie: 'Quai de Pêche', nom: 'Location de casier', montant: 2000, unite: 'jour', description: 'Location d\'un casier de stockage' },
  { categorie: 'Quai de Pêche', nom: 'Taxe sur les embarcations', montant: 5000, unite: 'an', description: 'Taxe annuelle sur les embarcations de pêche' },
  
  // Formations
  { categorie: 'Formations', nom: 'Inscription formation', montant: 5000, unite: 'formation', description: 'Frais d\'inscription à une formation' },
  { categorie: 'Formations', nom: 'Certificat de formation', montant: 2000, unite: 'certificat', description: 'Délivrance d\'un certificat de formation' },
  
  // Recettes Diverses
  { categorie: 'Recettes Diverses', nom: 'Amende pour infraction', montant: 2000, unite: 'amende', description: 'Amende pour infraction aux arrêtés municipaux' },
  { categorie: 'Recettes Diverses', nom: 'Location de salle communale', montant: 10000, unite: 'jour', description: 'Location d\'une salle communale' },
  { categorie: 'Recettes Diverses', nom: 'Expédition de documents', montant: 500, unite: 'document', description: 'Frais d\'expédition de documents' },
];

async function seedTarifs() {
  console.log('🌱 Démarrage du seeding des tarifs...');
  
  for (const tarif of tarifsParDefaut) {
    await prisma.appSettingTariff.create({
      data: tarif,
    });
    console.log(`✅ Tarif créé: ${tarif.nom}`);
  }
  
  console.log(`🎉 ${tarifsParDefaut.length} tarifs créés avec succès !`);
}

seedTarifs()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
