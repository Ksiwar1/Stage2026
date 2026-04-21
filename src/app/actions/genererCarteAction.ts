'use server';

import { extractTrueDataFromCatalogue } from "../../lib/memory";
import { generateAIResponse, getAILabel, getAIType } from "../../lib/aiClient";
import { validateETK360Code } from "../../lib/aiValidator";
import { patchETK360Structure } from "../../lib/autoHealer";
import fs from "fs";
import path from "path";

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
      'fastfood': 'carte1_smash_up.json',
      'pizzeria': 'carte3_grill_station.json',
      'tacos': 'carte4_bsb_franchise.json',
      'gastronomique': 'carte5_etoile_orientale.json',
      'standard': 'carte2_o3k.json'
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

  // RAG Semantic Profiling
  const docsDescriptions = availableDocs.map(f => {
      try {
          const content = JSON.parse(fsLib.readFileSync(pathLib.join(process.cwd(), '.softavera', 'carte', f), 'utf-8'));
          const catTitles = content.categories ? Object.values(content.categories).map((c:any) => c.title).slice(0, 3).join(", ") : "Inconnu";
          return `${f} (Thème: ${content.title || 'Inconnu'} | Catégories: ${catTitles})`;
      } catch(e) { return f; }
  });

  if (!activeSourceInspiration || activeSourceInspiration === 'generique') {
    console.log("[RAG] Auto-sélection intelligente des templates algorithmiques...");
    const ragSys = `Tu es un agent RAG expert en Data Structuration.
Ton objectif est de choisir la carte existante qui correspond structurellement le mieux à la demande du client.
Fichiers templates disponibles :
${docsDescriptions.join("\n")}

La demande métier (Type de resto) est : "${sujetDemande}". 
Réponds UNIQUEMENT par le texte brut, en listant le MEILLEUR fichier de base pour fusionner la structure, suivi d'éventuels 1 ou 2 autres intéressants, séparés par des virgules (ex: "ia_pizza.json, ia_sandwich.json"). 
Si et seulement si absolument AUCUNE carte de la liste ne permet une bonne base structurelle pour la demande, renvoie "generique".`;
    
    try {
      const ragRes = await generateAIResponse(ragSys, "Analyse le RAG", 0.1, "gemini");
      const selectedFiles = ragRes.replace(/```(json)?/gi, "").replace(/\n/g, ",").split(',').map(s => s.trim());
      const validFiles = selectedFiles.filter(f => availableDocs.includes(f));

      if (validFiles.length > 0) {
        activeSourceInspiration = validFiles[0];
        activeSecondaryInspirations = validFiles.slice(1, maxSecondary + 1);
        console.log(`[RAG] BASE SÉLECTIONNÉE : ${activeSourceInspiration}`);
      } else {
        activeSourceInspiration = 'generique';
        activeSecondaryInspirations = availableDocs.slice(0, maxSecondary);
        console.log(`[RAG] BASE GÉNÉRIQUE (Aucun match trouvé)`);
      }
    } catch (e) {
      activeSourceInspiration = 'generique';
      activeSecondaryInspirations = availableDocs.slice(0, maxSecondary);
    }
  } else {
    activeSecondaryInspirations = availableDocs
      .filter(doc => doc !== activeSourceInspiration && doc !== 'generique')
      .slice(0, maxSecondary);
  }

  try {
        const trueDataStr = extractTrueDataFromCatalogue(pathLib.join(process.cwd(), '.softavera', 'carte', activeSourceInspiration));
    let trueDataSection = "";
    if (trueDataStr) {
        trueDataSection = `\nVOICI LA SEULE BASE DE DONNÉES DE PRODUITS AUTORISÉE (La Source de Vérité) :\n\`\`\`json\n${trueDataStr}\n\`\`\`\n\nRÈGLES ABSOLUES :\n1. Tu ne dois utiliser QUE les identifiants présents dans 'AVAILABLE_ITEMS'.\n2. N'invente AUCUN produit qui n'est pas dans cette liste. L'invention de prix, de noms ou d'IDs est strictement interdite.\n3. Si la demande du client ou l'OCR mentionne un produit absent de la liste, trouve le produit le plus proche sémantiquement dans la liste.\n`;
    }

    console.log("[PHASE 1] Génération de la Trame Intermédiaire...");
    const promptSysteme1 = `Tu es un assistant restaurateur. Tu dois répondre STRICTEMENT en format JSON pur, sans texte MD. Tu vas créer un mappage de menu.${trueDataSection}
Format attendu:
{
  "categories": [
    {
      "name": "Catégorie 1",
      "itemIds": ["id_item_real_1", "id_item_real_2"]
    }
  ]
}
INSTRUCTION EXTRÊMEMENT CRITIQUE: Tu dois OBLIGATOIREMENT générer EXACTEMENT les catégories demandées par l'utilisateur du début à la fin (ex: Menus, Boissons, Desserts). Interdiction ABSOLUE d'en oublier une seule ! Si une catégorie est vide d'items, tu retournes quand même la catégorie avec "itemIds": [].
AUCUN texte additionnel.`;

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
    let originalTheme: any = { palette: ["#4F46E5", "#10B981", "#F59E0B"] };
    if (activeSourceInspiration && activeSourceInspiration !== 'generique') {
        try {
            const fsLib = require('fs');
            const pathLib = require('path');
            const refPath = pathLib.join(process.cwd(), '.softavera', 'carte', activeSourceInspiration);
            const refData = JSON.parse(fsLib.readFileSync(refPath, 'utf-8'));
            if (refData.theme && refData.theme.palette) {
                originalTheme = refData.theme;
            }
        } catch(e) {
            console.error("Erreur récupération thème", e);
        }
    }

    if (primaryColor) originalTheme.palette[0] = primaryColor;
    if (secondaryColor) originalTheme.palette[1] = secondaryColor;
    if (primaryColor) originalTheme.palette[2] = primaryColor;
    
    // Initialisation exacte du format ETK360
    const finalData = {
        title: restaurantName || "Nouveau Restaurant",
        theme: originalTheme,
        workflow: {} as any,
        categories: {} as any,
        items: {} as any,
        modifier: {} as any,
        steps: {} as any
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
    if (activeSourceInspiration && activeSourceInspiration !== 'generique') allInspirations.push(activeSourceInspiration);
    activeSecondaryInspirations.forEach((f:string) => {
        if (!allInspirations.includes(f)) allInspirations.push(f);
    });

    allInspirations.forEach((f, index) => {
        try {
            const data = JSON.parse(fsLib.readFileSync(pathLib.join(process.cwd(), '.softavera', 'carte', f), 'utf-8'));
            if (index === 0) { // BaseMap
               memoryWorkflow = data.workflow || {};
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
                           // Find the item in memoryItems to see its modifier
                           const itmObjId = Object.keys(wfCat.content)[0];
                           const itmObj = data.items?.[itmObjId];
                           if (itmObj && itmObj.modifier) foundModId = itmObj.modifier;
                       }
                   }
                   memoryWorkflowMeta.push({ catTitle: catTitle, modId: foundModId });
                });
            }
        } catch(e) {}
    });

    // Genetic Scavenger Helper - DEEP CLONING (Zero Conflict UUIDs)
    const cloneGeneticModifier = (oldModId: string, parentItemId: string, fData: any): string | null => {
        const mod = memoryModifiers[oldModId];
        if (!mod) return null;
        
        const { randomUUID } = require("crypto");
        const newModId = randomUUID();
        
        fData.modifier[newModId] = { ...mod, "uuid-item": parentItemId, steps: {} }; 
        
        if (mod.steps) {
            Object.keys(mod.steps).forEach(oldStepId => {
                const stp = memorySteps[oldStepId];
                if (!stp) return;
                
                const newStepId = randomUUID();
                fData.modifier[newModId].steps[newStepId] = { ...mod.steps[oldStepId] };
                fData.steps[newStepId] = { ...stp, items: {} };
                
                if (stp.items) {
                    Object.keys(stp.items).forEach(oldItemId => {
                        const itm = memoryItems[oldItemId];
                        if (!itm) return;
                        
                        const newItemId = randomUUID();
                        fData.steps[newStepId].items[newItemId] = { ...stp.items[oldItemId] };
                        fData.items[newItemId] = { ...itm };
                        
                        if (itm.modifier) {
                            const nestedModId = cloneGeneticModifier(itm.modifier, newItemId, fData);
                            if (nestedModId) fData.items[newItemId].modifier = nestedModId;
                        }
                    });
                }
            });
        }
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
        
        // 3. Fallback d'Urgence absolu : Seulement pour les PLATS si isMenu=true
        if (systemConfig?.formulas?.isMenu && isPlat) {
            const fallbackMenu = memoryWorkflowMeta.find(m => normalizeCategory(m.catTitle) === "menu" && m.modId);
            if (fallbackMenu) return fallbackMenu.modId;
        }

        // AUDIT : Logging en cas de non-classification / silencieux pour les outils d'observation
        console.warn(`[AUDIT RAG] Aucun modifier métier trouvé pour la catégorie : "${aiCatName}" (Classifiée: ${normalNeedle}). L'item sera injecté pur (sans modifier).`);

        return null; // Pas de modifier sûr détecté
    };

    // === 2. HYBRID WORKFLOW GENERATION ===
    if (Object.keys(memoryWorkflow).length > 0) {
        finalData.workflow = memoryWorkflow; // Base Workflow Skeleton Preserved
        finalData.categories = { ...memoryCategories }; // Base Categories Preserved for labels

        // We clean the content of the workflow to insert our brand new AI items
        Object.keys(finalData.workflow).forEach(k => {
            if (finalData.workflow[k].content) {
                finalData.workflow[k].content = {};
            }
        });
    }

    if (sourceCategories.length > 0) {
        const { randomUUID } = require("crypto");
        let fallbackCatRank = Object.keys(finalData.workflow).length + 1;

        sourceCategories.forEach((aiCat: any) => {
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

            if (!targetCatId) {
                targetCatId = randomUUID();
                finalData.workflow[targetCatId] = { type: "categories", rank: fallbackCatRank++, content: {} };
                finalData.categories[targetCatId] = {
                    title: aiCatName,
                    isVisible: true, // Force visibility
                    color: finalData.theme.palette[Math.floor(Math.random() * finalData.theme.palette.length)]
                };
            }
            finalData.categories[targetCatId].title = aiCatName; 

            let aiItemIds = aiCat.itemIds || aiCat.items || [];
            
            if (aiItemIds && Array.isArray(aiItemIds)) {
                let itemRankCounter = Object.keys(finalData.workflow[targetCatId].content).length + 1;

                aiItemIds.forEach((aiItemId: any) => {
                    // Extract real item ID (if AI sent an object with id instead of string)
                    let realItemId = typeof aiItemId === 'string' ? aiItemId : (aiItemId.id || aiItemId.itemId);
                    if (!realItemId || !memoryItems[realItemId]) return; // Skip hallucinations

                    const sourceItem = memoryItems[realItemId];
                    
                    // We must deep copy it to avoid reference issues if AI picked it multiple times
                    const newItemId = randomUUID();
                    finalData.items[newItemId] = JSON.parse(JSON.stringify(sourceItem));
                    finalData.items[newItemId].id = Math.floor(Math.random() * 900) + 1000; // Legacy UX standard
                    finalData.items[newItemId].isVisible = true;

                    // If it has a modifier natively, clone it!
                    if (sourceItem.modifier) {
                        const uniqueClonedModId = cloneGeneticModifier(sourceItem.modifier, newItemId, finalData);
                        if (uniqueClonedModId) {
                            finalData.items[newItemId].modifier = uniqueClonedModId;
                        }
                    } else {
                        // Siphon / Scavenger Mechanism: If the item has NO modifier but belongs to a category that needs one (like Menus or Burgers)
                        const scavengedModId = getScavengedModifierForCategory(aiCatName);
                        if (scavengedModId) {
                            const uniqueClonedModId = cloneGeneticModifier(scavengedModId, newItemId, finalData);
                            if (uniqueClonedModId) {
                                finalData.items[newItemId].modifier = uniqueClonedModId;
                            }
                        }
                    }

                    // Attach to workflow
                    finalData.workflow[targetCatId].content[newItemId] = { 
                        type: "items", 
                        rank: itemRankCounter++ 
                    };
                    if (finalData.items[newItemId].modifier) {
                        finalData.workflow[targetCatId].content[newItemId].modifier = finalData.items[newItemId].modifier;
                    }
                });
            }

            // Delete category cleanly if no valid items were mapped
            if (Object.keys(finalData.workflow[targetCatId].content).length === 0) {
                delete finalData.workflow[targetCatId];
                if (finalData.categories[targetCatId]) {
                    delete finalData.categories[targetCatId];
                }
            }
        });
    }

    // Inject UI Theme Metadata into the map so KioskSimulator can dynamically style the view
    finalData.themeMetadata = {
        typeLabel: systemConfig?.typeLabel || "Standard",
        theme: systemConfig?.visualTheme || "Classique",
        style: systemConfig?.visualStyle || "Moderne"
    };

    // Plus de validation ETK360 aléatoire car on l'a construit mathématiquement
    let jsonResponse = JSON.stringify(finalData, null, 2);

    if (sauvegarder) {
      const timestamp = Date.now();
      let safeNameRaw = restaurantName || "Restaurant IA";
      
      // Cleanup de la chaine (on retire le "Je veux un vrai restaurant de : ") pour le filename
      safeNameRaw = safeNameRaw.replace("Je veux un vrai restaurant de : ", "");
      const safeName = safeNameRaw.slice(0, 30).replace(/[^a-z0-9A-Z]/gi, '_').toLowerCase();
      
      let filename = `ia_${safeName}.json`;
      let filepath = path.join(process.cwd(), '.softavera', 'carte', filename);
      let counter = 1;
      
      while (fs.existsSync(filepath)) {
          counter++;
          filename = `ia_${safeName}_${counter}.json`;
          filepath = path.join(process.cwd(), '.softavera', 'carte', filename);
      }
      
      fs.writeFileSync(filepath, jsonResponse, 'utf-8');
      return JSON.stringify({ success: true, json: jsonResponse, savedPath: filename });
    }

    return JSON.stringify({ success: true, json: jsonResponse, savedPath: null });

  } catch (error: any) {
    console.error(`Erreur Mapping Backend Phase 2 :`, error);
    return JSON.stringify({ success: false, error: `Erreur interne : ${error.message}` });
  }
}

export async function getAvailableLibraryCards() {
  try {
    const directoryPath = path.join(process.cwd(), '.softavera', 'carte');
    if (!fs.existsSync(directoryPath)) return [];

    const files = fs.readdirSync(directoryPath);
    return files.filter(f => f.endsWith('.json') && f !== 'last_architecture.json' && f !== 'system_config.json');
  } catch (e) {
    console.error("Erreur read library:", e);
    return [];
  }
}
