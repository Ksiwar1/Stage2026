const { Client } = require('pg');

async function check() {
  const client = new Client({ connectionString: 'postgresql://softavera_user:0000@localhost:5432/softavera?schema=PFE' });
  await client.connect();
  const res = await client.query('SELECT id, store_name, content FROM "PFE".carte');
  
  let foundUuid = false;
  for (const row of res.rows) {
     const str = JSON.stringify(row.content);
     if (str.includes('3B514346-0A86-4476-97E3-A2AB2EB319B8')) {
         console.log('UUID found in card:', row.store_name, row.id);
         foundUuid = true;
         // Check if it's in items
         if (row.content.items && row.content.items['3B514346-0A86-4476-97E3-A2AB2EB319B8']) {
            console.log('UUID is in ITEMS of this card!');
         } else {
            console.log('UUID is NOT in items, but present in string (probably inside basicComp of some other item).');
         }
     }
  }
  if (!foundUuid) console.log('UUID entirely absent from DB!');
  await client.end();
}
check().catch(console.error);
