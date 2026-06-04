require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  try {
    await client.connect();
    const res = await client.query('SELECT content FROM "PFE"."carte" WHERE id = $1', ['69993e02-c4a5-4a80-a265-eb697696ce1d']);
    if (res.rows.length > 0) {
      const content = res.rows[0].content;
      console.log("CARD_DETAILS:", JSON.stringify({
        title: content.title,
        theme: content.theme,
        categories: Object.keys(content.categories || {}).map(k => ({
          id: k,
          title: content.categories[k].title,
          itemsCount: (content.categories[k].items || []).length
        })),
        items: Object.keys(content.items || {}).map(k => ({
          id: k,
          title: content.items[k].title,
          price: content.items[k].price?.dflt,
          stepsCount: (content.items[k].steps || []).length,
          allergens: content.items[k].allergens
        }))
      }, null, 2));
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
