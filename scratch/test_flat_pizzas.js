require('dotenv').config();
const { Client } = require('pg');

function getDeepItems(contentObj) {
  if (!contentObj || typeof contentObj !== 'object') return [];
  let items = [];
  
  for (const [key, node] of Object.entries(contentObj)) {
    if (node.type === 'items' || !node.type) {
      items.push({ id: key, rank: node.rank || 0, node });
    } else if (node.type === 'categories') {
      if (node.content) {
        items = items.concat(getDeepItems(node.content));
      }
    }
  }
  return items;
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  try {
    const res = await client.query('SELECT content FROM "PFE"."carte" WHERE store_name = \'carte9_pizza_di_roma\'');
    if (res.rows.length === 0) {
      console.log("Card not found");
      return;
    }
    const content = res.rows[0].content;
    const catId = "fff871eb-76df-4072-99c7-624b66cac87d"; // PIZZAS CF
    const wNode = content.workflow[catId];
    
    const items = getDeepItems(wNode.content);
    console.log(`Found ${items.length} items for PIZZAS CF:`);
    for (const item of items) {
      const itObj = content.items[item.id];
      if (itObj) {
        console.log(`- ID: ${item.id}, Title: ${itObj.title || itObj.name}, Price: ${itObj.price?.dflt?.ttc || itObj.price?.dflt}`);
      } else {
        console.log(`- ID: ${item.id} (not found in items)`);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
