import prisma from './src/lib/db';

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PFE"."historique" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_carte UUID NOT NULL,
        cart JSONB NOT NULL,
        date_modification TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('historique table created successfully');
  } catch (error) {
    console.error('Error creating historique table:', error);
  } finally {
    process.exit(0);
  }
}

main();
