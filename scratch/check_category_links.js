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
      
      console.log("CATEGORY HIERARCHY DETAILS:");
      for (const [id, cat] of Object.entries(cats)) {
        if (cat.archive === true) continue;
        const parentId = cat.parent;
        const parentTitle = parentId && cats[parentId] ? cats[parentId].title : "NONE";
        
        // Print only if they have children or a parent, or if they are in workflow
        const inWorkflow = content.workflow && content.workflow[id] ? "YES" : "NO";
        
        if (cat.child?.length > 0 || cat.linkedChild?.length > 0 || parentId || inWorkflow === "YES") {
          console.log(`- ID: ${id} | Title: "${cat.title}"`);
          console.log(`  Parent: "${parentTitle}" (${parentId || 'none'})`);
          console.log(`  Workflow: ${inWorkflow}`);
          if (cat.child?.length > 0) console.log(`  child:`, cat.child);
          if (cat.linkedChild?.length > 0) console.log(`  linkedChild:`, cat.linkedChild);
          if (cat.items?.length > 0) console.log(`  items count:`, cat.items.length);
        }
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
