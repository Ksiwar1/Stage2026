require('dotenv').config();
const { Client } = require('pg');

const originalIds = [
  '99773850-1456-4bf6-af1f-69231487d3e3', // carte1_smash_up
  'dd8f4ee1-281b-4588-8c66-59da4d033182', // carte2_o3k
  '982c3771-bcf8-4060-a8d9-6a1135185809', // carte3_grill_station
  '98acd276-9546-4804-8f4f-bd34eef9474d', // carte4_bsb_franchise
  'c38c7fea-072a-4030-8338-6d36685af11c'  // carte5_etoile_orientale
];

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  try {
    await client.connect();
    const res = await client.query(
      'SELECT id, store_name, content, created_at FROM "PFE"."carte" WHERE id = ANY($1)',
      [originalIds]
    );

    const summaries = res.rows.map(row => {
      const content = row.content || {};
      const categories = Object.keys(content.categories || {}).map(k => content.categories[k].title || content.categories[k].name);
      const items = Object.keys(content.items || {}).map(k => ({
        title: content.items[k].title || content.items[k].displayName?.dflt?.nameDef || content.items[k].name,
        price: content.items[k].price?.dflt
      }));
      const steps = Object.keys(content.steps || {}).length;
      const modifiers = Object.keys(content.modifier || {}).length;

      return {
        id: row.id,
        store_name: row.store_name,
        created_at: row.created_at,
        categories,
        itemsCount: items.length,
        stepsCount: steps,
        modifiersCount: modifiers,
        someItems: items.slice(0, 6)
      };
    });

    console.log("ORIGINAL_CARDS_SUMMARIES:", JSON.stringify(summaries, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
}
main();
