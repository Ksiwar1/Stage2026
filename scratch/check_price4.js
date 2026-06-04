const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://softavera_user:0000@localhost:5432/softavera?schema=PFE' });
  await client.connect();
  const res = await client.query('SELECT store_name, content FROM "PFE".carte');
  let found = false;
  for (const row of res.rows) {
     const data = row.content;
     if (!data || !data.items) continue;
     for (const key in data.items) {
        const item = data.items[key];
        const title = item.title || (item.displayName && item.displayName.dflt && item.displayName.dflt.nameDef) || item.name;
        if (title && (title.toUpperCase().includes('ROULEAU') || title.toUpperCase().includes('NEMS') || title.toUpperCase().includes('TEMPURA'))) {
           console.log(`Found "${title}" in card "${row.store_name}"`);
           console.log(`Price object:`, JSON.stringify(item.price, null, 2));
           found = true;
        }
     }
  }
  if (!found) console.log("Not found.");
  await client.end();
}
check().catch(console.error);
