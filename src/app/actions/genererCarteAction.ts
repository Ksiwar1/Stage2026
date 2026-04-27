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
    let trueDataStr = null;
    try {
        trueDataStr = extractTrueDataFromCatalogue(pathLib.join(process.cwd(), '.softavera', 'carte', activeSourceInspiration));
    } catch (err: any) {
        if (err.message === "ERR_INVALID_CATALOGUE") {
            return { success: false, error: "La base locale sélectionnée est corrompue ou ne contient aucun produit valide. Impossible de lancer la génération RAG." };
        }
    }
    let trueDataSection = "";
    if (trueDataStr) {
        trueDataSection = `\nVOICI LA SEULE BASE DE DONNÉES DE PRODUITS AUTORISÉE (La Source de Vérité) :\n\`\`\`json\n${trueDataStr}\n\`\`\`\n\nRÈGLES ABSOLUES :\n1. Tu ne dois utiliser QUE les identifiants présents dans 'AVAILABLE_ITEMS'.\n2. N'invente AUCUN produit qui n'est pas dans cette liste. L'invention de prix, de noms ou d'IDs est strictement interdite.\n3. Si la demande du client ou l'OCR mentionne une catégorie ou un produit TOTALEMENT ABSENT de la liste, IGNORE-LE. Il vaut mieux laisser la catégorie vide ("itemIds": []) plutôt que d'inventer des produits qui ne sont pas de la même thématique.\n`;
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
    if (activeSourceInspiration) allInspirations.push(activeSourceInspiration); // Inclut 'generique'
    
    // RÈGLE MÉTIER STRICTE : Aucune contamination (Fallback inter-cartes) autorisée
    // On ne charge plus les activeSecondaryInspirations.

    allInspirations.forEach((f, index) => {
        try {
            let data;
            if (f === 'generique') {
                const { GENERIC_MASTER_TEMPLATE_JSON_STR } = require('@/lib/memory');
                data = JSON.parse(GENERIC_MASTER_TEMPLATE_JSON_STR);
            } else {
                data = JSON.parse(fsLib.readFileSync(pathLib.join(process.cwd(), '.softavera', 'carte', f), 'utf-8'));
            }
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

    const buildBaseETK360Item = (rId: string, found: any) => {
        // Extraction propre du texte
        const extractedTitle = found.displayName?.dflt?.nameDef || found.title || found.name || rId;
        const extractedDesc = typeof found.description === 'string' ? found.description : (found.description?.dflt?.nameDef || "");

        // Résolution absolue du prix (Null ou Nombre)
        let rawTtc: number | null = null;
        if (found.price) {
           if (typeof found.price.dflt === 'object' && found.price.dflt !== null) {
              rawTtc = found.price.dflt.ttc !== undefined ? found.price.dflt.ttc : null;
           } else if (typeof found.price.dflt === 'number') {
              rawTtc = found.price.dflt;
           } else if (typeof found.price.ttc === 'number') {
              rawTtc = found.price.ttc;
           }
        } else if (found.priceTTC !== undefined) {
           rawTtc = found.priceTTC;
        }

        return {
          id: rId,
          ref: found.ref || `REF_${rId}`,
          type: found.type === 'modifier' ? 'modifier' : 'item',
          title: extractedTitle,
          description: extractedDesc || undefined,
          price: { dflt: { ttc: rawTtc } },
          img: found.img?.dflt?.img ? { dflt: { img: found.img.dflt.img } } : (found.image ? { dflt: { img: found.image } } : undefined),
          modifier: found.modifier || undefined,
          basicComp: found.basicComp || undefined,
          isVisible: found.isVisible !== false,
        };
    };

    const buildBaseETK360Step = (sId: string, sRef: any) => ({
        id: sRef.id || sId,
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
        specificOpts: sRef.specificOpts || {},
        img: sRef.img || { dflt: { img: "no-pictures.svg", salesSupport: {} } },
        rank: sRef.rank || 0
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
                fData.steps[newStepId] = buildBaseETK360Step(newStepId, stp);
                
                const sourceItems = stp.stepItems || stp.items || stp.values || {};
                
                if (sourceItems) {
                    Object.keys(sourceItems).forEach(oldItemId => {
                        const itm = memoryItems[oldItemId];
                        if (!itm) return;
                        
                        const newItemId = randomUUID();
                        fData.steps[newStepId].stepItems[newItemId] = { 
                            rank: sourceItems[oldItemId]?.rank || 0,
                            priceStep: sourceItems[oldItemId]?.priceStep || 0,
                            maxChoices: sourceItems[oldItemId]?.maxChoices || 1,
                            minChoices: sourceItems[oldItemId]?.minChoices || 0,
                            ...sourceItems[oldItemId]
                        };
                        
                        fData.items[newItemId] = buildBaseETK360Item(newItemId, itm);
                        
                        // Remap the override pointer if it exists in the modifier configuration
                        if (fData.modifier[newModId].steps[newStepId].stepItems && mod.steps[oldStepId].stepItems && mod.steps[oldStepId].stepItems[oldItemId]) {
                             fData.modifier[newModId].steps[newStepId].stepItems[newItemId] = mod.steps[oldStepId].stepItems[oldItemId];
                        }
                        
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
        
        // 3. Fallback d'Urgence absolu : Seulement pour les PLATS
        if (isPlat) {
            const fallbackMenu = memoryWorkflowMeta.find(m => normalizeCategory(m.catTitle) === "menu" && m.modId);
            if (fallbackMenu) return fallbackMenu.modId;
            
            // Si pas de 'menu', on prend le premier modifier disponible lié à un plat
            const fallbackAnyPlat = memoryWorkflowMeta.find(m => ["pizza", "burger", "tacos", "salade"].includes(normalizeCategory(m.catTitle)) && m.modId);
            if (fallbackAnyPlat) return fallbackAnyPlat.modId;
        }

        // AUDIT : Logging en cas de non-classification / silencieux pour les outils d'observation
        console.warn(`[AUDIT RAG] Aucun modifier métier trouvé pour la catégorie : "${aiCatName}" (Classifiée: ${normalNeedle}). L'item sera injecté pur (sans modifier).`);

        return null; // Pas de modifier sûr détecté
    };

    // === 2. HYBRID WORKFLOW GENERATION ===
    if (Object.keys(memoryWorkflow).length > 0) {
        finalData.workflow = memoryWorkflow; // Base Workflow Skeleton Preserved
        finalData.categories = JSON.parse(JSON.stringify(memoryCategories)); // Base Categories Preserved for labels

        Object.keys(finalData.categories).forEach(cId => {
            finalData.categories[cId].id = cId;
            finalData.categories[cId].rank = finalData.workflow[cId]?.rank || 0;
            finalData.categories[cId].items = {};
            finalData.categories[cId].child = {};
        });

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
                const newCatRank = fallbackCatRank++;
                finalData.workflow[targetCatId] = { type: "categories", rank: newCatRank, content: {} };
                finalData.categories[targetCatId] = {
                    id: targetCatId,
                    rank: newCatRank,
                    title: aiCatName,
                    isVisible: true, // Force visibility
                    items: {},
                    child: {},
                    color: finalData.theme.palette[Math.floor(Math.random() * finalData.theme.palette.length)]
                };
            }
            finalData.categories[targetCatId].title = aiCatName; 
            if (!finalData.categories[targetCatId].items) finalData.categories[targetCatId].items = {};
            if (!finalData.categories[targetCatId].child) finalData.categories[targetCatId].child = {};

            let aiItemIds = aiCat.itemIds || aiCat.items || [];
            
            if (aiItemIds && Array.isArray(aiItemIds)) {
                let itemRankCounter = Object.keys(finalData.workflow[targetCatId].content).length + 1;

                aiItemIds.forEach((aiItemId: any) => {
                    // Extract real item ID (if AI sent an object with id instead of string)
                    let realItemId = typeof aiItemId === 'string' ? aiItemId : (aiItemId.id || aiItemId.itemId);
                    if (!realItemId) return;
                    let sourceItem = memoryItems[realItemId];
                    
                    // FEATURE : Si la BDD (memoryItems) ne contient pas l'item, mais que l'IA l'a généré grâce à l'OCR de l'image ("generique")
                    if (!sourceItem) {
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

                    if (!sourceItem) return; // Véritable hallucination sans donnée source, on skip.
                    
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
                         // Siphon métier contraint (RAG restreint ou OCR générique)
                         const scavengedModId = getScavengedModifierForCategory(aiCatName);
                         if (scavengedModId) {
                             const uniqueClonedModId = cloneGeneticModifier(scavengedModId, newItemId, finalData);
                             if (uniqueClonedModId) {
                                 finalData.items[newItemId].modifier = uniqueClonedModId;
                             }
                         }
                    }

                    // Attach to workflow AND categories (Dual-Binding Single Source of Truth)
                    finalData.workflow[targetCatId].content[newItemId] = { 
                        type: "items", 
                        rank: itemRankCounter++ 
                    };
                    
                    if (finalData.items[newItemId].modifier) {
                        finalData.workflow[targetCatId].content[newItemId].modifier = finalData.items[newItemId].modifier;
                    }
                    
                    // Dual Binding for ETK360 parser consistency
                    finalData.categories[targetCatId].items[newItemId] = { ...finalData.workflow[targetCatId].content[newItemId] };
                });
            }

            // RÈGLE MÉTIER : On conserve la catégorie même si elle est vide (0 produit valide).
            // Le Front-End (KioskSimulator) gèrera l'affichage "Aucun produit disponible".
            // Suppression du code de nettoyage agressif.
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

    // === 4. SINGLE SOURCE OF TRUTH VALIDATION WALL ===
    const verifySchemaIntegrity = (data: any) => {
        const rootItems = data.items || {};
        const rootCats = data.categories || {};
        const rootWf = data.workflow || {};
        
        // Check 1: Workflow roots must exist in Categories
        for (const wCatId of Object.keys(rootWf)) {
            if (!rootCats[wCatId]) {
                throw new Error(`Workflow root category '${wCatId}' is missing from final categories.`);
            }
        }
        
        // Check 2: All items referenced in workflow MUST exist in global items, and rank collisions
        for (const wCatId of Object.keys(rootWf)) {
            const content = rootWf[wCatId].content || {};
            const ranks = new Set();
            
            for (const itemId of Object.keys(content)) {
                if (!rootItems[itemId]) {
                    throw new Error(`Item '${itemId}' is referenced in workflow '${wCatId}' but is totally absent from global database.`);
                }
                const r = content[itemId].rank;
                if (r !== undefined && r !== null) {
                    if (ranks.has(r)) {
                        console.warn(`[INTEGRITY] Rank Collision in '${wCatId}': rank ${r}. ETK360 might sort them alphabetically.`); 
                    }
                    ranks.add(r);
                }
            }
        }
        
        // Check 3: Categories Dual Binding Check
        for (const cId of Object.keys(rootCats)) {
            const catItems = rootCats[cId].items || {};
            for (const itemId of Object.keys(catItems)) {
                if (!rootItems[itemId]) {
                    throw new Error(`Item '${itemId}' is tied to category '${cId}' but does NOT exist in global database.`);
                }
            }
        }
        return true;
    };

    try {
        verifySchemaIntegrity(finalData);
    } catch (e: any) {
        console.error("FATAL ETK360 GENERATION PARSE:", e.message);
        return JSON.stringify({ success: false, error: `Validation de structure échouée: ${e.message}` });
    }
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
