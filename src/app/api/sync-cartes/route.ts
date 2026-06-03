import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { cardService } from '../../../services/cardService';

// Les URLs officielles par défaut de Softavera
const defaultSources = [
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
        
        // Use the safeName as the card ID (since the import/sync uses fixed names)
        // If the card exists, it will just replace the content if we handle it properly, 
        // or we can use getCardById, if exists update, else create. But for simplicity let's try to fetch it first.
        const existingCard = await cardService.getCardById(safeName);
        if (existingCard) {
            await cardService.updateCard(safeName, { content: data });
        } else {
            // Because cardService.createCard generates a UUID, we won't preserve the 'carte1_smash_up' as ID natively unless we modify it.
            // But we can store the name in store_name and let it generate a UUID. This breaks the sync slightly if we run it multiple times (duplicates).
            // Let's check if there's a card with that store_name, if so update it, else create.
            const allCards = await cardService.getAllCards();
            const matchingCard = (allCards as any[]).find(c => c.store_name === safeName);
            if (matchingCard) {
                await cardService.updateCard(matchingCard.id, { content: data });
            } else {
                await cardService.createCard({ store_name: safeName, content: data });
            }
        }
        
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
