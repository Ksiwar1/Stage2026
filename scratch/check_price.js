const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://softavera_user:0000@localhost:5432/softavera?schema=PFE' });
  await client.connect();
  const res = await client.query('SELECT content FROM "PFE".carte LIMIT 1');
  if (res.rows.length > 0) {
     const data = res.rows[0].content;
     const items = data.items;
     const firstItemKey = Object.keys(items)[0];
     console.log("Price structure of first item:", JSON.stringify(items[firstItemKey].price, null, 2));
  }
  await client.end();
}
check().catch(console.error);
