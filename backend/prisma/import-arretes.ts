import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function importArretes() {
  console.log('🌱 Démarrage de l\'import des arrêtés municipaux...');
  
  const csvPath = path.join(__dirname, 'import-arretes-municipaux.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('Catégorie'));
  
  console.log(`📄 ${lines.length} lignes à importer`);
  
  let totalItems = 0;
  let totalCategories = 0;
  
  for (const line of lines) {
    const parts = line.split(';');
    if (parts.length < 5) continue;
    
    const [categorie, sousCategorie, libelle, montantStr, unite] = parts;
    const montant = parseInt(montantStr.replace(/\s/g, ''), 10);
    
    if (!categorie || !libelle || isNaN(montant)) continue;
    
    // Utiliser la catégorie principale, ou la sous-catégorie si la catégorie est vide
    const categoriePrincipale = categorie.trim();
    const sousCategorieTrim = sousCategorie ? sousCategorie.trim() : '';
    
    // Créer ou récupérer la catégorie
    const categoryId = slugify(categoriePrincipale);
    let category = await prisma.municipalTariffCategory.findUnique({
      where: { id: categoryId }
    });
    
    if (!category) {
      const sortOrder = await prisma.municipalTariffCategory.count();
      category = await prisma.municipalTariffCategory.create({
        data: {
          id: categoryId,
          nom: categoriePrincipale,
          description: sousCategorieTrim || `Catégorie des ${categoriePrincipale.toLowerCase()}`,
          sortOrder: sortOrder,
          isActive: true
        }
      });
      totalCategories++;
      console.log(`✅ Catégorie créée: ${categoriePrincipale}`);
    }
    
    // Vérifier si l'item existe déjà
    const existingItem = await prisma.municipalTariffItem.findFirst({
      where: {
        nom: libelle.trim(),
        categoryId: category.id
      }
    });
    
    if (existingItem) {
      console.log(`  ⏭️ Déjà existant: ${libelle.trim()}`);
      continue;
    }
    
    // Créer l'item
    const sortOrder = await prisma.municipalTariffItem.count({
      where: { categoryId: category.id }
    });
    
    await prisma.municipalTariffItem.create({
      data: {
        id: randomUUID(),
        categoryId: category.id,
        nom: libelle.trim(),
        tarif: montant,
        unite: unite.trim(),
        calcul: sousCategorieTrim || null,
        sortOrder: sortOrder,
        isActive: true
      }
    });
    
    totalItems++;
    console.log(`  ✅ Item créé: ${libelle.trim()} (${montant} ${unite.trim()})`);
  }
  
  console.log(`\n🎉 Import terminé !`);
  console.log(`   Nouvelles catégories: ${totalCategories}`);
  console.log(`   Nouveaux items (tarifs): ${totalItems}`);
  
  const totalCountategories = await prisma.municipalTariffCategory.count();
  const totalItemsCount = await prisma.municipalTariffItem.count();
  
  console.log(`   Total catégories: ${totalCountategories}`);
  console.log(`   Total items: ${totalItemsCount}`);
}

importArretes()
  .catch((e) => {
    console.error('❌ Erreur lors de l\'import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
