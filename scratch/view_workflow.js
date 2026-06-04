require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  try {
    await client.connect();
    // On récupère une carte comme carte11_big_farmer
    const res = await client.query('SELECT content FROM "PFE"."carte" WHERE store_name = $1 LIMIT 1', ['carte11_big_farmer']);
    if (res.rows.length > 0) {
      const content = res.rows[0].content;
      console.log("REST_TITLE:", content.title);
      console.log("WORKFLOW_KEYS:", Object.keys(content.workflow || {}));
      
      console.log("\nWORKFLOW_DETAIL (First 3 keys):");
      const firstKeys = Object.keys(content.workflow || {}).slice(0, 3);
      for (const k of firstKeys) {
        console.log(`Key: ${k}`, JSON.stringify(content.workflow[k], null, 2));
      }

      console.log("\nCATEGORIES (First 3 categories):");
      const catKeys = Object.keys(content.categories || {}).slice(0, 3);
      for (const k of catKeys) {
        console.log(`Key: ${k}`, JSON.stringify(content.categories[k], null, 2));
      }
    } else {
      console.log("Card not found");
    }
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
}
main();
