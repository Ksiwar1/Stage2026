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
        if (hasImage) {
            trueDataSection = `\nVOICI LA BASE DE DONNÉES LOCALE (Source d'Inspiration) :\n\`\`\`json\n${trueDataStr}\n\`\`\`\n\nRÈGLES OCR DYNAMIQUES :\n1. Tu DOIS générer des produits basés EXCLUSIVEMENT sur l'image.\n2. L'image est la vérité absolue. Tu dois inventer de nouveaux identifiants ('itemIds') pour tout produit détecté sur l'image, n'essaie pas de te limiter strictement à la base locale si l'image réclame plus.\n`;
        } else {
            trueDataSection = `\nVOICI LA SEULE BASE DE DONNÉES DE PRODUITS AUTORISÉE (La Source de Vérité) :\n\`\`\`json\n${trueDataStr}\n\`\`\`\n\nRÈGLES ABSOLUES :\n1. Tu DOIS prioriser les identifiants présents dans 'AVAILABLE_ITEMS'.\n2. N'invente des produits QUE si le client a EXPLICITEMENT demandé une catégorie (ex: Pizzas) qui est totalement absente de la base. Dans ce cas unique, tu as l'autorisation d'inventer des produits avec de nouveaux IDs, noms et prix pour peupler cette catégorie.\n3. Pour le reste, l'invention de prix, de noms ou d'IDs hors-sujet est strictement interdite.\n`;
        }
    }

    console.log("[PHASE 1] Génération de la Trame Intermédiaire...");
    const promptSysteme1 = `Tu es un assistant restaurateur. Tu dois répondre STRICTEMENT en format JSON pur, sans aucune balise ni texte MD. Tu vas créer un mappage de menu.${trueDataSection}

RÈGLES D'AUTOMATISATION ABSOLUES :
1. Cohérence stricte : Une catégorie 'PIZZAS' ne doit contenir QUE des pizzas. Ne mets JAMAIS de tacos dans une catégorie de pizzas. S'il n'y a pas de produits correspondants, renvoie la catégorie vide ("items": []).
2. Composition des Menus : Si tu crées ou assignes un produit de type "Menu" ou multichoix, tu DOIS obligatoirement générer sa composition détaillée ("steps") qui guide le client.

Format attendu:
{
  "categories": [
    {
      "name": "Catégorie 1",
      "items": [
         {
            "id": "item_1234",
            "name": "Menu Burger",
            "price": 10.50,
            "description": "Un super menu",
            "steps": [
               {
                  "title": "Choix de la Boisson",
                  "minChoices": 1,
                  "maxChoices": 1,
                  "options": [
                     { "id": "opt_coca", "name": "Coca Cola", "priceDelta": 0 }
                  ]
               }
            ]
         }
      ]
    }
  ]
}
INSTRUCTION EXTRÊMEMENT CRITIQUE: Tu dois OBLIGATOIREMENT générer EXACTEMENT les catégories demandées. Si tu pioches dans la BASE LOCALE, conserve bien l'identifiant exact dans "id" mais inclus cet identifiant sous forme d'objet complet. AUCUN texte additionnel.`;

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
               
               // Clonage de TOUTES les propriétés natives racines
               Object.keys(data).forEach(key => {
                   if (!['workflow', 'categories', 'items', 'modifier', 'steps', 'theme', 'title'].includes(key)) {
                       (finalData as any)[key] = data[key];
                   }
               });
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
                           
                           if (!foundModId) {
                               const itmObj = data.items?.[itmObjId];
                               if (itmObj && itmObj.modifier) foundModId = itmObj.modifier;
                           }
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
        if (found.price !== undefined && found.price !== null) {
            if (typeof found.price === 'number') {
               rawTtc = found.price;
            } else if (typeof found.price.dflt === 'object' && found.price.dflt !== null) {
               rawTtc = found.price.dflt.ttc !== undefined ? found.price.dflt.ttc : null;
            } else if (typeof found.price.dflt === 'number') {
               rawTtc = found.price.dflt;
            } else if (typeof found.price.ttc === 'number') {
               rawTtc = found.price.ttc;
            }
        } else if (found.priceTTC !== undefined) {
           rawTtc = found.priceTTC;
        }

        const safeId = typeof rId === 'string' ? rId : require("crypto").randomUUID();

        return {
          ...JSON.parse(JSON.stringify(found)), // Clone intégral pour préserver la donnée originelle stricte
          id: safeId,
          ref: typeof found.ref === 'string' ? found.ref : `REF_${String(safeId).substring(0,8)}`,
          type: found.type === 'modifier' ? 'modifier' : 'item',
          title: extractedTitle,
          description: found.description || undefined, // On préserve le formattage objet ou string
          price: { dflt: { ttc: rawTtc !== null ? rawTtc : 0 } },
          img: found.img || (found.image ? { dflt: { img: found.image, salesSupport: {} } } : { dflt: { img: "no-pictures.svg", salesSupport: {} } }),
          fid: found.fid || "",
          opt: found.opt || {},
          qty: found.qty ?? 1,
          rank: found.rank ?? 0,
          unit: found.unit || "unit",
          offer: found.offer || "",
          prSize: found.prSize || "",
          archive: found.archive || false,
          barCode: found.barCode || "",
          liaison: Array.isArray(found.liaison) ? found.liaison : [],
          calories: found.calories ?? 0,
          outStock: found.outStock || false,
          printers: found.printers || [],
          sizeList: found.sizeList || [],
          suspSale: found.suspSale || false,
          variants: found.variants || [],
          allergens: found.allergens || [],
          basicComp: found.basicComp || false,
          isComment: found.isComment || false,
          active_qty: found.active_qty || false,
          isRedirect: found.isRedirect || false,
          linkedTags: found.linkedTags || [],
          nutriScore: found.nutriScore || "",
          stepVisibility: found.stepVisibility || { dflt: { 1: [], 2: [], 3: [], 4: [] }, isVisible: true, basicCompVisibility: true },
          visibilityInfo: found.visibilityInfo || { dflt: { 1: [], 2: [], 3: [], 4: [] }, isVisible: true, basicCompVisibility: true },
          isOptionChoice: found.isOptionChoice || false
        };
    };

    const buildBaseETK360Step = (sId: string, sRef: any) => ({
        ...JSON.parse(JSON.stringify(sRef)), // Clone natif
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
                        
                        const newItemId = oldItemId;
                        fData.steps[newStepId].stepItems[newItemId] = { 
                            rank: sourceItems[oldItemId]?.rank || 0,
                            priceStep: sourceItems[oldItemId]?.priceStep || 0,
                            maxChoices: sourceItems[oldItemId]?.maxChoices || 1,
                            minChoices: sourceItems[oldItemId]?.minChoices || 0,
                            ...sourceItems[oldItemId]
                        };
                        
                        if (!fData.items[newItemId]) {
                            fData.items[newItemId] = buildBaseETK360Item(newItemId, itm);
                            if (itm.modifier) {
                                const nestedModId = cloneGeneticModifier(itm.modifier, newItemId, fData);
                                if (nestedModId) fData.items[newItemId].modifier = nestedModId;
                            }
                        }
                        
                        // Remap the override pointer if it exists in the modifier configuration
                        if (fData.modifier[newModId].steps[newStepId].stepItems && mod.steps[oldStepId].stepItems && mod.steps[oldStepId].stepItems[oldItemId]) {
                             fData.modifier[newModId].steps[newStepId].stepItems[newItemId] = mod.steps[oldStepId].stepItems[oldItemId];
                        }
                    });
                }
            });
        }
        return newModId;
    };

    // Nouveau Moteur de Rendu : Transformateur natif (AI 'steps' array -> ETK360 nested dictionary)
    const buildNativeModifierFromAiSteps = (aiSteps: any[], parentItemId: string, fData: any): string => {
        const { randomUUID } = require("crypto");
        const newModId = randomUUID();
        
        fData.modifier[newModId] = { 
            "uuid-item": parentItemId, 
            archive: false, 
            status: "ready", 
            steps: {} 
        };
        
        aiSteps.forEach((aiStep, sIndex) => {
            const newStepId = randomUUID();
            fData.modifier[newModId].steps[newStepId] = { rank: sIndex + 1 };
            
            fData.steps[newStepId] = {
                id: newStepId,
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
                specificOpts: {},
                rank: sIndex + 1
            };
            
            const aiOptions = aiStep.options || aiStep.items || [];
            aiOptions.forEach((opt: any, oIndex: number) => {
                let optId = opt.id;
                
                if (!optId || !memoryItems[optId]) {
                   const foundKey = Object.keys(memoryItems).find(k => {
                       const mItm = memoryItems[k];
                       const title = mItm.displayName?.dflt?.nameDef || mItm.title || mItm.name;
                       const optTitle = opt.name || opt.title;
                       return title && optTitle && title.toLowerCase() === optTitle.toLowerCase();
                   });
                   optId = foundKey || opt.id || randomUUID();
                }
                
                fData.steps[newStepId].stepItems[optId] = {
                    rank: oIndex + 1,
                    priceStep: opt.priceDelta || opt.price || 0,
                    maxChoices: 1,
                    minChoices: 0
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

    // === 2. HYBRID WORKFLOW GENERATION ===
    if (Object.keys(memoryWorkflow).length > 0) {
        finalData.workflow = memoryWorkflow; // Base Workflow Skeleton Preserved
        finalData.categories = JSON.parse(JSON.stringify(memoryCategories)); // Deep clone to preserve exactly raw JSON properties

        Object.keys(finalData.categories).forEach(cId => {
            finalData.categories[cId].id = cId;
            finalData.categories[cId].rank = finalData.workflow[cId]?.rank || 0;
            
            // Il faut absolument purger les items et child hérités du catalogue global. 
            // Ce catalogue IA est un sous-ensemble : on ne garde pas les vieux UUIDs fantômes.
            if (Array.isArray(finalData.categories[cId].items)) {
                finalData.categories[cId].items = [];
            } else {
                finalData.categories[cId].items = []; // Force Array per ETK360 specs
            }
            
            if (Array.isArray(finalData.categories[cId].child)) {
                finalData.categories[cId].child = [];
            } else {
                finalData.categories[cId].child = []; // Force Array per ETK360 specs
            }
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
                    idCard: 1,
                    parent: "",
                    archive: false,
                    liaison: [],
                    isNameShow: true,
                    linkedTags: [],
                    description: { dflt: { imp: [], nameDef: "", salesSupport: {} } },
                    displayName: { dflt: { imp: [], nameDef: aiCatName, salesSupport: {} } },
                    linkedChild: [],
                    linkedItems: [],
                    visibilityInfo: { dflt: { 1: [], 2: [], 3: [], 4: [] }, isVisible: true, basicCompVisibility: true },
                    isInfoModeActive: false,
                    id: targetCatId,
                    isVisible: true
                };
            }
            // FIX 2: Synchronize Rank perfectly with AI intention
            const currentCatRank = aiIndex + 1;
            finalData.workflow[targetCatId].rank = currentCatRank;
            finalData.categories[targetCatId].rank = currentCatRank;
            finalData.categories[targetCatId].title = aiCatName;
            
            if (!finalData.categories[targetCatId].items) finalData.categories[targetCatId].items = [];
            if (!finalData.categories[targetCatId].child) finalData.categories[targetCatId].child = [];

            let aiItemIds = aiCat.itemIds || aiCat.items || [];
            
            if (aiItemIds && Array.isArray(aiItemIds)) {
                let itemRankCounter = Object.keys(finalData.workflow[targetCatId].content).length + 1;

                aiItemIds.forEach((aiItemId: any) => {
                    // Extract real item ID (if AI sent an object with id instead of string)
                    let realItemId = typeof aiItemId === 'string' ? aiItemId : (aiItemId.id || aiItemId.itemId);
                    if (!realItemId) return;
                    let sourceItem = memoryItems[realItemId];
                    
                    // FEATURE : L'IA a généré l'item de façon dynamique (OCR ou invention contrainte)
                    if (!sourceItem) {
                        if (typeof aiItemId === 'object' && (aiItemId.name || aiItemId.title)) {
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
                    finalData.items[newItemId].id = Math.floor(Math.random() * 900) + 1000; 
                    finalData.items[newItemId].isVisible = true;
                    // FIX 1: Assurer que l'item pointe bien sur sa catégorie visuelle parente
                    finalData.items[newItemId].parent = targetCatId; 
                    
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

                    // Attach to workflow AND categories (Dual-Binding Single Source of Truth)
                    if (!finalData.workflow[targetCatId].content) finalData.workflow[targetCatId].content = {};
                    finalData.workflow[targetCatId].content[newItemId] = { 
                        type: "items", 
                        rank: itemRankCounter++ 
                    };
                    
                    if (finalData.items[newItemId].modifier) {
                        const mId = finalData.items[newItemId].modifier;
                        // Injection Native ETK360 : le modifier vit dans le content du workflow de l'item !
                        finalData.workflow[targetCatId].content[newItemId].content = {
                            [mId]: { type: "modifier", rank: 1 }
                        };
                    }
                    
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
        
        // Nettoyage strict : archiver et cacher toutes les catégories locales non demandées par l'IA
        Object.keys(finalData.categories).forEach(cId => {
            if (!activeCategoryIds.has(cId)) {
                finalData.categories[cId].isVisible = false;
                finalData.categories[cId].archive = true;
                
                if (finalData.categories[cId].visibilityInfo) {
                    finalData.categories[cId].visibilityInfo.isVisible = false;
                    finalData.categories[cId].visibilityInfo.basicCompVisibility = false;
                }
                
                // Retirer de la racine du workflow pour garantir l'absence totale dans la borne
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
    
    // 1. Force the strict order for recognized fields
    for (const key of orderedRootFields) {
        if (finalData[key] !== undefined) {
            orderedFinalData[key] = finalData[key];
        } else {
            // Optional: you can choose to initialize missing fields if required by ETK360, 
            // but the user said "sans toucher à ce qu'ils contiennent", so we only reorder existing ones.
        }
    }
    
    // 2. Append any remaining extra fields (like themeMetadata, theme, etc.) at the end
    for (const key of Object.keys(finalData)) {
        if (!orderedRootFields.includes(key)) {
            orderedFinalData[key] = finalData[key];
        }
    }

    let jsonResponse = JSON.stringify(orderedFinalData, null, 2);

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
