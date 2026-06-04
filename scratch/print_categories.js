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
      
      console.log("ALL_CATEGORIES:");
      const list = Object.keys(cats).map(k => {
        const cat = cats[k];
        const parentId = cat.parent;
        const parentTitle = parentId && cats[parentId] ? cats[parentId].title : "ROOT";
        return {
          id: k,
          title: cat.title,
          parent_id: parentId || "NONE",
          parent_title: parentTitle,
          archive: cat.archive
        };
      });
      console.log(JSON.stringify(list, null, 2));
    }
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
