import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  // Fail fast when the Postgres host is unreachable instead of hanging on the
  // default (very long) timeout. Keeps the UI responsive when the DB is down.
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 8000,
    query_timeout: 12000,
    statement_timeout: 12000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
