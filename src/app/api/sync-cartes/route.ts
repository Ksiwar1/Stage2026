import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Les URLs officielles par défaut de Softavera
const defaultSources = [
  { name: "carte1_smash_up", url: "https://beta-catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_030075_smash_up/7b68eb81-c9ad-4f41-3de9-34507ef92322/3" },
  { name: "carte2_o3k", url: "https://beta-catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_030192_o3k/45e95078-ee53-08c0-8f28-9dfc36004c52/3" },
  { name: "carte3_grill_station", url: "https://beta-catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_30358_grill_station/bda7a348-b66b-8cb6-aced-ba7b4b2abe71/3" },
  { name: "carte4_bsb_franchise", url: "https://beta-catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_bsb_franchise/5d8cad19-68fb-ba12-949d-e1547795ddbf/3" },
  { name: "carte5_etoile_orientale", url: "https://beta-catalogue-api.etk360.com/api_etk_article_bd/v1//cards/workflowList/franchise_019795_l_etoile_orientale/9c743fb3-1762-8f4d-38fd-f7afdad3d30b/3" }
];

export async function POST() {
  try {
    const configPath = path.join(process.cwd(), '.softavera', 'sources.json');
    const importDir = path.join(process.cwd(), '.softavera', 'carte');
    
    // S'assurer que les dossiers existent
    const baseDir = path.join(process.cwd(), '.softavera');
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    if (!fs.existsSync(importDir)) fs.mkdirSync(importDir, { recursive: true });

    // Charger ou initialiser les sources
    let sourcesToSync = defaultSources;
    if (fs.existsSync(configPath)) {
        try {
            sourcesToSync = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch(e) {
            console.warn("Fichier sources.json corrompu. Utilisation des defaults.");
            fs.writeFileSync(configPath, JSON.stringify(defaultSources, null, 2));
        }
    } else {
        // Initialisation du fichier persistant
        fs.writeFileSync(configPath, JSON.stringify(defaultSources, null, 2));
    }

    const results = [];
    
    // Téléchargement et écriture séquentielle pour ne pas écraser l'API distante avec Rate Limits
    for (const source of sourcesToSync) {
      if(!source.url || !source.name) continue;
      
      try {
        const response = await fetch(source.url);
        
        if (!response.ok) {
            results.push({ name: source.name, success: false, error: `HTTP ${response.status} ${response.statusText}` });
            continue;
        }

        const data = await response.json(); // Force parse JSON pour valider la structure
        
        // Nom propre et sauvegarde brute
        const safeName = source.name.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
        const destPath = path.join(importDir, `${safeName}.json`);
        
        fs.writeFileSync(destPath, JSON.stringify(data, null, 2), 'utf8');
        results.push({ name: source.name, success: true });

      } catch (err: any) {
        results.push({ name: source.name, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({ 
      success: true, 
      message: `Synchronisation terminée : ${successCount}/${sourcesToSync.length} cartes mises à jour en local.`,
      details: results 
    });

  } catch (error: any) {
    console.error("Erreur de synchronisation:", error);
    return NextResponse.json({ success: false, message: "Erreur globale: " + error.message }, { status: 500 });
  }
}
