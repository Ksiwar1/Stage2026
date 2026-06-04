require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  try {
    const res = await client.query('SELECT store_name, content FROM "PFE"."carte"');
    for (const row of res.rows) {
      const content = row.content || {};
      const categories = content.categories || {};
      let hasSubcats = false;
      for (const [id, cat] of Object.entries(categories)) {
        if (cat.parent && cat.parent !== "") {
          hasSubcats = true;
          break;
        }
      }
      if (hasSubcats) {
        console.log(`Card '${row.store_name}' HAS subcategories (categories with a parent).`);
        // Print some examples of parent-child categories
        for (const [id, cat] of Object.entries(categories)) {
          if (cat.parent && cat.parent !== "") {
            const parentCat = categories[cat.parent];
            console.log(`  - Subcat: '${cat.title || cat.name}' (parent: '${parentCat ? parentCat.title || parentCat.name : cat.parent}')`);
          }
        }
      }
    }
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
}
main();
