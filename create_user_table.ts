import 'dotenv/config';
import prisma from './src/lib/db';
import crypto from 'crypto';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  try {
    // 1. Créer la table utilisateur
    console.log('Creating utilisateur table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PFE"."utilisateur" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'CLIENT',
        card_id TEXT REFERENCES "PFE"."carte"(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Table "utilisateur" ready.');

    // 2. Vérifier s'il y a déjà des utilisateurs
    const existingUsers = await prisma.$queryRaw<any[]>`
      SELECT * FROM "PFE"."utilisateur" LIMIT 1
    `;

    if (existingUsers.length === 0) {
      console.log('Seeding default users...');
      
      const adminPass = hashPassword('AdminPass123!');
      const clientPass = hashPassword('ClientPass123!');

      // Récupérer une carte existante à lier au client (carte11_big_farmer par exemple)
      const cards = await prisma.$queryRaw<any[]>`
        SELECT id FROM "PFE"."carte" ORDER BY created_at DESC LIMIT 1
      `;
      const cardId = cards.length > 0 ? cards[0].id : null;

      // Insérer admin
      await prisma.$executeRawUnsafe(`
        INSERT INTO "PFE"."utilisateur" (email, password, role, card_id)
        VALUES ('admin@softavera.fr', $1, 'ADMIN', NULL)
      `, adminPass);
      console.log('Seeded admin user: admin@softavera.fr / AdminPass123!');

      // Insérer client
      if (cardId) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "PFE"."utilisateur" (email, password, role, card_id)
          VALUES ('client@resto.fr', $1, 'CLIENT', $2)
        `, clientPass, cardId);
        console.log(`Seeded client user: client@resto.fr / ClientPass123! (linked to card: ${cardId})`);
      } else {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "PFE"."utilisateur" (email, password, role, card_id)
          VALUES ('client@resto.fr', $1, 'CLIENT', NULL)
        `, clientPass);
        console.log('Seeded client user: client@resto.fr / ClientPass123! (no card available to link)');
      }
    } else {
      console.log('Users already present, skipping seed.');
    }
  } catch (error) {
    console.error('Error during database migration:', error);
  } finally {
    process.exit(0);
  }
}

main();
