import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://softavera_user:0000@localhost:5432/softavera?schema=PFE';
const pool = new Pool({ connectionString });

async function importCards() {
  const dirPath = path.join(process.cwd(), '.softavera', 'carte');
  
  if (!fs.existsSync(dirPath)) {
    console.error(`Directory not found: ${dirPath}`);
    process.exit(1);
  }

  const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.json'));
  console.log(`Found ${files.length} JSON files. Starting import...`);

  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    try {
      const filePath = path.join(dirPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      
      const storeName = data.title || file.replace('.json', '');

      // Insert into PostgreSQL table "PFE"."carte"
      await pool.query(`
        INSERT INTO "PFE"."carte" (id, store_name, content, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2::jsonb, NOW(), NOW())
      `, [storeName, JSON.stringify(data)]);
      
      console.log(`✅ Imported: ${file} (store_name: ${storeName})`);
      successCount++;
    } catch (err) {
      console.error(`❌ Failed to import ${file}:`, err);
      errorCount++;
    }
  }

  console.log(`\nImport complete!`);
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  
  await pool.end();
}

importCards().catch(console.error);
