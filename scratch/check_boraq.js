const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://softavera_user:0000@localhost:5432/softavera?schema=PFE' });
  await client.connect();
  const res = await client.query('SELECT store_name, content FROM "PFE".carte');
  for (const row of res.rows) {
     const data = row.content;
     if (!data || !data.categories) continue;
     for (const key in data.categories) {
        const cat = data.categories[key];
        const title = cat.title || cat.name;
        if (title && title.toUpperCase().includes('BORAQ')) {
           console.log(`Found BORAQ in card "${row.store_name}"`);
        }
     }
  }
  await client.end();
}
check().catch(console.error);
