require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  try {
    await client.connect();
    const res = await client.query('SELECT id, store_name, content, created_at FROM "PFE"."carte" ORDER BY created_at DESC LIMIT 3');
    const summaries = res.rows.map(row => {
      const content = row.content;
      return {
        id: row.id,
        store_name: row.store_name,
        created_at: row.created_at,
        categories: Object.keys(content.categories || {}).map(k => content.categories[k].title),
        itemsCount: Object.keys(content.items || {}).length,
        someItems: Object.keys(content.items || {}).slice(0, 5).map(k => ({
          title: content.items[k].title,
          price: content.items[k].price?.dflt
        }))
      };
    });
    console.log("CARDS_SUMMARIES:", JSON.stringify(summaries, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
}
main();
