import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importPenalites() {
  console.log('🌱 Démarrage de l\'import des pénalités...');
  
  const csvPath = path.join(__dirname, 'import-penalites.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('Type'));
  
  console.log(`📄 ${lines.length} pénalités à importer`);
  
  let imported = 0;
  
  for (const line of lines) {
    const parts = line.split(';');
    if (parts.length < 5) continue;
    
    const [type, description, montantStr, delai, actifStr] = parts;
    const montant = parseInt(montantStr.replace(/\s/g, ''), 10);
    const actif = actifStr.trim().toLowerCase() === 'true';
    
    if (!type || !delai || isNaN(montant)) continue;
    
    // Vérifier si la pénalité existe déjà
    const existing = await prisma.appSettingPenalty.findFirst({
      where: { type: type.trim() }
    });
    
    if (existing) {
      console.log(`  ⏭️ Déjà existante: ${type.trim()}`);
      continue;
    }
    
    // Créer la pénalité
    await prisma.appSettingPenalty.create({
      data: {
        type: type.trim(),
        description: description.trim() || null,
        montant: montant,
        delai: delai.trim(),
        actif: actif
      }
    });
    
    imported++;
    console.log(`  ✅ Pénalité créée: ${type.trim()} (${montant} FCFA)`);
  }
  
  const totalPenalites = await prisma.appSettingPenalty.count();
  
  console.log(`\n🎉 Import terminé !`);
  console.log(`   Nouvelles pénalités: ${imported}`);
  console.log(`   Total pénalités: ${totalPenalites}`);
}

importPenalites()
  .catch((e) => {
    console.error('❌ Erreur lors de l\'import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
