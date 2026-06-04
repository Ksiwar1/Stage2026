import 'dotenv/config';
import prisma from './src/lib/db';

async function main() {
  const storeName = process.argv[2];
  if (!storeName) {
    console.log("Veuillez indiquer le nom du restaurant en argument.");
    console.log("Exemple : npx tsx link_client_card.ts carte11_big_farmer");
    process.exit(1);
  }

  try {
    // 1. Trouver la carte par son nom
    const cards = await prisma.$queryRaw<any[]>`
      SELECT id, store_name FROM "PFE"."carte" WHERE store_name = ${storeName} LIMIT 1
    `;

    if (cards.length === 0) {
      console.log(`Aucune carte trouvée pour le restaurant : "${storeName}"`);
      process.exit(1);
    }

    const card = cards[0];

    // 2. Associer la carte à l'utilisateur client de test
    await prisma.$executeRawUnsafe(`
      UPDATE "PFE"."utilisateur"
      SET card_id = $1
      WHERE email = 'client@resto.fr'
    `, card.id);

    console.log(`Le compte client@resto.fr est désormais lié au restaurant : "${card.store_name}"`);
  } catch (error) {
    console.error("Erreur lors de l'association :", error);
  } finally {
    process.exit(0);
  }
}

main();
