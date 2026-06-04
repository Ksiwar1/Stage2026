require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  try {
    const res = await client.query('SELECT content FROM "PFE"."carte" WHERE store_name = \'carte9_pizza_di_roma\'');
    if (res.rows.length === 0) {
      console.log("Card carte9_pizza_di_roma not found");
      return;
    }
    const content = res.rows[0].content;
    const catId = "fff871eb-76df-4072-99c7-624b66cac87d"; // PIZZAS CF
    
    const wfNode = content.workflow?.[catId] || {};
    const contentKeys = Object.keys(wfNode.content || {});
    console.log("Keys inside workflow for fff871eb-76df-4072-99c7-624b66cac87d:");
    
    for (const key of contentKeys) {
      const node = wfNode.content[key];
      const isCat = content.categories?.[key];
      const isItem = content.items?.[key];
      console.log(`- Key: ${key}, type in workflow: ${node.type}, exists in categories: ${!!isCat} (title: ${isCat?.title}), exists in items: ${!!isItem}`);
    }
    
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
}
main();
