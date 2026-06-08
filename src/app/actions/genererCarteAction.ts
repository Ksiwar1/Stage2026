'use server';

import { extractTrueDataFromCatalogue } from "../../lib/memory";
import { generateAIResponse, getAILabel, getAIType } from "../../lib/aiClient";
import { validateETK360Code } from "../../lib/aiValidator";
import { patchETK360Structure } from "../../lib/autoHealer";
import fs from "fs";
import path from "path";
import { addLog } from "../../lib/logger";
import { cardService } from "../../services/cardService";

// === GÉNÉRATION AUTOMATIQUE D'IMAGES (familles & produits) ===
// L'IA ne fournit pas toujours d'image : on en génère une à la volée à partir
// du nom, pour que les cartes ne restent pas vides. On utilise LoremFlickr
// (images réelles par mots-clés, gratuit et sans authentification).
const isPlaceholderImg = (v: any): boolean => {
  if (!v || typeof v !== 'string') return true;
  const low = v.toLowerCase();
  return low === '' || low.includes('no-pictures') || low.includes('nopicture');
};

const slugifyForImage = (text: string): string => {
  return String(text || 'plat')
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '') // retire les accents
    .replace(/[^a-zA-Z0-9\s]/g, ' ')                  // retire emojis / symboles
    .trim()
    .replace(/\s+/g, ' ');
};

// Mot-clé alimentaire FIABLE déduit d'une famille (toujours beaucoup de photos
// sur Flickr -> évite les 404 des combinaisons de tags trop spécifiques).
const foodKeywordForCategory = (catName: string): string => {
  const n = slugifyForImage(catName).toLowerCase();
  if (/pizza/.test(n)) return 'pizza';
  if (/burger|hamburger/.test(n)) return 'burger';
  if (/sandwich|panini|bagel/.test(n)) return 'sandwich';
  if (/tacos|wrap|kebab|burrito/.test(n)) return 'tacos';
  if (/boisson|soft|drink|soda|jus|limonade|biere/.test(n)) return 'drink';
  if (/dessert|glace|sucre|patiss|cake|tiramisu|crepe/.test(n)) return 'dessert';
  if (/salade|bowl|poke/.test(n)) return 'salad';
  if (/frite|accompagn|side|potato|nuggets/.test(n)) return 'fries';
  if (/sushi|maki|sashimi|japon/.test(n)) return 'sushi';
  if (/pasta|pate|spaghetti|lasagne|nouille/.test(n)) return 'pasta';
  if (/cafe|coffee|espresso|cappuccino/.test(n)) return 'coffee';
  if (/entree|antipasti|starter|tapas|bruschetta/.test(n)) return 'appetizer';
  if (/enfant|kids|menu/.test(n)) return 'meal';
  return 'food';
};

// Hash déterministe -> sert de "lock" LoremFlickr pour varier l'image par produit
// tout en restant reproductible (pas de Math.random, indispo côté workflow).
const hashNum = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 100000;
};

// Utilise la banque d'images locales premium générée
const buildAutoImage = (name: string, keyword = 'food'): string => {
  let kw = (keyword || 'food').toLowerCase();
  
  // Liste des images locales disponibles
  const availableImages = ['burger', 'dessert', 'drink', 'food', 'fries', 'pizza', 'salad', 'sandwich', 'sushi', 'tacos'];
  if (!availableImages.includes(kw)) {
    kw = 'food';
  }
  
  return `/food/${kw}.png`;
};

export async function genererArchitectureAction(data: FormData) {
  let sujetDemande = (data.get("sujet") as string) || "Générer une carte à partir de l'image";
  const restaurantName = data.get("restaurantName") as string | null;
  const rawAiType = (data.get("ai_type") as string) || undefined;
  const aiType = getAIType(rawAiType);
  const sourceInspiration = (data.get("sourceInspiration") as string) || undefined;
  const menuImage = data.get("menuImage") as File | null;
  const primaryColor = data.get("primaryColor") as string | null;
  const secondaryColor = data.get("secondaryColor") as string | null;
  const configJsonRaw = data.get("systemConfigJSON") as string | null;
  let systemConfig: any = null;
  if (configJsonRaw) {
      try { systemConfig = JSON.parse(configJsonRaw); } catch(e) {}
  }

  sujetDemande += `\n\n=== RÈGLES IMPORTANTES ET OBLIGATOIRES ===\n`;
  if (restaurantName) {
    sujetDemande += `- Nom du restaurant : "${restaurantName}". Ce nom qualifie l'établissement.\n`;
  }
  
  if (menuImage && menuImage.size > 0) {
      sujetDemande += `- ⚠️ PRIORITÉ IMAGE OCR ⚠️ : Tu dois extraire FIDÈLEMENT le menu joint en image. N'invente AUCUN produit, AUCUNE catégorie qui ne soit pas sur l'image. NE MODIFIE PAS les noms des produits pour essayer d'être créatif avec le nom de l'établissement. L'image fournie est la VÉRITÉ ABSOLUE pour le contenu textuel et tarifaire.\n`;
      sujetDemande += `- Ignore les "Catégories obligatoires" du prompt si elles contredisent le contenu de l'image. L'image prime.\n`;
  } else if (restaurantName) {
      sujetDemande += `- Le design, le nom des menus et des produits doivent absolument être stylistiquement et culturellement cohérents avec l'identité "${restaurantName}". Laisse libre cours à ta créativité !\n`;
  }
  
  sujetDemande += `- STRUCTURE STRICTE : workflow, categories, items, modifier, steps, opt. AUCUNE DE CES PARTIES NE DOIT ÊTRE VIDE.\n`;

  let base64Image: { mimeType: string; data: string } | undefined = undefined;
  let hasImage = false;

  if (menuImage && menuImage.size > 0) {
    hasImage = true;
    const arrayBuffer = await menuImage.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    base64Image = {
      mimeType: menuImage.type,
      data: buffer.toString('base64')
    };
  }

  const themeMap: Record<string, string> = {
      'fastfood': '99773850-1456-4bf6-af1f-69231487d3e3',
      'pizzeria': '982c3771-bcf8-4060-a8d9-6a1135185809',
      'tacos': '98acd276-9546-4804-8f4f-bd34eef9474d',
      'gastronomique': 'c38c7fea-072a-4030-8338-6d36685af11c',
      'standard': 'dd8f4ee1-281b-4588-8c66-59da4d033182',
      'sushi': '255d6391-bfb8-483d-bbea-ec184a7373c7',
      'oriental': '37032fb2-fdfd-424a-9e30-bf474564deee',
      'thai': 'e0aef6ec-2335-4b37-9c6d-62722f6f0e75'
  };
  let activeSourceInspiration = sourceInspiration;
  if (activeSourceInspiration && themeMap[activeSourceInspiration]) {
      activeSourceInspiration = themeMap[activeSourceInspiration];
  }
  let activeSecondaryInspirations: string[] = [];
  const maxSecondary = (aiType === "groq") ? 1 : 2;
  const availableDocs = await getAvailableLibraryCards();
  const fsLib = require('fs');
  const pathLib = require('path');

  // --- NOUVEAU ROUTAGE STRICT DU PIPELINE ---
  if (hasImage) {
      console.log("[ROUTAGE] Mode OCR Strict activé. Désactivation de la source locale.");
      activeSourceInspiration = 'generique'; // On force la suppression de la base
      activeSecondaryInspirations = [];
      sujetDemande = "TRANSCRIRE STRICTEMENT LE TEXTE DE L'IMAGE. Extraire tous les produits lus.\n" + sujetDemande;
  } else {
      console.log(`[ROUTAGE] Mode RAG Strict activé sur base: ${activeSourceInspiration}`);
      activeSecondaryInspirations = []; // INTERDICTION ABSOLUE DU MÉLANGE INTER-CARTES
  }

  try {
    let lightDataStr = null;
    try {
        const { extractLightStructureFromCatalogue } = require('../../lib/memory');
        lightDataStr = await extractLightStructureFromCatalogue(activeSourceInspiration);
    } catch (err: any) {
        if (err.message === "ERR_INVALID_CATALOGUE") {
            return { success: false, error: "La base locale sélectionnée est corrompue ou ne contient aucun produit valide. Impossible de lancer la génération RAG." };
        }
    }
    let lightDataSection = "";
    if (lightDataStr) {
        if (hasImage) {
            lightDataSection = `\nVOICI LA BASE DE DONNÉES LOCALE (Source d'Inspiration) :\n\`\`\`json\n${lightDataStr}\n\`\`\`\n\nRÈGLES OCR DYNAMIQUES :\n1. Tu DOIS générer des produits basés EXCLUSIVEMENT sur l'image.\n2. L'image est la vérité absolue. Tu dois inventer de nouveaux identifiants ('itemIds') pour tout produit détecté sur l'image, n'essaie pas de te limiter strictement à la base locale si l'image réclame plus.\n`;
        } else {
            lightDataSection = `\nVOICI LA SEULE BASE DE DONNÉES DE PRODUITS AUTORISÉE (La Source de Vérité) :\n\`\`\`json\n${lightDataStr}\n\`\`\`\n\nRÈGLES ABSOLUES :\n1. Tu DOIS prioriser les identifiants présents dans 'AVAILABLE_ITEMS'.\n2. Si le client a EXPLICITEMENT demandé une catégorie (ex: Tacos, Pizzas) qui est TOTALEMENT ABSENTE de la base locale, tu AS L'OBLIGATION d'inventer au moins 5 produits avec de nouveaux IDs (UUID), noms et prix pour la peupler. NE RENVOIE JAMAIS UNE CATÉGORIE VIDE si elle a été demandée.\n3. Pour le reste, l'invention de prix, de noms ou d'IDs hors-sujet est strictement interdite.\n`;
        }
    }

    console.log("[PHASE 1] Génération de la Trame Intermédiaire...");
    const promptSysteme1 = `Tu es un assistant restaurateur. Tu dois répondre STRICTEMENT en format JSON pur, sans aucune balise ni texte MD. Tu vas créer un mappage de menu.${lightDataSection}

RÈGLES D'AUTOMATISATION ABSOLUES :
1. Cohérence stricte : Une catégorie 'PIZZAS' ne doit contenir QUE des pizzas. Si le client réclame un thème absent, INVENTE LES PRODUITS, ne renvoie jamais la catégorie vide ("items": []).
2. INTERDICTION D'INVENTER DES CATÉGORIES : Ne crée JAMAIS de catégories qui n'ont pas été explicitement demandées par l'utilisateur ou trouvées sur l'image (ex: ne génère pas de "Desserts" si on ne te le demande pas).
3. INTERDICTION D'INVENTER DES PRODUITS : Tu DOIS te limiter strictement aux produits présents dans la base locale (AVAILABLE_ITEMS) pour une catégorie donnée. N'ajoute pas de produits "fictifs" (ex: Pizza Ananas) si cette catégorie existe déjà dans la base.
4. TYPOLOGIE OBLIGATOIRE DES PRODUITS (MÉLANGE EXIGÉ) : Chaque produit doit porter un champ "type" valant "simple" ou "compose".
   - "simple" : produit vendu tel quel, SANS aucun choix. C'est OBLIGATOIRE pour TOUTES les boissons, TOUS les desserts et les accompagnements seuls. Un produit simple n'a que id, name, price, description, type. Il NE DOIT PAS contenir de "steps".
   - "compose" : produit qui implique des choix client (menus, formules, et plats principaux comme burgers/pizzas/tacos/sandwichs quand c'est pertinent). Il DOIT contenir un tableau "steps" NON VIDE.
   Tu dois impérativement produire un VRAI MÉLANGE des deux types dans la carte.
5. Composition des produits "compose" : chaque "steps" doit contenir au moins 2 options réelles (ex: choix de la boisson, de l'accompagnement, de la sauce, de la cuisson). N'invente jamais une étape vide.


Format attendu:
{
  "categories": [
    {
      "name": "Burgers",
      "items": [
         {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "Menu Cheese Burger",
            "price": 10.50,
            "description": "Un super menu",
            "type": "compose",
            "steps": [
               {
                  "title": "Choix de la Boisson",
                  "minChoices": 1,
                  "maxChoices": 1,
                  "options": [
                     { "id": "123e4567-e89b-12d3-a456-426614174000", "name": "Coca Cola", "priceDelta": 0 },
                     { "id": "123e4567-e89b-12d3-a456-426614174001", "name": "Eau Plate", "priceDelta": 0 }
                  ]
               }
            ]
         }
      ]
    },
    {
      "name": "Boissons",
      "items": [
         {
            "id": "550e8400-e29b-41d4-a716-446655440010",
            "name": "Coca-Cola 33cl",
            "price": 2.50,
            "description": "Canette 33cl",
            "type": "simple"
         }
      ]
    }
  ]
}
INSTRUCTION EXTRÊMEMENT CRITIQUE: Tu dois OBLIGATOIREMENT générer EXACTEMENT les catégories demandées. Si tu pioches dans la BASE LOCALE, conserve bien l'identifiant exact. TOUS LES NOUVEAUX IDS ('id') DOIVENT ÊTRE DES UUIDs UNIQUES STRICTEMENT AU FORMAT 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'. AUCUN NOM LISIBLE COMME 'opt_tomate' OU 'item_1' N'EST AUTORISÉ DANS LES CLÉS. N'inclus jamais d'objet dans la valeur de "id", cela doit rester une simple string. AUCUN texte additionnel.`;

    const promptUtilisateur1 = `Sujet demandé: ${sujetDemande}. Produis le JSON du menu.`;
    
    let architectureJson = await generateAIResponse(promptSysteme1, promptUtilisateur1, 0.7, aiType, base64Image, 1000);
    architectureJson = architectureJson.replace(/```json/gi, "").replace(/```/g, "").trim();

    console.log("=== RAW TRAME INTERMÉDIAIRE ===");
    console.log(architectureJson);

    return {
       success: true,
       architectureJson,
       activeSourceInspiration,
       activeSecondaryInspirations
    };
  } catch (error: any) {
    console.error(`Erreur ${getAILabel(aiType)} Génération P1:`, error);
    return { success: false, error: `Erreur ${getAILabel(aiType)} : ${error.message}` };
  }
}

