require('dotenv').config();
const { Client } = require('pg');

const sources = [
  { name: "carte1_smash_up", url: "https://beta-catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_030075_smash_up/7b68eb81-c9ad-4f41-3de9-34507ef92322/3" },
  { name: "carte2_o3k", url: "https://beta-catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_030192_o3k/45e95078-ee53-08c0-8f28-9dfc36004c52/3" },
  { name: "carte3_grill_station", url: "https://beta-catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_30358_grill_station/bda7a348-b66b-8cb6-aced-ba7b4b2abe71/3" },
  { name: "carte4_bsb_franchise", url: "https://beta-catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_bsb_franchise/5d8cad19-68fb-ba12-949d-e1547795ddbf/3" },
  { name: "carte5_etoile_orientale", url: "https://beta-catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_019795_l_etoile_orientale/9c743fb3-1762-8f4d-38fd-f7afdad3d30b/3" },
  { name: "carte6_seven_sushi", url: "https://catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_17057_seven_sushi/c4437474-2e5e-d3fc-73c6-29ac64c40ba1/3" },
  { name: "carte7_boraq", url: "https://catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_018185_boraq/38ca70c2-5fcf-464c-94bb-6f18754a6111/3" },
  { name: "carte8_mytacos", url: "https://catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_019310_mytacos/56058313-cfa6-ba6d-1306-b194fdb44cbd/3" },
  { name: "carte9_pizza_di_roma", url: "https://catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_016870_pizza_di_roma/fbc260e5-e0ba-8f64-d08d-2b8c3ab44283/3" },
  { name: "carte10_chicken_spot", url: "https://catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_019839_chicken_spot/2a8d999d-680b-47dd-519c-40412ce95ad2/3" },
  { name: "carte11_big_farmer", url: "https://catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_018296_big_farmer/eb793613-1db8-3540-ace2-b774b7685cab/3" },
  { name: "carte12_coco_thai", url: "https://catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_001929_coco_thai/8d79c1b4-4be5-e16f-c659-d33161cd4ea2/3" },
  { name: "carte13_fa2l_restauration", url: "https://catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_019727_fa2l_restauration/3bde4312-0338-fc2c-458a-850a95852b87/3" }
];

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();

  console.log("Starting manual sync of all 13 cards using native fetch...");
  
  for (const source of sources) {
    const safeName = source.name.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
    try {
      console.log(`Fetching: ${source.name} (${source.url})...`);
      const response = await fetch(source.url);
      if (!response.ok) {
        console.error(`❌ HTTP Error ${response.status} for ${source.name}`);
        continue;
      }
      const data = await response.json();
      
      // Check if it already exists by store_name
      const checkRes = await client.query('SELECT id FROM "PFE"."carte" WHERE store_name = $1', [safeName]);
      
      if (checkRes.rows.length > 0) {
        const cardId = checkRes.rows[0].id;
        console.log(`  Updating existing card: ${safeName} (ID: ${cardId})`);
        await client.query(
          'UPDATE "PFE"."carte" SET content = $1::jsonb, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(data), cardId]
        );
        // Save to history
        await client.query(
          'INSERT INTO "PFE"."historique" (id_carte, cart, date_modification, action, details) VALUES ($1, $2::jsonb, NOW(), \'UPDATE\', \'Mise à jour via synchronisation des sources.\')',
          [cardId, JSON.stringify(data)]
        );
      } else {
        console.log(`  Inserting new card: ${safeName}`);
        const insertRes = await client.query(
          'INSERT INTO "PFE"."carte" (id, store_name, content, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2::jsonb, NOW(), NOW()) RETURNING id',
          [safeName, JSON.stringify(data)]
        );
        const newId = insertRes.rows[0].id;
        // Save to history
        await client.query(
          'INSERT INTO "PFE"."historique" (id_carte, cart, date_modification, action, details) VALUES ($1, $2::jsonb, NOW(), \'CREATE\', \'Création initiale via synchronisation des sources.\')',
          [newId, JSON.stringify(data)]
        );
      }
      console.log(`✅ Success for ${source.name}`);
    } catch (e) {
      console.error(`❌ Failed to sync ${source.name}: ${e.message}`);
    }
  }

  await client.end();
  console.log("Manual sync finished.");
}

main().catch(console.error);
