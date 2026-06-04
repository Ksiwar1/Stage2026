require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  try {
    await client.connect();
    const res = await client.query('SELECT id, store_name, created_at FROM "PFE"."carte" ORDER BY created_at ASC');
    console.log("ALL_CARDS_IN_DB:", JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
}
main();
