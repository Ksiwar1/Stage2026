require('dotenv').config();
const { Client } = require('pg');
const crypto = require('crypto');

function verifyPassword(password, hashedAndSalted) {
  const [salt, hash] = hashedAndSalted.split(':');
  const testHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === testHash;
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  try {
    const res = await client.query('SELECT email, password FROM "PFE"."utilisateur"');
    for (const row of res.rows) {
      console.log(`User: ${row.email}`);
      console.log(`  Verifies with ClientPass123!: ${verifyPassword('ClientPass123!', row.password)}`);
      console.log(`  Verifies with AdminPass123!: ${verifyPassword('AdminPass123!', row.password)}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
