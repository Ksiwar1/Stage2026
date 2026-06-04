require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  try {
    const inputs = ['carte11_big_farmer', 'carte11bigfarmer', 'carte11'];
    for (const input of inputs) {
      const normalizedInput = input.toLowerCase().replace(/[^a-z0-9]/g, '');
      const query = `
        SELECT id, store_name FROM "PFE"."carte" 
        WHERE LOWER(REGEXP_REPLACE(store_name, '[^a-zA-Z0-9]', '', 'g')) = $1
        LIMIT 1
      `;
      const res = await client.query(query, [normalizedInput]);
      console.log(`Input: "${input}" -> Normalized: "${normalizedInput}"`);
      console.log(`  Found card:`, res.rows[0] || 'NONE');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
