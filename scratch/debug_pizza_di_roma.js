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
    console.log("Categories in carte9_pizza_di_roma:");
    for (const [catId, cat] of Object.entries(content.categories || {})) {
      console.log(`- Cat ID: ${catId}, Title: ${cat.title}, Items length: ${cat.items ? cat.items.length : 'no items array'}, child: ${cat.child ? cat.child.length : 'no child'}`);
      if (cat.title === "PIZZAS CF") {
        console.log("  PIZZAS CF category details:", JSON.stringify(cat, null, 2));
      }
    }
    
    console.log("\nWorkflow structure:");
    console.log(JSON.stringify(content.workflow, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
}
main();