export async function enrichirCarteAction(
  data: FormData, 
  architectureJson: string, 
  activeSourceInspiration: string, 
  activeSecondaryInspirations: string[]
) {
  let sujetDemande = (data.get("sujet") as string) || "Générer une carte à partir de l'image";
  const restaurantName = data.get("restaurantName") as string | null;
  const sauvegarder = data.get("sauvegarder") === "on";
  const rawAiType = (data.get("ai_type") as string) || undefined;
  const aiType = getAIType(rawAiType);
  const menuImage = data.get("menuImage") as File | null;
  const primaryColor = data.get("primaryColor") as string | null;
  const secondaryColor = data.get("secondaryColor") as string | null;
  const configJsonRaw = data.get("systemConfigJSON") as string | null;
  let systemConfig: any = null;
  if (configJsonRaw) {
      try { systemConfig = JSON.parse(configJsonRaw); } catch(e) {}
  }
  // Configuration des formules (Taille Standard/Maxi) saisie dans le formulaire (étape "Composition")
  const formulas: any = systemConfig?.formulas || {};

  sujetDemande += `\n\n=== RÈGLES IMPORTANTES ET OBLIGATOIRES ===\n`;
  if (restaurantName) {
    sujetDemande += `- Nom du restaurant : "${restaurantName}". Ce nom doit être utilisé dans la carte, apparaître dans les titres, descriptions ou le branding.\n- Le design, le nom des menus et des produits doivent absolument être stylistiquement et culturellement cohérents avec l'identité "${restaurantName}".\n`;
  }
  
  let base64Image: { mimeType: string; data: string } | undefined = undefined;
  let hasImage = false;

  if (menuImage && menuImage.size > 0) {
    hasImage = true;
    const arrayBuffer = await menuImage.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    base64Image = { mimeType: menuImage.type, data: buffer.toString('base64') };
  }

  try {
    console.log("[PHASE 2] Conversion UUID Backend (Zero LLM Hallucination)...");
    
    // Parse strict de l'architecture générée par le prompt intermédiaire
    let intermediate: any = {};
    try {
        intermediate = JSON.parse(architectureJson);
    } catch(e) {
        return JSON.stringify({ success: false, error: "Le modèle IA a retourné un JSON invalide à l'étape 1." });
    }

    const { randomUUID } = require("crypto");
    
    // Récupération de la vraie palette du thème d'inspiration
  const sourceInspirationRaw = (data.get("sourceInspiration") as string) || undefined;
  
  const themeMap: Record<string, string> = {
      'fastfood': '99773850-1456-4bf6-af1f-69231487d3e3', // carte1_smash_up
      'pizzeria': '982c3771-bcf8-4060-a8d9-6a1135185809', // carte3_grill_station
      'tacos': '98acd276-9546-4804-8f4f-bd34eef9474d', // carte4_bsb_franchise
      'gastronomique': 'c38c7fea-072a-4030-8338-6d36685af11c', // carte5_etoile_orientale
      'standard': 'dd8f4ee1-281b-4588-8c66-59da4d033182', // carte2_o3k
      'sushi': '255d6391-bfb8-483d-bbea-ec184a7373c7', // carte6_seven_sushi
      'oriental': '37032fb2-fdfd-424a-9e30-bf474564deee', // carte7_boraq
      'thai': 'e0aef6ec-2335-4b37-9c6d-62722f6f0e75' // carte12_coco_thai
  };
  let sourceInspiration = sourceInspirationRaw;
  if (sourceInspiration && themeMap[sourceInspiration]) {
      sourceInspiration = themeMap[sourceInspiration];
  }

  let originalTheme: any = { palette: ["#4F46E5", "#10B981", "#F59E0B"] };
  let originalMetadata: any = {};
  if (sourceInspiration && sourceInspiration !== 'generique') {
      try {
            const refCard = await cardService.getCardById(sourceInspiration);
            if (refCard) {
                const refData = refCard.content;
                if (refData.theme && refData.theme.palette) {
                    originalTheme = refData.theme;
                }
                if (refData.allergens) originalMetadata.allergens = refData.allergens;
                if (refData.allergenGroups) originalMetadata.allergenGroups = refData.allergenGroups;
                if (refData.shoplist) originalMetadata.shoplist = refData.shoplist;
                if (refData.idEntite) originalMetadata.idEntite = refData.idEntite;
            }
        } catch(e) {
            console.error("Erreur récupération thème", e);
        }
    }

    if (primaryColor) originalTheme.palette[0] = primaryColor;
    if (secondaryColor) originalTheme.palette[1] = secondaryColor;
    if (primaryColor) originalTheme.palette[2] = primaryColor;
    
    // Initialisation exacte du format ETK360
    const finalData: any = {
        title: restaurantName || "Nouveau Restaurant",
        theme: originalTheme,
        workflow: {} as any,
        categories: {} as any,
        items: {} as any,
        modifier: {} as any,
        steps: {} as any,
        allergens: originalMetadata.allergens || {},
        allergenGroups: originalMetadata.allergenGroups || {},
        shoplist: originalMetadata.shoplist || {},
        idEntite: originalMetadata.idEntite || []
    };

    let sourceCategories = [];
    if (intermediate.categories && Array.isArray(intermediate.categories)) {
        sourceCategories = intermediate.categories;
    } else if (Array.isArray(intermediate)) {
        sourceCategories = intermediate;
    } else {
        const findCategoriesNode = (obj: any): any[] | null => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj.categories && Array.isArray(obj.categories)) return obj.categories;
            for (const key in obj) {
                if (Array.isArray(obj[key])) { 
                    if (obj[key].length > 0 && Array.isArray(obj[key][0].items)) return obj[key];
                }
                const res = findCategoriesNode(obj[key]);
                if (res) return res;
            }
            return null;
        };
        const found = findCategoriesNode(intermediate);
        if (found) sourceCategories = found;
    }

    const fsLib = require('fs');
    const pathLib = require('path');

    // === 1. BUILD MEMORY POOLS (MULTI-MAP SPLICING) ===
    let memoryWorkflow: any = {};
    let memoryCategories: any = {};
    let memoryModifiers: any = {};
    let memorySteps: any = {};
    let memoryItems: any = {};
    let memoryWorkflowMeta: any[] = []; // To easily scan for modifiers

    const allInspirations = [];
    if (activeSourceInspiration) allInspirations.push(activeSourceInspiration); // Inclut 'generique'
    
    // RÈGLE MÉTIER STRICTE : Aucune contamination (Fallback inter-cartes) autorisée
    // On ne charge plus les activeSecondaryInspirations.

    for (let index = 0; index < allInspirations.length; index++) {
        const f = allInspirations[index];
        try {
            let data;
            if (f === 'generique') {
                const { getGenericMasterTemplate } = require('../../lib/memory');
                data = JSON.parse(getGenericMasterTemplate());
            } else {
                // import moved to top
                const card = await cardService.getCardById(f);
                data = card ? card.content : {};
            }
            if (index === 0) { // BaseMap
               memoryWorkflow = data.workflow || {};
               
               // Clonage de TOUTES les propriétés natives racines
               Object.keys(data).forEach(key => {
                   if (!['workflow', 'categories', 'items', 'modifier', 'steps', 'theme', 'title', 'allergens', 'allergenGroups', 'shoplist', 'idEntite'].includes(key)) {
                       // Clone profond pour éviter les références
                       (finalData as any)[key] = JSON.parse(JSON.stringify(data[key]));
                   }
               });

               // Écrasement du nom du restaurant (Company) dans la shoplist d'origine pour éviter les vieux noms (ex: Softavera)
               if ((finalData as any).shoplist && typeof (finalData as any).shoplist === 'object') {
                   const shopKeys = Object.keys((finalData as any).shoplist);
                   shopKeys.forEach(shopId => {
                       const shop = (finalData as any).shoplist[shopId];
                       if (restaurantName) shop.Company = restaurantName;
                       // Nettoyage des "undefined" strings illégaux
                       Object.keys(shop).forEach(k => {
                           if (shop[k] === "undefined") shop[k] = null;
                       });
                   });
               }
            }
            Object.assign(memoryCategories, data.categories || {});
            Object.assign(memoryModifiers, data.modifier || {});
            Object.assign(memorySteps, data.steps || {});
            Object.assign(memoryItems, data.items || {});
            
            // Build a meta-structure to find modifiers easily
            if (data.workflow) {
                Object.keys(data.workflow).forEach(wCatId => {
                   const wfCat = data.workflow[wCatId];
                   const catTitle = (data.categories?.[wCatId]?.title || "").toLowerCase();
                   let foundModId = null;
                   if (wfCat.content) {
                       const firstItem = Object.values(wfCat.content)[0] as any;
                       if (firstItem && firstItem.type === "items") {
                           const itmObjId = Object.keys(wfCat.content)[0];
                           
                           // ETK360 Native Mapping: Le modifier est dans wfCat.content[itm].content
                           if (firstItem.content) {
                               const innerKeys = Object.keys(firstItem.content);
                               for (const mk of innerKeys) {
                                   if (firstItem.content[mk].type === 'modifier') {
                                       foundModId = mk;
                                       break;
                                   }
                               }
                           }
                           
                           if (!foundModId && firstItem.modifier) {
                               foundModId = firstItem.modifier;
                           }
                           
                           if (!foundModId) {
                               const itmObj = data.items?.[itmObjId];
                               if (itmObj && (itmObj.modifier || itmObj.m)) foundModId = itmObj.modifier || itmObj.m;
                           }
                       }
                   }
                   memoryWorkflowMeta.push({ catTitle: catTitle, modId: foundModId });
                });
            }
        } catch(e) {}
    }

    // L'utilisateur veut CONSERVER toute la base d'inspiration dans la carte générée.
    finalData.items = JSON.parse(JSON.stringify(memoryItems));
    finalData.steps = JSON.parse(JSON.stringify(memorySteps));
    finalData.modifier = JSON.parse(JSON.stringify(memoryModifiers));

    const ALLERGENS_REGISTRY: Record<string, string> = {
        'gluten': 'a1000000-0000-0000-0000-000000000001',
        'crustacé': 'a1000000-0000-0000-0000-000000000002',
        'crustace': 'a1000000-0000-0000-0000-000000000002',
        'oeuf': 'a1000000-0000-0000-0000-000000000003',
        'poisson': 'a1000000-0000-0000-0000-000000000004',
        'arachide': 'a1000000-0000-0000-0000-000000000005',
        'soja': 'a1000000-0000-0000-0000-000000000006',
        'lait': 'a1000000-0000-0000-0000-000000000007',
        'fromage': 'a1000000-0000-0000-0000-000000000007',
        'noix': 'a1000000-0000-0000-0000-000000000008',
        'fruit à coque': 'a1000000-0000-0000-0000-000000000008',
        'céleri': 'a1000000-0000-0000-0000-000000000009',
        'celeri': 'a1000000-0000-0000-0000-000000000009',
        'moutarde': 'a1000000-0000-0000-0000-000000000010',
        'sésame': 'a1000000-0000-0000-0000-000000000011',
        'sesame': 'a1000000-0000-0000-0000-000000000011',
        'sulfite': 'a1000000-0000-0000-0000-000000000012',
        'lupin': 'a1000000-0000-0000-0000-000000000013',
        'mollusque': 'a1000000-0000-0000-0000-000000000014'
    };

    const parseAllergens = (text: string) => {
        if (!text || typeof text !== 'string') return [];
        const found = new Set<string>();
        const lower = text.toLowerCase();
        for (const [key, uuid] of Object.entries(ALLERGENS_REGISTRY)) {
            if (lower.includes(key)) found.add(uuid);
        }
        return Array.from(found);
    };

    const buildBaseETK360Item = (rId: string, found: any) => {
        // Source de vérité : title en premier, sinon nameDef, sinon name
        const extractedTitle = found.title || found.t || found.displayName?.dflt?.nameDef || found.name || rId;
        const extractedDesc = typeof found.description === 'string' ? found.description : (found.description?.dflt?.nameDef || "");

        // Parsing Allergènes
        let itemAllergens = Array.isArray(found.allergens) && found.allergens.length > 0 ? found.allergens : [];
        if (itemAllergens.length === 0 && extractedDesc) {
            itemAllergens = parseAllergens(extractedDesc);
        }

        // Qty, prSize conversion
        let qtyNum = typeof found.qty === 'number' ? found.qty : parseInt(String(found.qty), 10);
        if (isNaN(qtyNum)) qtyNum = 1;
        
        let prSizeNum = typeof found.prSize === 'number' ? found.prSize : parseInt(String(found.prSize), 10);
        if (isNaN(prSizeNum)) prSizeNum = 0;

        // SizeList
        let sizeListArray = Array.isArray(found.sizeList) ? found.sizeList : [];

        // Description et displayName uniformisés (dflt object)
        const normalizedDescription = { dflt: { nameDef: extractedDesc, imp: [], salesSupport: {} } };
        const normalizedDisplayName = { dflt: { nameDef: extractedTitle, imp: [], salesSupport: {} } };

        // Résolution absolue du prix (Null ou Nombre)
        let rawTtc: number | null = null;
        const testPrice = found.price !== undefined ? found.price : found.p;
        if (testPrice !== undefined && testPrice !== null) {
            if (typeof testPrice === 'number') {
               rawTtc = testPrice;
            } else if (typeof testPrice.dflt === 'object' && testPrice.dflt !== null) {
               rawTtc = testPrice.dflt.ttc !== undefined ? testPrice.dflt.ttc : null;
            } else if (typeof testPrice.dflt === 'number') {
               rawTtc = testPrice.dflt;
            } else if (typeof testPrice.ttc === 'number') {
               rawTtc = testPrice.ttc;
            }
        } else if (found.priceTTC !== undefined) {
           rawTtc = found.priceTTC;
        }

        const safeId = typeof rId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rId) ? rId : require("crypto").randomUUID();

        const baseClone = JSON.parse(JSON.stringify(found));
        // Remove duplicate legacy properties and illegal AI-hallucinated keys
        delete baseClone.name;
        delete baseClone.id;
        delete baseClone.type;
        delete baseClone.qty;
        delete baseClone.options;
        delete baseClone.priceTTC;
        delete baseClone.image;
        delete baseClone.itemId;
        delete baseClone.products;

        const orderedItem: any = {};
        
        // Ordre canonique strict ETK360 v1
        orderedItem.fid = found.fid || 0;
        orderedItem.img = found.img || (found.image ? { dflt: { img: found.image, salesSupport: {} } } : { dflt: { img: "no-pictures.svg", salesSupport: {} } });
        orderedItem.ing = found.ing || {};
        orderedItem.opt = found.opt || {};
        orderedItem.ref = typeof found.ref === 'string' && found.ref.startsWith('REF_') ? found.ref : (found.ref || `REF_${String(safeId).substring(0,8)}`);
        orderedItem.menu = baseClone.menu !== undefined ? baseClone.menu : { 
            img: { dflt: { img: "", salesSupport: {} } }, 
            list: [], 
            title: {}, 
            isAfter: true, 
            isActive: false 
        };
        orderedItem.rank = found.rank ?? 0;
        orderedItem.unit = baseClone.unit !== undefined ? baseClone.unit : { 
            P: "", 
            isActive: false 
        };
        orderedItem.unity = found.unity || "";
        orderedItem.qty = found.qty || "0";
        orderedItem.color = found.color || "#FFFFFF";
        orderedItem.offer = baseClone.offer !== undefined ? baseClone.offer : { 
            x: 0, 
            y: 0, 
            type: 1, 
            isMax: false, 
            isEnabled: false, 
            serviceType: 1 
        };
        let masterSaleModeVAT: any[] = [];
        for (const k in memoryItems) {
            if (memoryItems[k]?.price?.saleModeVAT && Array.isArray(memoryItems[k].price.saleModeVAT)) {
                masterSaleModeVAT = memoryItems[k].price.saleModeVAT;
                break;
            }
        }
        if (masterSaleModeVAT.length === 0) {
            masterSaleModeVAT = [ { uuid: "3cb893e8-0f3a-4dcf-aab7-9545e97dfda7", value: 10 } ];
        }

        orderedItem.price = ((baseClone.price || baseClone.p) !== undefined && typeof (baseClone.price || baseClone.p) === 'object' && !Array.isArray(baseClone.price || baseClone.p)) ? (baseClone.price || baseClone.p) : { 
            ht: rawTtc ? Number((rawTtc / 1.1).toFixed(2)) : 0, 
            ovr: [], 
            tva: 10, 
            dflt: rawTtc || 0, 
            advanced: {}, 
            saleModeVAT: masterSaleModeVAT 
        };
        orderedItem.steps = baseClone.steps !== undefined ? baseClone.steps : [];
        if (found.modifier || found.m) orderedItem.modifier = found.modifier || found.m;
        orderedItem.title = extractedTitle;
        orderedItem.parent = found.parent || "";
        orderedItem.prSize = prSizeNum;
        orderedItem.showBc = found.showBc ?? true;
        orderedItem.archive = found.archive || false;
        orderedItem.barCode = found.barCode || "";
        orderedItem.extrRef = found.extrRef || "";
        orderedItem.liaison = Array.isArray(found.liaison) ? found.liaison : [];
        orderedItem.calories = found.calories ?? 0;
        orderedItem.outStock = found.outStock || false;
        orderedItem.printers = found.printers || [];
        orderedItem.sizeList = sizeListArray;
        orderedItem.suspSale = found.suspSale || [];
        orderedItem.variants = found.variants || [];
        orderedItem.allergens = itemAllergens;
        orderedItem.basicComp = found.basicComp || {};
        orderedItem.isComment = found.isComment || false;
        orderedItem.active_qty = found.active_qty || false;
        orderedItem.isRedirect = found.isRedirect || false;
        orderedItem.linkedTags = found.linkedTags || [];
        orderedItem.nutriScore = found.nutriScore || {};
        orderedItem.description = normalizedDescription;
        orderedItem.displayName = normalizedDisplayName;
        orderedItem.isTitleShow = found.isTitleShow ?? true;
        orderedItem.creationType = found.creationType || "catalogue";
        orderedItem.hideZeroPrice = found.hideZeroPrice || false;
        orderedItem.isOptionChoice = found.isOptionChoice || false;
        orderedItem.stepVisibility = baseClone.stepVisibility !== undefined ? baseClone.stepVisibility : { dflt: { "1": [1,2,0], "2": [1,2,0], "3": [1,2,0] }, isVisible: true, basicCompVisibility: true };
        orderedItem.visibilityInfo = baseClone.visibilityInfo !== undefined ? baseClone.visibilityInfo : { dflt: { "1": [1,2,0], "2": [1,2,0], "3": [1,2,0] }, isVisible: true, basicCompVisibility: true };

        // Copie de sécurité pour les clés natives non listées explicitement
        Object.keys(baseClone).forEach(k => {
            if (orderedItem[k] === undefined) {
                orderedItem[k] = baseClone[k];
            }
        });

        return orderedItem;
    };

    const buildBaseETK360Step = (sId: string, sRef: any) => {
        const baseClone = JSON.parse(JSON.stringify(sRef));
        delete baseClone.id;
        delete baseClone.stepItems;
        delete baseClone.options;

        return {
            ...baseClone,
            id: sId,
            ref: sRef.ref || sId,
            title: sRef.title || "Choix",
            archive: sRef.archive || false,
            isBasic: sRef.isBasic || false,
            isComment: sRef.isComment || false,
            stepItems: {}, // Sera peuplé manuellement
            maxChoices: sRef.maxChoices ?? 1,
            minChoices: sRef.minChoices ?? 0,
            displayName: sRef.displayName || { dflt: { imp: [], nameDef: sRef.title || "Choix", salesSupport: {} } },
            isModifiable: sRef.isModifiable ?? true,
            img: sRef.img !== undefined ? sRef.img : "",
            msg: sRef.msg !== undefined && sRef.msg !== "" ? sRef.msg : { dflt: { imp: [], salesSupport: {} } },
            req: sRef.req ?? false,
            nbrWithPrice: sRef.nbrWithPrice ?? null,
            nbrWithspecialPrice: sRef.nbrWithspecialPrice ?? null,
            specificOpts: {
                isNext: true,
                noButton: false,
                zeroPrice: false,
                isCheapest: false,
                nextButton: false,
                isExpensive: false,
                withoutStep: false,
                ...(sRef.specificOpts || {})
            },
            rank: sRef.rank || 0
        };
    };

    const buildBaseETK360Modifier = (parentItemId: string, mRef: any = {}) => {
        return {
            "uuid-item": parentItemId,
            add: mRef.add || {},
            category: mRef.category || {},
            typeAdd: mRef.typeAdd ?? false,
            typeCateg: mRef.typeCateg ?? false,
            typeSteps: mRef.typeSteps ?? true,
            steps: {}
        };
    };

    // Genetic Scavenger Helper - DEEP CLONING (Zero Conflict UUIDs)
    const cloneGeneticModifier = (oldModId: string, parentItemId: string, fData: any): string | null => {
        const mod = memoryModifiers[oldModId];
        if (!mod) return null;
        
        const { randomUUID } = require("crypto");
        const newModId = randomUUID();
        
        fData.modifier[newModId] = buildBaseETK360Modifier(parentItemId, mod);
        
        if (mod.steps) {
            Object.keys(mod.steps).forEach(oldStepId => {
                const stp = memorySteps[oldStepId];
                if (!stp) return;
                
                const newStepId = randomUUID();
                fData.modifier[newModId].steps[newStepId] = {
                    ovr: mod.steps[oldStepId]?.ovr || {},
                    rank: mod.steps[oldStepId]?.rank || 1,
                    items: mod.steps[oldStepId]?.items || {}
                };
                fData.steps[newStepId] = buildBaseETK360Step(newStepId, stp);
                
                const sourceItems = stp.stepItems || stp.items || stp.values || {};
                
                if (sourceItems) {
                    Object.keys(sourceItems).forEach(oldItemId => {
                        const itm = memoryItems[oldItemId];
                        if (!itm) return;
                        
                        const newItemId = oldItemId;
                        fData.steps[newStepId].stepItems[newItemId] = { 
                            rank: sourceItems[oldItemId]?.rank || 0,
                            itemPrice: sourceItems[oldItemId]?.itemPrice || { price: {}, isVisible: false },
                            priceStep: sourceItems[oldItemId]?.priceStep || 0,
                            nbrWithPrice: sourceItems[oldItemId]?.nbrWithPrice ?? null,
                            specialPrice: sourceItems[oldItemId]?.specialPrice || 0,
                            basicCompVisibility: sourceItems[oldItemId]?.basicCompVisibility ?? true,
                            nbrWithspecialPrice: sourceItems[oldItemId]?.nbrWithspecialPrice ?? null
                        };
                        
                        if (!fData.items[newItemId]) {
                            fData.items[newItemId] = buildBaseETK360Item(newItemId, itm);
                            if (itm.modifier) {
                                const nestedModId = cloneGeneticModifier(itm.modifier, newItemId, fData);
                                if (nestedModId) fData.items[newItemId].modifier = nestedModId;
                            }
                        }
                        
                        // Remap the override pointer if it exists in the modifier configuration
                        if (fData.modifier[newModId].steps[newStepId].items && mod.steps[oldStepId].items && mod.steps[oldStepId].items[oldItemId]) {
                             fData.modifier[newModId].steps[newStepId].items[newItemId] = mod.steps[oldStepId].items[oldItemId];
                        }
                    });
                }
            });
        }
        return newModId;
    };

    const aiStepRegistry = new Map<string, string>(); // hash -> stepId

    const hashStep = (aiStep: any): string => {
        const title = (aiStep.title || "Choix").toLowerCase();
        const min = typeof aiStep.minChoices === 'number' ? aiStep.minChoices : 0;
        const max = typeof aiStep.maxChoices === 'number' ? aiStep.maxChoices : 1;
        const opts = (aiStep.options || aiStep.items || []).map((o: any) => o.name || o.title || "").sort().join("|");
        return `${title}_${min}_${max}_${opts}`;
    };

    // Nouveau Moteur de Rendu : Transformateur natif (AI 'steps' array -> ETK360 nested dictionary)
    const buildNativeModifierFromAiSteps = (aiSteps: any[], parentItemId: string, fData: any): string => {
        const { randomUUID } = require("crypto");
        const newModId = randomUUID();
        
        fData.modifier[newModId] = buildBaseETK360Modifier(parentItemId);
        
        aiSteps.forEach((aiStep, sIndex) => {
            const stepHash = hashStep(aiStep);
            let newStepId = aiStepRegistry.get(stepHash);
            
            if (!newStepId) {
                newStepId = randomUUID();
                aiStepRegistry.set(stepHash, newStepId);
                
                fData.steps[newStepId] = {
                    ref: `STEP_${newStepId.substring(0,6)}`,
                    title: aiStep.title || "Choix",
                    archive: false,
                    isBasic: false,
                    isComment: false,
                    stepItems: {},
                    maxChoices: typeof aiStep.maxChoices === 'number' ? aiStep.maxChoices : 1,
                    minChoices: typeof aiStep.minChoices === 'number' ? aiStep.minChoices : 0,
                    displayName: { dflt: { imp: [], nameDef: aiStep.title || "Choix", salesSupport: {} } },
                    isModifiable: true,
                    img: "",
                    req: false,
                    nbrWithPrice: 0,
                    nbrWithspecialPrice: 0,
                    specificOpts: {
                        isNext: true,
                        noButton: false,
                        nextButton: false,
                        zeroPrice: false,
                        isCheapest: false,
                        isExpensive: false
                    }
                };
                
                const aiOptions = aiStep.options || aiStep.items || [];
                aiOptions.forEach((opt: any, oIndex: number) => {
                    let optId = opt.id;
                    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                    
                    if (!optId || !isUUID(optId) || !memoryItems[optId]) {
                       const foundKey = Object.keys(memoryItems).find(k => {
                           const mItm = memoryItems[k];
                           const title = mItm.displayName?.dflt?.nameDef || mItm.title || mItm.name;
                           const optTitle = opt.name || opt.title;
                           return title && optTitle && title.toLowerCase() === optTitle.toLowerCase();
                       });
                       optId = (foundKey && isUUID(foundKey)) ? foundKey : (optId && isUUID(optId) ? optId : randomUUID());
                    }
                    
                    fData.steps[newStepId].stepItems[optId] = {
                        rank: oIndex + 1,
                        price: 0,
                        itemPrice: { price: {}, isVisible: false },
                        priceStep: opt.priceDelta || opt.price || 0,
                        nbrWithPrice: null,
                        specialPrice: 0,
                        minChoices: 0,
                        maxChoices: null,
                        basicCompVisibility: true,
                        nbrWithspecialPrice: null
                    };
                    
                    if (!fData.items[optId]) {
                        const sourceItm = memoryItems[optId];
                        if (sourceItm) {
                            fData.items[optId] = buildBaseETK360Item(optId, sourceItm);
                            if (sourceItm.modifier) {
                                const nestedModId = cloneGeneticModifier(sourceItm.modifier, optId, fData);
                                if (nestedModId) fData.items[optId].modifier = nestedModId;
                            }
                        } else {
                            fData.items[optId] = buildBaseETK360Item(optId, opt);
                        }
                    }
                });
            }
            
            fData.modifier[newModId].steps[newStepId] = {
                ovr: {},
                rank: sIndex + 1,
                items: {},
                msg: { 
                    "0": { fr: aiStep.title || "Choix", en: "" }, 
                    "1": { fr: "" } 
                }
            };
        });
        
        return newModId;
    };

    const normalizeCategory = (name: string): string => {
        if (!name) return "";
        const n = name.toLowerCase();
        if (n.match(/pizza|pizzas/)) return "pizza";
        if (n.match(/boisson|boissons|soft|softs|drink|drinks|soda/)) return "boisson";
        if (n.match(/dessert|desserts|glace|glaces|sucre|sucré|milkshake|smoothie|açaï/)) return "dessert";
        if (n.match(/burger|burgers|sandwich|hamburger/)) return "burger";
        if (n.match(/menu|menus|formule|formules|combo|combos|brunch/)) return "menu";
        if (n.match(/salade|salades|bowl|pokebowl/)) return "salade";
        if (n.match(/accompagnement|frite|frites|potatoes|side|tapas|partager/)) return "accompagnement";
        if (n.match(/tacos|wrap|wraps/)) return "tacos";
        if (n.match(/enfant|kids/)) return "enfant";
        return n.replace(/nos /g, "").trim(); // Remove generic prefixes
    };

    const getScavengedModifierForCategory = (aiCatName: string) => {
        const needle = aiCatName.toLowerCase();
        const normalNeedle = normalizeCategory(needle);

        // Blocage strict : Ne jamais appliquer un modifier de Pizza/Burger/Tacos à une Boisson/Dessert
        const isPlat = ["pizza", "burger", "tacos", "salade", "accompagnement"].includes(normalNeedle);
        const isBoisson = normalNeedle === "boisson";
        const isDessert = normalNeedle === "dessert";

        // 1. Sémantique métier stricte
        for (const meta of memoryWorkflowMeta) {
            const metaNorm = normalizeCategory(meta.catTitle);
            
            // Protection Croisée (Cross-Contamination)
            if (isBoisson && metaNorm !== "boisson") continue;
            if (isDessert && metaNorm !== "dessert") continue;
            if (isPlat && (metaNorm === "boisson" || metaNorm === "dessert")) continue;

            if (meta.modId && ((metaNorm === normalNeedle) || (normalNeedle !== "" && normalNeedle.length > 3 && meta.catTitle.includes(normalNeedle)))) {
                return meta.modId;
            }
        }

        // 2. Fallback de sécurité (si même profil)
        for (const meta of memoryWorkflowMeta) {
            const metaNorm = normalizeCategory(meta.catTitle);
            if (isBoisson && metaNorm !== "boisson") continue;
            if (isDessert && metaNorm !== "dessert") continue;
            if (isPlat && (metaNorm === "boisson" || metaNorm === "dessert")) continue;

            if (meta.modId && (needle.includes(meta.catTitle) || meta.catTitle.includes(needle))) {
                return meta.modId;
            }
        }
        
        // 3. Fallback désactivé sur demande de l'utilisateur : ne jamais injecter un modifier d'une autre famille
        // Même si c'est un "Plat", un Burger ne doit pas donner ses options à une Pizza.

        // AUDIT : Logging en cas de non-classification / silencieux pour les outils d'observation
        console.warn(`[AUDIT RAG] Aucun modifier métier trouvé pour la catégorie : "${needle}" (Classifiée: ${normalNeedle}). L'item sera injecté pur (sans modifier).`);

        return null; // Pas de modifier sûr détecté
    };

    // === CLASSIFICATION PRODUIT SIMPLE vs COMPOSÉ ===
    // Boissons / desserts / accompagnements => produits SIMPLES (jamais de menu/option).
    // Le reste (burgers, pizzas, tacos, sandwichs, salades, menus...) => COMPOSÉ (éligible aux formules).
    const getProductType = (aiCatName: string, aiItem: any): "simple" | "compose" => {
        const n = normalizeCategory(aiCatName || "");

        // 1. Déduction métier PRIORITAIRE par catégorie. La famille est plus fiable
        //    que le champ "type" souvent mal deviné par l'IA (qui classe régulièrement
        //    une pizza/un burger en "simple" car le menu source n'affiche pas d'options).
        //    - Boissons / desserts / accompagnements => toujours SIMPLES (aucun choix).
        if (["boisson", "dessert", "accompagnement"].includes(n)) return 'simple';
        //    - Plats principaux (pizzas, burgers, tacos, sandwichs, salades, menus, enfant)
        //      => toujours COMPOSÉS : éligibles aux formules (Menu/Maxi) et aux options.
        if (["pizza", "burger", "tacos", "salade", "menu", "enfant"].includes(n)) return 'compose';

        // 2. Catégorie ambiguë : on respecte le type explicite fourni par l'IA.
        const explicit = typeof aiItem === 'object' ? (aiItem.type || aiItem.kind) : null;
        if (explicit === 'simple') return 'simple';
        if (explicit === 'compose' || explicit === 'composed' || explicit === 'menu') return 'compose';

        // 3. Par défaut : composé.
        return 'compose';
    };

    // === CONSTRUCTION DU STEP "FORMULE" (Taille Standard / Maxi) ===
    // Transforme les formules du formulaire en une vraie étape de choix visible et tarifée.
    // Retourne le stepId créé, ou null si aucune déclinaison pertinente n'est active.
    const buildSizeOptionStep = (fData: any, sizeConfig: any): string | null => {
        const { randomUUID } = require("crypto");
        const choices: { name: string; delta: number; fav: boolean }[] = [];
        // "À l'unité" sert de base (delta 0) dès qu'au moins une formule payante existe.
        const hasMenu = !!sizeConfig?.isMenu;
        const hasMaxi = !!sizeConfig?.isMaxi;
        if (!hasMenu && !hasMaxi) return null;

        choices.push({ name: "À l'unité", delta: 0, fav: true });
        if (hasMenu) choices.push({ name: "Menu", delta: Number(sizeConfig.menuPrice) || 0, fav: false });
        if (hasMaxi) choices.push({ name: "Menu Maxi", delta: Number(sizeConfig.maxiPrice) || 0, fav: false });
        if (choices.length < 2) return null;

        const stepId = randomUUID();
        fData.steps[stepId] = {
            ref: `STEP_SIZE_${stepId.substring(0, 6)}`,
            title: "📏 Choisissez votre formule",
            archive: false,
            isBasic: false,
            isComment: false,
            stepItems: {},
            maxChoices: 1,
            minChoices: 1,
            displayName: { dflt: { imp: [], nameDef: "Choisissez votre formule", salesSupport: {} } },
            isModifiable: true,
            img: "",
            req: true,
            nbrWithPrice: 0,
            nbrWithspecialPrice: 0,
            specificOpts: { isNext: true, noButton: false, nextButton: false, zeroPrice: false, isCheapest: false, isExpensive: false }
        };

        choices.forEach((c, i) => {
            const optItemId = randomUUID();
            // Item marqueur (non rattaché à une catégorie : invisible hors de l'étape)
            fData.items[optItemId] = buildBaseETK360Item(optItemId, { title: c.name, price: 0, description: "" });
            fData.steps[stepId].stepItems[optItemId] = {
                rank: i + 1,
                price: 0,
                itemPrice: { price: {}, isVisible: false },
                priceStep: c.delta,
                nbrWithPrice: null,
                specialPrice: 0,
                minChoices: 0,
                maxChoices: null,
                basicCompVisibility: true,
                nbrWithspecialPrice: null
            };
        });

        return stepId;
    };

    // === 2. HYBRID WORKFLOW GENERATION ===
    if (Object.keys(memoryWorkflow).length > 0) {
        finalData.workflow = memoryWorkflow; // Base Workflow Skeleton Preserved
        finalData.categories = JSON.parse(JSON.stringify(memoryCategories)); // Deep clone to preserve exactly raw JSON properties

        Object.keys(finalData.categories).forEach(cId => {
            finalData.categories[cId].id = cId;
            finalData.categories[cId].rank = finalData.workflow[cId]?.rank || 0;
            
            // L'utilisateur exige de CONSERVER la base source. On ne purge PLUS les catégories ni le workflow.
            if (!Array.isArray(finalData.categories[cId].items)) {
                finalData.categories[cId].items = []; // S'assurer que c'est un tableau
            }
            if (!Array.isArray(finalData.categories[cId].child)) {
                finalData.categories[cId].child = [];
            }
        });
    }

    if (sourceCategories.length > 0) {
        const { randomUUID } = require("crypto");
        const activeCategoryIds = new Set<string>();

        sourceCategories.forEach((aiCat: any, aiIndex: number) => {
            const aiCatName = aiCat.name || aiCat.nom || aiCat.title || aiCat.titre || "Nouvelle Catégorie";
            
            let targetCatId = null;
            const normalAICat = normalizeCategory(aiCatName);
            for (const wCatId of Object.keys(finalData.workflow)) {
                const wCatTitle = (finalData.categories[wCatId]?.title || "").toLowerCase();
                const normalWCat = normalizeCategory(wCatTitle);
                
                if (normalAICat === normalWCat || aiCatName.toLowerCase().includes(wCatTitle) || wCatTitle.includes(aiCatName.toLowerCase())) {
                    targetCatId = wCatId;
                    break;
                }
            }
            
            if (targetCatId) {
                activeCategoryIds.add(targetCatId);
            }

            if (!targetCatId) {
                targetCatId = randomUUID();
                activeCategoryIds.add(targetCatId);
                finalData.workflow[targetCatId] = { type: "categories", rank: 0, content: {} };
                finalData.categories[targetCatId] = {
                    img: { dflt: { img: "no-pictures.svg", salesSupport: {} } },
                    ref: `CAT_${targetCatId.substring(0,6)}`,
                    rank: 0,
                    child: [],
                    color: finalData.theme.palette[Math.floor(Math.random() * finalData.theme.palette.length)],
                    items: [],
                    title: aiCatName,
                    video: { url: "", type: "" },
                    idCard: "",
                    parent: "",
                    archive: false,
                    extrRef: "",
                    liaison: [],
                    isNameShow: true,
                    linkedTags: [],
                    description: { dflt: { imp: [], nameDef: "", salesSupport: {} } },
                    displayName: { dflt: { imp: [], nameDef: aiCatName, salesSupport: {} } },
                    linkedChild: {},
                    linkedItems: {},
                    visibilityInfo: { dflt: { 1: [], 2: [], 3: [], 4: [] }, isVisible: true, basicCompVisibility: true },
                    isInfoModeActive: true
                };
            }
            // FIX 2: Synchronize Rank perfectly with AI intention
            const currentCatRank = aiIndex + 1;
            finalData.workflow[targetCatId].rank = currentCatRank;
            finalData.categories[targetCatId].rank = currentCatRank;
            finalData.categories[targetCatId].title = aiCatName;
            finalData.categories[targetCatId].archive = false;

            // IMAGE FAMILLE : si aucune vraie image, on en génère une automatiquement (IA).
            const curCatImg = finalData.categories[targetCatId].img?.dflt?.img;
            if (isPlaceholderImg(curCatImg)) {
                finalData.categories[targetCatId].img = {
                    dflt: { img: buildAutoImage(aiCatName, foodKeywordForCategory(aiCatName)), salesSupport: {} }
                };
            }

            if (finalData.categories[targetCatId].visibilityInfo) {
                finalData.categories[targetCatId].visibilityInfo.isVisible = true;
            } else {
                finalData.categories[targetCatId].visibilityInfo = { dflt: { 1: [], 2: [], 3: [], 4: [] }, isVisible: true, basicCompVisibility: true };
            }
            
            if (!finalData.categories[targetCatId].items) finalData.categories[targetCatId].items = [];
            if (!finalData.categories[targetCatId].child) finalData.categories[targetCatId].child = [];

            let aiItemIds = aiCat.itemIds || aiCat.items || aiCat.products || [];
            
            if (aiItemIds && Array.isArray(aiItemIds)) {
                let itemRankCounter = Object.keys(finalData.workflow[targetCatId].content).length + 1;

                aiItemIds.forEach((aiItemId: any) => {
                    // Extract real item ID (if AI sent an object with id instead of string)
                    let realItemId = typeof aiItemId === 'string' ? aiItemId : (aiItemId.id || aiItemId.itemId);
                    if (!realItemId && typeof aiItemId === 'object' && (aiItemId.name || aiItemId.title || aiItemId.t)) {
                        realItemId = randomUUID();
                    }
                    if (!realItemId) return;
                    let sourceItem = memoryItems[realItemId];
                    
                    // FIX: Fuzzy Matcher pour contrer les hallucinations d'ID de l'IA
                    // Si l'IA invente un ID mais que le nom du produit existe dans la base locale, on le récupère
                    if (!sourceItem && typeof aiItemId === 'object') {
                        const aiName = (aiItemId.name || aiItemId.title || "").toLowerCase().trim();
                        if (aiName) {
                            const matchedKey = Object.keys(memoryItems).find(k => {
                                const mItm = memoryItems[k];
                                const title = (mItm.displayName?.dflt?.nameDef || mItm.title || mItm.name || "").toLowerCase().trim();
                                return title && (title === aiName || title.includes(aiName) || aiName.includes(title));
                            });
                            if (matchedKey) {
                                sourceItem = memoryItems[matchedKey];
                            }
                        }
                    }

                    // FEATURE : L'IA a généré l'item de façon dynamique (OCR ou invention contrainte)
                    if (!sourceItem) {
                        if (typeof aiItemId === 'object' && (aiItemId.name || aiItemId.title || aiItemId.t)) {
                            sourceItem = buildBaseETK360Item(realItemId, aiItemId);
                        } else {
                            const parsedAiItems = intermediate.items || intermediate.products || [];
                            if (Array.isArray(parsedAiItems)) {
                                const found = parsedAiItems.find((it: any) => it.id === realItemId || it.itemId === realItemId);
                                if (found) {
                                    sourceItem = buildBaseETK360Item(realItemId, found);
                                }
                            } else if (typeof parsedAiItems === 'object') {
                                const found = parsedAiItems[realItemId];
                                if (found) {
                                    sourceItem = buildBaseETK360Item(realItemId, found);
                                }
                            }
                        }
                    }

                    if (!sourceItem) return; // Véritable hallucination sans donnée source
                    
                    const newItemId = randomUUID();
                    finalData.items[newItemId] = JSON.parse(JSON.stringify(sourceItem));
                    // FIX 1: Assurer que l'item pointe bien sur sa catégorie visuelle parente
                    finalData.items[newItemId].parent = targetCatId;

                    // IMAGE PRODUIT : si aucune vraie image, on en génère une automatiquement (IA).
                    const curItemImg = finalData.items[newItemId].img?.dflt?.img;
                    if (isPlaceholderImg(curItemImg)) {
                        const itTitle = finalData.items[newItemId].title
                            || finalData.items[newItemId].displayName?.dflt?.nameDef
                            || "plat";
                        finalData.items[newItemId].img = {
                            dflt: { img: buildAutoImage(itTitle, foodKeywordForCategory(aiCatName)), salesSupport: {} }
                        };
                    }

                    // Injection des Steps OCR (Intelligence Artificielle pure)
                    if (sourceItem.steps && Array.isArray(sourceItem.steps) && sourceItem.steps.length > 0) {
                        const newModId = buildNativeModifierFromAiSteps(sourceItem.steps, newItemId, finalData);
                        finalData.items[newItemId].modifier = newModId;
                    } else {
                        // Sinon Fallback classique vers l'existant
                        const uniqueClonedModId = cloneGeneticModifier(sourceItem.modifier, newItemId, finalData);
                        if (uniqueClonedModId) {
                            finalData.items[newItemId].modifier = uniqueClonedModId;
                        } else {
                            const scavengedModId = getScavengedModifierForCategory(aiCatName);
                            if (scavengedModId) {
                                const scavCloneMod = cloneGeneticModifier(scavengedModId, newItemId, finalData);
                                if (scavCloneMod) finalData.items[newItemId].modifier = scavCloneMod;
                            }
                        }
                    }

                    // === TYPOLOGIE : produit SIMPLE vs COMPOSÉ + injection de la formule (Taille Standard/Maxi) ===
                    const prodType = getProductType(aiCatName, aiItemId);
                    if (prodType === 'simple') {
                        // Produit simple (boisson, dessert, accompagnement) : aucun choix.
                        // On retire tout modifier hérité ou scavengé pour le rendre réellement "à l'unité".
                        const orphanModId = finalData.items[newItemId].modifier;
                        if (orphanModId && finalData.modifier[orphanModId]) {
                            delete finalData.modifier[orphanModId];
                        }
                        delete finalData.items[newItemId].modifier;
                    } else if (formulas && (formulas.isMenu || formulas.isMaxi)) {
                        // Produit composé : on garantit un modifier, puis on injecte l'étape "Formule".
                        let modId = finalData.items[newItemId].modifier;
                        if (!modId || !finalData.modifier[modId]) {
                            modId = randomUUID();
                            finalData.modifier[modId] = buildBaseETK360Modifier(newItemId);
                            finalData.items[newItemId].modifier = modId;
                        }
                        const sizeStepId = buildSizeOptionStep(finalData, formulas);
                        if (sizeStepId) {
                            // rank 0 => la formule (Taille) est proposée en premier choix.
                            finalData.modifier[modId].steps[sizeStepId] = {
                                ovr: {},
                                rank: 0,
                                items: {},
                                msg: { "0": { fr: "Choisissez votre formule", en: "" }, "1": { fr: "" } }
                            };
                        }
                    }

                    // Multi-Channel Binding for ETK360 parser consistency
                    // The workflow is an array of channels (POS, KIOSK, WEB...)
                    Object.keys(finalData.workflow).forEach(channelKey => {
                        const channel = finalData.workflow[channelKey];
                        
                        // If the channel IS the category directly (flat architecture)
                        if (channelKey === targetCatId) {
                            if (!channel.content) channel.content = {};
                            channel.content[newItemId] = { 
                                type: "items", 
                                rank: itemRankCounter,
                                ovr: {},
                                content: {}
                            };
                        } 
                        // If it's a wrapper level (e.g. work_base -> category)
                        else if (channel.type !== "categories" && channel.content) {
                            if (!channel.content[targetCatId]) {
                                channel.content[targetCatId] = { type: "categories", rank: currentCatRank, content: {} };
                            }
                            if (!channel.content[targetCatId].content) {
                                channel.content[targetCatId].content = {};
                            }
                            channel.content[targetCatId].content[newItemId] = { 
                                type: "items", 
                                rank: itemRankCounter,
                                ovr: {},
                                content: {}
                            };
                        }
                    });
                    itemRankCounter++;
                    
                    // Dual Binding for ETK360 parser consistency (Restored per exact JSON specs)
                    if (!finalData.categories[targetCatId].items) finalData.categories[targetCatId].items = [];
                    
                    if (Array.isArray(finalData.categories[targetCatId].items)) {
                        if (!finalData.categories[targetCatId].items.includes(newItemId)) {
                            finalData.categories[targetCatId].items.push(newItemId);
                        }
                    } else {
                        finalData.categories[targetCatId].items = [newItemId];
                    }
                });
            }

            // RÈGLE MÉTIER : On conserve la catégorie même si elle est vide (0 produit valide).
            // Le Front-End (KioskSimulator) gèrera l'affichage "Aucun produit disponible".
            // Suppression du code de nettoyage agressif.
        });
        
        // Clean up unreferenced legacy categories completely to avoid empty or dirty data
        Object.keys(finalData.categories).forEach(cId => {
            if (!activeCategoryIds.has(cId)) {
                delete finalData.categories[cId];
                if (finalData.workflow[cId]) {
                    delete finalData.workflow[cId];
                }
            }
        });
    }
    
    // === 3. GRAPH INTEGRITY GARBAGE COLLECTOR (Safety Net) ===
    
    // Niveau 1: Nettoyage des items fantômes au sein des stepItems
    if (finalData.steps) {
        Object.keys(finalData.steps).forEach(sId => {
            const step = finalData.steps[sId];
            if (step.stepItems) {
                Object.keys(step.stepItems).forEach(iId => {
                    if (!finalData.items[iId]) {
                        delete step.stepItems[iId];
                    }
                });
            }
        });
    }

    // Niveau 2: Nettoyage des steps qui se retrouvent vides de choix
    if (finalData.steps) {
        Object.keys(finalData.steps).forEach(sId => {
            const step = finalData.steps[sId];
            if (!step.stepItems || Object.keys(step.stepItems).length === 0) {
                delete finalData.steps[sId];
            }
        });
    }

    // Niveau 3: Curetage des Modifiers qui pointeraient vers un step mort
    if (finalData.modifier) {
        Object.keys(finalData.modifier).forEach(mId => {
            const mod = finalData.modifier[mId];
            if (mod.steps) {
                Object.keys(mod.steps).forEach(sId => {
                    if (!finalData.steps[sId]) {
                        delete mod.steps[sId];
                    }
                });
                
                // Note : En ETK360 un modifier vide de steps est juste un "pass-through", 
                // il ne fait pas crasher la borne, il s'auto-bypass. On le garde légalement.
            }
        });
    }

    // Inject UI Theme Metadata into the map so KioskSimulator can dynamically style the view
    finalData.themeMetadata = {
        typeLabel: systemConfig?.typeLabel || "Standard",
        theme: systemConfig?.visualTheme || "Classique",
        style: systemConfig?.visualStyle || "Moderne"
    };

    // Appliquer le Healer (Patchs anti-hallucinations, failsafes et padding 1000 articles)
    patchETK360Structure(finalData);

    // === 4. SINGLE SOURCE OF TRUTH VALIDATION WALL ===
    const verifySchemaIntegrity = (data: any) => {
        const rootItems = data.items || {};
        const rootCats = data.categories || {};
        const rootWf = data.workflow || {};
        
        // Check 1: Workflow roots must exist in Categories
        for (const wCatId of Object.keys(rootWf)) {
            if (rootWf[wCatId].type === "categories" && !rootCats[wCatId]) {
                throw new Error(`Workflow root category '${wCatId}' is missing from final categories.`);
            }
        }
        
        // Check 2: All items referenced in workflow MUST exist in global items, and rank collisions
        for (const rootKey of Object.keys(rootWf)) {
            const rootNode = rootWf[rootKey];
            if (rootNode.type === "categories") {
                const content = rootNode.content || {};
                const ranks = new Set();
                
                for (const itemId of Object.keys(content)) {
                    if (!rootItems[itemId]) {
                        throw new Error(`Item '${itemId}' is referenced in workflow '${rootKey}' but is totally absent from global database.`);
                    }
                    const r = content[itemId].rank;
                    if (r !== undefined && r !== null) {
                        if (ranks.has(r)) {
                            console.warn(`[INTEGRITY] Rank Collision in '${rootKey}': rank ${r}. ETK360 might sort them alphabetically.`); 
                        }
                        ranks.add(r);
                    }
                }
            } else if (rootNode.content) {
                // Wrapper level (e.g. POS, APP, KIOSK)
                for (const catKey of Object.keys(rootNode.content)) {
                    const catNode = rootNode.content[catKey];
                    if (catNode.type === "categories" && catNode.content) {
                        const ranks = new Set();
                        for (const itemId of Object.keys(catNode.content)) {
                            if (!rootItems[itemId]) {
                                throw new Error(`Item '${itemId}' is referenced in workflow '${catKey}' but is totally absent from global database.`);
                            }
                            const r = catNode.content[itemId].rank;
                            if (r !== undefined && r !== null) {
                                if (ranks.has(r)) console.warn(`[INTEGRITY] Rank Collision in '${catKey}': rank ${r}.`);
                                ranks.add(r);
                            }
                        }
                    }
                }
            }
        }
        
        // Check 3: Categories Dual Binding Check
        for (const cId of Object.keys(rootCats)) {
            const catItems = rootCats[cId].items;
            if (Array.isArray(catItems)) {
                for (const itemId of catItems) {
                    if (typeof itemId === 'string' && !rootItems[itemId]) {
                        throw new Error(`Item '${itemId}' is tied to category '${cId}' but does NOT exist in global database.`);
                    }
                }
            } else if (catItems && typeof catItems === 'object') {
                for (const itemId of Object.keys(catItems)) {
                    if (!rootItems[itemId]) {
                        throw new Error(`Item '${itemId}' is tied to category '${cId}' but does NOT exist in global database.`);
                    }
                }
            }
        }
        
        // Check 4: Enforce strict ETK360 v1 isomorphism on Categories (Clean dirty legacy data)
        for (const cId of Object.keys(rootCats)) {
            const cat = rootCats[cId];
            delete cat.id; // Root ID is illegal
            delete cat.isVisible; // Must rely on visibilityInfo instead
            if (!Array.isArray(cat.idCard)) cat.idCard = []; // Force array
            if (cat.extrRef === undefined) cat.extrRef = "";
            if (cat.isInfoModeActive === undefined) cat.isInfoModeActive = true;
        }

        return true;
    };

    try {
        verifySchemaIntegrity(finalData);
    } catch (e: any) {
        console.error("FATAL ETK360 GENERATION PARSE:", e.message);
        return JSON.stringify({ success: false, error: `Validation de structure échouée: ${e.message}` });
    }
    const orderedRootFields = [
        "opt", "etat", "tags", "color", "items", "steps", "title", "remark", 
        "status", "Planning", "idEntite", "modifier", "operator", "shoplist", 
        "workflow", "allergens", "isAutoRef", "categories", "workflowList", 
        "isUniqueTitle", "allergenGroups", "dateModification", "iuudCardReference"
    ];

    const orderedFinalData: any = {};
    
    // 1. Force the strict order for recognized fields and inject defaults for perfect isomorphism
    for (const key of orderedRootFields) {
        if (finalData[key] !== undefined) {
            orderedFinalData[key] = finalData[key];
        } else {
            // Force injection of ETK360 mandatory empty fields if missing
            if (["opt", "tags", "shoplist", "allergens", "workflowList", "allergenGroups"].includes(key)) {
                orderedFinalData[key] = {};
            } else if (key === "idEntite") {
                orderedFinalData[key] = [];
            } else if (key === "isAutoRef" || key === "isUniqueTitle") {
                orderedFinalData[key] = false;
            } else if (key === "iuudCardReference") {
                orderedFinalData[key] = 0;
            } else if (key === "theme") {
                orderedFinalData[key] = { palette: ["#4F46E5", "#10B981", "#F59E0B"] };
            } else if (key === "etat" || key === "status") {
                orderedFinalData[key] = "En attente";
            } else if (key === "operator") {
                orderedFinalData[key] = "Administrateur";
            } else {
                orderedFinalData[key] = "";
            }
        }
    }


    let jsonResponse = JSON.stringify(orderedFinalData, null, 2);

    if (sauvegarder) {
      const timestamp = Date.now();
      let safeNameRaw = restaurantName || "Restaurant IA";
      
      // Cleanup de la chaine (on retire le "Je veux un vrai restaurant de : ") pour le filename
      safeNameRaw = safeNameRaw.replace("Je veux un vrai restaurant de : ", "");
      const storeName = safeNameRaw.slice(0, 30);
      
      // import moved to top
      // La génération IA a déjà réussi : si la sauvegarde en base échoue
      // (DB injoignable, timeout...), on ne jette PAS le travail. On renvoie
      // quand même le JSON généré pour que l'utilisateur puisse le visualiser
      // et le télécharger, avec un avertissement explicite.
      try {
        const newCard = await cardService.createCard({
            store_name: storeName,
            content: orderedFinalData
        });

        // Ajouter le log de création
        if (newCard?.id) {
          addLog(newCard.id, 'CREATE', 'Carte générée avec succès par l\'IA.');
        }

        return JSON.stringify({ success: true, json: jsonResponse, savedPath: newCard?.id || null });
      } catch (dbErr: any) {
        console.error("Sauvegarde DB échouée (carte générée conservée) :", dbErr?.message);
        return JSON.stringify({
          success: true,
          json: jsonResponse,
          savedPath: null,
          dbWarning: `La carte a bien été générée, mais elle n'a pas pu être enregistrée en base de données (${dbErr?.message || 'erreur inconnue'}). Vous pouvez la visualiser et la télécharger ci-dessous.`
        });
      }
    }

    return JSON.stringify({ success: true, json: jsonResponse, savedPath: null });

  } catch (error: any) {
    console.error(`Erreur Mapping Backend Phase 2 :`, error);
    return JSON.stringify({ success: false, error: `Erreur interne : ${error.message}` });
  }
}

export async function getAvailableLibraryCards() {
  try {
    // import moved to top
    const cards = await cardService.getAllCards();
    return cards.map((c: any) => c.id);
  } catch (e) {
    console.error("Erreur read library:", e);
    return [];
  }
}
