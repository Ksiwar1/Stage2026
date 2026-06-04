import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function test() {
  const cards = await prisma.$queryRaw<any[]>`SELECT content->'allergens' as allergens, content->'modifier' as mod, content->'steps' as steps FROM "PFE"."carte" WHERE id = '2b018cc3-78b9-438c-bc3a-e2b01bb8bc0b'`;
  console.log(JSON.stringify(cards[0], null, 2));
}
test();
