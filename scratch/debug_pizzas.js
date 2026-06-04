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
    
    // Find PIZZAS CF
    let targetCatId = null;
    for (const [id, cat] of Object.entries(content.categories || {})) {
      if (cat.title === "PIZZAS CF") {
        targetCatId = id;
        console.log("PIZZAS CF category ID:", id);
      }
    }
    
    if (!targetCatId) {
      console.log("PIZZAS CF category not found in categories");
      return;
    }
    
    // Let's check workflow for this category ID
    const wfNode = content.workflow?.[targetCatId] || {};
    console.log("Workflow content for PIZZAS CF category:");
    const workflowItems = Object.keys(wfNode.content || {});
    console.log("Workflow Items keys:", workflowItems);
    
    // Let's check categories[targetCatId].items or categories[targetCatId].item
    const catObj = content.categories[targetCatId];
    console.log("Category item list (items):", catObj.items);
    console.log("Category item list (item):", catObj.item);
    
    // Let's check if the items in workflow exist in content.items
    console.log("\nChecking workflow items exist in items dictionary:");
    for (const itemId of workflowItems) {
      const item = content.items[itemId];
      if (item) {
        console.log(`- Item ${itemId}: title=${item.title || item.name}, archive=${item.archive}, isVisible=${item.visibilityInfo?.isVisible}, active_qty=${item.active_qty}`);
      } else {
        console.log(`- Item ${itemId} NOT FOUND in items dictionary`);
      }
    }
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
}
main();
