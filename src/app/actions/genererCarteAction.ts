'use server';

import { getPromptSystemForAI } from "../../lib/memory";
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
    sujetDemande += `- Nom du restaurant : "${restaurantName}". Ce nom doit être utilisé dans la carte, apparaître dans les titres, descriptions ou le branding.\n- Le design, le nom des menus et des produits doivent absolument être stylistiquement et culturellement cohérents avec l'identité "${restaurantName}".\n`;
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

  let activeSourceInspiration = sourceInspiration;
  let activeSecondaryInspirations: string[] = [];
  const maxSecondary = (aiType === "groq") ? 1 : 2;
  const availableDocs = await getAvailableLibraryCards();

  if (!activeSourceInspiration || activeSourceInspiration === 'generique') {
    console.log("[RAG] Auto-sélection intelligente des templates algorithmiques...");
    const ragSys = `Tu es un agent RAG. Fichiers templates existants : ${availableDocs.join(", ")}. La demande métier est : "${sujetDemande}". Réponds UNIQUEMENT en string listant le PRIX ou LE MEILLEUR fichier, suivi d'éventuels autres intéressants (ex: "carte_pizza.json, carte_burger.json"). Aucun blabla. Si la demande est trop exotique, renvoie "generique".`;
    try {
      const ragRes = await generateAIResponse(ragSys, "Analyse le RAG", 0.1, "gemini");
      const selectedFiles = ragRes.replace(/```/g, "").split(',').map(s => s.trim());
      const validFiles = selectedFiles.filter(f => availableDocs.includes(f));

      if (validFiles.length > 0) {
        activeSourceInspiration = validFiles[0];
        activeSecondaryInspirations = validFiles.slice(1, maxSecondary + 1);
      } else {
        activeSourceInspiration = 'generique';
        activeSecondaryInspirations = availableDocs.slice(0, maxSecondary);
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
    console.log("[PHASE 1] Génération de la Trame Intermédiaire...");
    const promptSysteme1 = `Tu es un assistant restaurateur. Tu dois répondre STRICTEMENT en format JSON pur, sans texte MD. Tu vas générer un menu complet.
Format attendu:
{
  "categories": [
    {
      "name": "Catégorie 1",
      "items": [
        { "name": "Produit A", "price": 10.0 }
      ]
    }
  ]
}
Adapte rigoureusement le nombre de catégories, leurs noms, et la description/quantité des produits selon les consignes exactes (langue, badges, etc.) dictées dans le Sujet Demandé par le client. AUCUN texte additionnel.`;

    const promptUtilisateur1 = `Sujet demandé: ${sujetDemande}. Produis le JSON du menu.`;
    
    let architectureJson = await generateAIResponse(promptSysteme1, promptUtilisateur1, 0.7, aiType, base64Image, 1000);
    require("fs").writeFileSync(`.softavera/carte/last_architecture.json`, architectureJson);
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

    let catRank = 1;

    let sourceCategories = [];
    if (intermediate.categories && Array.isArray(intermediate.categories)) {
        sourceCategories = intermediate.categories;
    } else if (Array.isArray(intermediate)) {
        sourceCategories = intermediate;
    } else if (intermediate.menu && Array.isArray(intermediate.menu.categories)) {
        sourceCategories = intermediate.menu.categories;
    } else if (intermediate.menu && Array.isArray(intermediate.menu)) {
        sourceCategories = intermediate.menu;
    } else if (intermediate.carte && Array.isArray(intermediate.carte.categories)) {
        sourceCategories = intermediate.carte.categories;
    }

    // Mapping 1-to-1 absolu avec des UUIDs Backend natifs
    if (sourceCategories.length > 0) {
        sourceCategories.forEach((catInfo: any) => {
            const catId = randomUUID();
            finalData.categories[catId] = {
                title: catInfo.name || "Catégorie",
                isVisible: true,
                color: finalData.theme.palette[Math.floor(Math.random() * finalData.theme.palette.length)]
            };

            const contentBlock: any = {};
            let itemRank = 1;

            const catTitle = catInfo.name || "Catégorie";
            const forcedItemsStr = systemConfig?.forcedItems?.[catTitle] || systemConfig?.forcedItems?.[catTitle.toUpperCase()] || systemConfig?.forcedItems?.[catTitle.toLowerCase()];
            
            if (forcedItemsStr && forcedItemsStr.trim() !== "") {
                const forcedArr = forcedItemsStr.split(",").map((s: string) => s.trim()).filter((s: string) => s !== "");
                const oldItems = Array.isArray(catInfo.items) ? catInfo.items : [];
                
                catInfo.items = forcedArr.map((forcedName: string) => {
                    const found = oldItems.find((i: any) => i.name && (i.name.toLowerCase().includes(forcedName.toLowerCase()) || forcedName.toLowerCase().includes(i.name.toLowerCase())));
                    return {
                        name: forcedName,
                        price: found && found.price ? found.price : (Math.floor(Math.random() * 5) + 5)
                    };
                });
            }

            if (catInfo.items && Array.isArray(catInfo.items)) {
                catInfo.items.forEach((itemInfo: any) => {
                    const itemId = randomUUID();
                    const itemName = itemInfo.name || "Produit INCONNU";
                    const itemPrice = parseFloat(itemInfo.price) > 0 ? parseFloat(itemInfo.price) : 10.0;
                    
                    const encodedImg = encodeURIComponent(itemName.trim().replace(/\s+/g, '_'));

                    finalData.items[itemId] = {
                        id: Math.floor(Math.random() * 900) + 1000,
                        type: "items",
                        title: itemName,
                        price: { dflt: { ttc: itemPrice } },
                        img: { dflt: { img: `https://image.pollinations.ai/prompt/${encodedImg}` } }
                    };

                                        contentBlock[itemId] = { type: "items", rank: itemRank++ };

                                                            // NOUVEAU PARCOURS "MENU" TYPE MCDONALDS
                    const isDrinkOrDessert = catInfo.name && (catInfo.name.toLowerCase().includes("boisson") || catInfo.name.toLowerCase().includes("dessert"));
                    const isFoodItem = !isDrinkOrDessert;

                    // NOUVEAU PARCOURS "MENU" TYPE MCDONALDS EXACT ETK360 COMPATIBLE
                    const realModifierId = randomUUID();
                    const modSteps: any = {};
                    let modRank = 1;
                    let hasModifiers = false;

                    if (isFoodItem) {
                        hasModifiers = true;
                        
                        // ETAPE 1: Personnalisation dynamique
                        const stepPersoId = randomUUID();
                        modSteps[stepPersoId] = { rank: modRank++ };
                        
                        const persoItems: any = {};
                        let pRank = 1;
                        let maxChoicesArr = 0;

                        // Cuissons si activées
                        if (systemConfig?.compositions?.cookingOptions) {
                            const p1 = randomUUID(); const p2 = randomUUID(); const p3 = randomUUID();
                            persoItems[p1] = { price: 0, uuid: p1, rank: pRank++ };
                            persoItems[p2] = { price: 0, uuid: p2, rank: pRank++ };
                            persoItems[p3] = { price: 0, uuid: p3, rank: pRank++ };
                            
                            finalData.items[p1] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: "Saignant", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/rare_meat" } } };
                            finalData.items[p2] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: "À point", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/medium_meat" } } };
                            finalData.items[p3] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: "Bien cuit", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/well_done_meat" } } };
                            maxChoicesArr += 1;
                        }

                        // Retrait d'ingrédients
                        const defIng = systemConfig?.compositions?.defaultIngredients || "";
                        if (defIng.trim() !== "") {
                            const ings = defIng.split(",").map((s: string) => s.trim()).filter((s: string) => s !== "");
                            ings.forEach((ing: string) => {
                                const uid = randomUUID();
                                persoItems[uid] = { price: 0, uuid: uid, rank: pRank++ };
                                finalData.items[uid] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: `Sans ${ing}`, price: { dflt: { ttc: 0 } }, img: { dflt: { img: `https://image.pollinations.ai/prompt/no_${encodeURIComponent(ing)}` } } };
                                maxChoicesArr += 1;
                            });
                        }

                        // Suppléments payants
                        const supps = systemConfig?.compositions?.customSupplements || [];
                        supps.forEach((supp: any) => {
                            const uid = randomUUID();
                            persoItems[uid] = { price: supp.price, uuid: uid, rank: pRank++ };
                            finalData.items[uid] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: `Supplément ${supp.name} (+${supp.price}€)`, price: { dflt: { ttc: supp.price } }, img: { dflt: { img: `https://image.pollinations.ai/prompt/extra_${encodeURIComponent(supp.name)}` } } };
                            maxChoicesArr += 1;
                        });

                        finalData.steps[stepPersoId] = { title: "Personnalisation", minChoices: 0, maxChoices: maxChoicesArr || 5, items: persoItems };

                        // ETAPE 2: Formules
                        const stepFormuleId = randomUUID();
                        modSteps[stepFormuleId] = { rank: modRank++ };
                        
                        const formuleItems: any = {};
                        let fRank = 1;

                        if (systemConfig?.formulas?.isSeul !== false) {
                            const optSeul = randomUUID();
                            formuleItems[optSeul] = { price: 0, uuid: optSeul, rank: fRank++ };
                            finalData.items[optSeul] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: "Seul", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/single_item" } } };
                        }

                        // Base menus (Boisson + Accompagnement)
                        const buildMenuSubsteps = (menuModId: string, parentMenuUuid: string) => {
                            const menuSteps: any = {};
                            let sRank = 1;

                            // Boissons dynamiques
                            const drinksListStr = systemConfig?.drinks?.list || "Coca-Cola, Eau Plate";
                            const drinksArr = drinksListStr.split(",").map((s:string) => s.trim()).filter((s:string) => s !== "");
                            if (drinksArr.length > 0) {
                                const stepBoissonMenu = randomUUID();
                                menuSteps[stepBoissonMenu] = { rank: sRank++ };
                                const drinksItems: any = {};
                                let bRank = 1;

                                drinksArr.forEach((dr: string) => {
                                    const buid = randomUUID();
                                    drinksItems[buid] = { price: 0, uuid: buid, rank: bRank++ };
                                    if (systemConfig?.drinks?.hasSizes) {
                                        const drModId = randomUUID();
                                        const drStepSizeId = randomUUID();
                                        const s1 = randomUUID(); const s2 = randomUUID(); const s3 = randomUUID();
                                        
                                        finalData.items[buid] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: dr, price: { dflt: { ttc: 0 } }, modifier: drModId, img: { dflt: { img: `https://image.pollinations.ai/prompt/${encodeURIComponent(dr)}` } } };
                                        
                                        finalData.modifier[drModId] = {
                                            "uuid-item": buid,
                                            steps: { [drStepSizeId]: { rank: 1 } }
                                        };
                                        finalData.steps[drStepSizeId] = { title: `Taille - ${dr}`, minChoices: 1, maxChoices: 1, items: {
                                            [s1]: { price: systemConfig.drinks.sizeS || 0, uuid: s1, rank: 1 },
                                            [s2]: { price: systemConfig.drinks.sizeM || 1, uuid: s2, rank: 2 },
                                            [s3]: { price: systemConfig.drinks.sizeL || 1.5, uuid: s3, rank: 3 }
                                        }};
                                        finalData.items[s1] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: "Taille S", price: { dflt: { ttc: systemConfig.drinks.sizeS || 0 } } };
                                        finalData.items[s2] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: "Taille M", price: { dflt: { ttc: systemConfig.drinks.sizeM || 1 } } };
                                        finalData.items[s3] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: "Taille L", price: { dflt: { ttc: systemConfig.drinks.sizeL || 1.5 } } };
                                    } else {
                                        finalData.items[buid] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: dr, price: { dflt: { ttc: 0 } }, img: { dflt: { img: `https://image.pollinations.ai/prompt/${encodeURIComponent(dr)}` } } };
                                    }
                                });
                                finalData.steps[stepBoissonMenu] = { title: "Choix de la Boisson", minChoices: 1, maxChoices: 1, items: drinksItems };
                            }

                            // Accompagnements dynamiques
                            const stepAccompMenu = randomUUID();
                            menuSteps[stepAccompMenu] = { rank: sRank++ };
                            
                            const accompListStr = systemConfig?.accompaniments?.list || "Frites, Potatoes";
                            const accompArr = accompListStr.split(",").map((s:string) => s.trim()).filter((s:string) => s !== "");
                            const accompItems: any = {};
                            let aRank = 1;

                            accompArr.forEach((acc: string) => {
                                const auid = randomUUID();
                                accompItems[auid] = { price: 0, uuid: auid, rank: aRank++ };

                                // Si tailles, on crée un sous-modifier !
                                if (systemConfig?.accompaniments?.hasSizes) {
                                    const accModId = randomUUID();
                                    const accStepSizeId = randomUUID();
                                    const s1 = randomUUID(); const s2 = randomUUID(); const s3 = randomUUID();
                                    
                                    finalData.items[auid] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: acc, price: { dflt: { ttc: 0 } }, modifier: accModId, img: { dflt: { img: `https://image.pollinations.ai/prompt/${encodeURIComponent(acc)}` } } };
                                    
                                    finalData.modifier[accModId] = {
                                        "uuid-item": auid,
                                        steps: { [accStepSizeId]: { rank: 1 } }
                                    };
                                    finalData.steps[accStepSizeId] = { title: `Taille - ${acc}`, minChoices: 1, maxChoices: 1, items: {
                                        [s1]: { price: systemConfig.accompaniments.sizeS || 0, uuid: s1, rank: 1 },
                                        [s2]: { price: systemConfig.accompaniments.sizeM || 1, uuid: s2, rank: 2 },
                                        [s3]: { price: systemConfig.accompaniments.sizeL || 1.5, uuid: s3, rank: 3 }
                                    }};
                                    finalData.items[s1] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: "Taille S", price: { dflt: { ttc: systemConfig.accompaniments.sizeS || 0 } } };
                                    finalData.items[s2] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: "Taille M", price: { dflt: { ttc: systemConfig.accompaniments.sizeM || 1 } } };
                                    finalData.items[s3] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: "Taille L", price: { dflt: { ttc: systemConfig.accompaniments.sizeL || 1.5 } } };
                                } else {
                                    finalData.items[auid] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: acc, price: { dflt: { ttc: 0 } }, img: { dflt: { img: `https://image.pollinations.ai/prompt/${encodeURIComponent(acc)}` } } };
                                }
                            });

                            finalData.steps[stepAccompMenu] = { title: "Choix de l'Accompagnement", minChoices: 1, maxChoices: 1, items: accompItems };
                            
                            // Desserts dynamiques
                            const dessertsListStr = systemConfig?.desserts?.list || "";
                            const dessertsArr = dessertsListStr.split(",").map((s:string) => s.trim()).filter((s:string) => s !== "");
                            if (dessertsArr.length > 0) {
                                const stepDessertMenu = randomUUID();
                                menuSteps[stepDessertMenu] = { rank: sRank++ };
                                const dessertsItems: any = {};
                                let dRank = 1;

                                dessertsArr.forEach((ds: string) => {
                                    const duid = randomUUID();
                                    dessertsItems[duid] = { price: 0, uuid: duid, rank: dRank++ };
                                    if (systemConfig?.desserts?.hasSizes) {
                                        const dsModId = randomUUID();
                                        const dsStepSizeId = randomUUID();
                                        const s1 = randomUUID(); const s2 = randomUUID(); const s3 = randomUUID();
                                        
                                        finalData.items[duid] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: ds, price: { dflt: { ttc: 0 } }, modifier: dsModId, img: { dflt: { img: `https://image.pollinations.ai/prompt/${encodeURIComponent(ds)}` } } };
                                        
                                        finalData.modifier[dsModId] = {
                                            "uuid-item": duid,
                                            steps: { [dsStepSizeId]: { rank: 1 } }
                                        };
                                        finalData.steps[dsStepSizeId] = { title: `Taille - ${ds}`, minChoices: 1, maxChoices: 1, items: {
                                            [s1]: { price: systemConfig.desserts.sizeS || 0, uuid: s1, rank: 1 },
                                            [s2]: { price: systemConfig.desserts.sizeM || 1, uuid: s2, rank: 2 },
                                            [s3]: { price: systemConfig.desserts.sizeL || 1.5, uuid: s3, rank: 3 }
                                        }};
                                        finalData.items[s1] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: "Taille S", price: { dflt: { ttc: systemConfig.desserts.sizeS || 0 } } };
                                        finalData.items[s2] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: "Taille M", price: { dflt: { ttc: systemConfig.desserts.sizeM || 1 } } };
                                        finalData.items[s3] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: "Taille L", price: { dflt: { ttc: systemConfig.desserts.sizeL || 1.5 } } };
                                    } else {
                                        finalData.items[duid] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: ds, price: { dflt: { ttc: 0 } }, img: { dflt: { img: `https://image.pollinations.ai/prompt/${encodeURIComponent(ds)}` } } };
                                    }
                                });
                                finalData.steps[stepDessertMenu] = { title: "Choix du Dessert", minChoices: 1, maxChoices: 1, items: dessertsItems };
                            }

                            finalData.modifier[menuModId] = {
                                "uuid-item": parentMenuUuid,
                                steps: menuSteps
                            };
                        };

                        if (systemConfig?.formulas?.isMenu) {
                            const optMenu = randomUUID();
                            const mPrice = systemConfig.formulas.menuPrice || 2.50;
                            formuleItems[optMenu] = { price: mPrice, uuid: optMenu, rank: fRank++ };
                            const optMenuModId = randomUUID();
                            finalData.items[optMenu] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: `En Menu (+${mPrice}€)`, price: { dflt: { ttc: mPrice } }, modifier: optMenuModId, img: { dflt: { img: "https://image.pollinations.ai/prompt/fastfood_menu_combo" } } };
                            buildMenuSubsteps(optMenuModId, optMenu);
                        }

                        if (systemConfig?.formulas?.isMaxi) {
                            const optMaxi = randomUUID();
                            const rPrice = systemConfig.formulas.maxiPrice || 3.50;
                            formuleItems[optMaxi] = { price: rPrice, uuid: optMaxi, rank: fRank++ };
                            const optMaxiModId = randomUUID();
                            finalData.items[optMaxi] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: `En Maxi Menu (+${rPrice}€)`, price: { dflt: { ttc: rPrice } }, modifier: optMaxiModId, img: { dflt: { img: "https://image.pollinations.ai/prompt/fastfood_maxi_menu" } } };
                            buildMenuSubsteps(optMaxiModId, optMaxi);
                        }

                        finalData.steps[stepFormuleId] = { title: "Choix de la Formule", minChoices: 1, maxChoices: 1, items: formuleItems };
                    }
                    
                    if (hasModifiers) {
                        finalData.items[itemId].modifier = realModifierId;
                        finalData.modifier[realModifierId] = {
                            "uuid-item": itemId,
                            steps: modSteps
                        };
                    }
                });
            }

            finalData.workflow[catId] = {
                type: "categories",
                rank: catRank++,
                content: contentBlock
            };
        });
    }

    // Plus de validation ETK360 aléatoire car on l'a construit mathématiquement
    let jsonResponse = JSON.stringify(finalData, null, 2);

    if (sauvegarder) {
      const timestamp = Date.now();
      let safeNameRaw = restaurantName || "Restaurant IA";
      
      // Cleanup de la chaine (on retire le "Je veux un vrai restaurant de : ") pour le filename
      safeNameRaw = safeNameRaw.replace("Je veux un vrai restaurant de : ", "");
      const safeName = safeNameRaw.slice(0, 30).replace(/[^a-z0-9A-Z]/gi, '_').toLowerCase();
      
      const filename = `ia_${safeName}_${timestamp}.json`;
      const filepath = path.join(process.cwd(), '.softavera', 'carte', filename);
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
    return files.filter(f => f.endsWith('.json') && !f.startsWith('ia_'));
  } catch (e) {
    console.error("Erreur read library:", e);
    return [];
  }
}
