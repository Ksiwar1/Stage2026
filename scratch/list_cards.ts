import 'dotenv/config';
import prisma from '../src/lib/db';

async function main() {
  try {
    const cards = await prisma.$queryRaw<any[]>`
      SELECT id, store_name, created_at 
      FROM "PFE"."carte" 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    console.log("CARDS_IN_DB:", JSON.stringify(cards, null, 2));
  } catch (e: any) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
