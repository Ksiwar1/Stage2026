require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  try {
    await client.connect();
    const res = await client.query('SELECT content FROM "PFE"."carte" WHERE store_name = $1 LIMIT 1', ['carte11_big_farmer']);
    if (res.rows.length > 0) {
      const content = res.rows[0].content;
      const cats = content.categories || {};
      
      console.log("CATEGORY ITEMS MAPPING:");
      for (const [id, cat] of Object.entries(cats)) {
        if (cat.archive === true) continue;
        const items = cat.items || [];
        const parentId = cat.parent;
        const parentTitle = parentId && cats[parentId] ? cats[parentId].title : "ROOT";
        console.log(`- Title: "${cat.title}" (Parent: "${parentTitle}") -> Items Count: ${items.length}`);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
