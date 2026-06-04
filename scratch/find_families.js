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
      
      // Print keys at root level
      console.log("Root keys:", Object.keys(content));
      
      // Inspect workflowList
      if (content.workflowList) {
        console.log("workflowList:", JSON.stringify(content.workflowList, null, 2));
      }
      
      // Inspect tags
      if (content.tags) {
        console.log("tags:", JSON.stringify(content.tags, null, 2));
      }
      
      // Let's check if there is any property like "family" or "families"
      const familyKeys = Object.keys(content).filter(k => k.toLowerCase().includes('fam'));
      console.log("Keys containing 'fam':", familyKeys);

      // Inspect a few category objects to see if they have a 'family' or 'famille' property
      const firstCat = Object.values(content.categories || {})[0];
      console.log("First Category properties:", Object.keys(firstCat || {}));
      console.log("First Category detail:", JSON.stringify(firstCat, null, 2));

    }
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
