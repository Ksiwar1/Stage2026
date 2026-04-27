import re

file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

# We want to replace everything from `// Initialisation exacte du format ETK360` to the end of the `if (sourceCategories.length > 0)` block.
# Wait, let's target the exact blocks.
start_marker = "// Initialisation exacte du format ETK360"
end_marker = "// Plus de validation ETK360 aléatoire"

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    new_block = """// Initialisation exacte du format ETK360
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

    // Genetic Scavenger Helper
    const cloneGeneticModifier = (modId: string, fData: any) => {
        const mod = memoryModifiers[modId];
        if (!mod) return;
        fData.modifier[modId] = { ...mod }; // Shallow copy
        
        if (mod.steps) {
            Object.keys(mod.steps).forEach(stepId => {
                const stp = memorySteps[stepId];
                if (stp) {
                    fData.steps[stepId] = { ...stp };
                    if (stp.items) {
                        Object.keys(stp.items).forEach(itemId => {
                            const itm = memoryItems[itemId];
                            if (itm) {
                                fData.items[itemId] = { ...itm };
                                // Recursive cloning for nested menus/options
                                if (itm.modifier) {
                                    cloneGeneticModifier(itm.modifier, fData);
                                }
                            }
                        });
                    }
                }
            });
        }
    };

    const getScavengedModifierForCategory = (aiCatName: string) => {
        const needle = aiCatName.toLowerCase();
        // Exact match or partial match
        for (const meta of memoryWorkflowMeta) {
            if (meta.modId && (needle.includes(meta.catTitle) || meta.catTitle.includes(needle))) {
                return meta.modId;
            }
        }
        // Fallback generic search (Burgers, Pizzas)
        if (needle.includes("menu") || needle.includes("formule")) {
            const fh = memoryWorkflowMeta.find(m => m.catTitle.includes("menu") && m.modId);
            if (fh) return fh.modId;
        }
        return null; // Pas trouvé
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
            
            // Placer cette catégorie dans le Workflow Hybride
            let targetCatId = null;
            // On essaie de trouver un match dans BaseMap
            for (const wCatId of Object.keys(finalData.workflow)) {
                const wCatTitle = (finalData.categories[wCatId]?.title || "").toLowerCase();
                if (aiCatName.toLowerCase().includes(wCatTitle) || wCatTitle.includes(aiCatName.toLowerCase())) {
                    targetCatId = wCatId;
                    break;
                }
            }

            if (!targetCatId) {
                // Pas de match structuriel, on crée un nouveau bucket
                targetCatId = randomUUID();
                finalData.workflow[targetCatId] = { type: "categories", rank: fallbackCatRank++, content: {} };
                finalData.categories[targetCatId] = {
                    title: aiCatName,
                    isVisible: true,
                    color: finalData.theme.palette[Math.floor(Math.random() * finalData.theme.palette.length)]
                };
            }

            // Mettre à jour le titre si on veut écraser, ou on garde l'existant.
            // On garde le titre de BaseMap pour "reproduire la logique métier" exactement.
            // Mais l'AI a pu l'appeler "Pizzas Artisanales", donc on l'hybride :
            finalData.categories[targetCatId].title = aiCatName; 

            // Genetic Scavenger: Find the best modifier to attach
            const scavengedModifierId = getScavengedModifierForCategory(aiCatName);
            if (scavengedModifierId) {
               // Clone whole subsystem from memory pool
               cloneGeneticModifier(scavengedModifierId, finalData);
            }

            // Inject the Products (Items)
            if (aiCat.items && Array.isArray(aiCat.items)) {
                let itemRankCounter = Object.keys(finalData.workflow[targetCatId].content).length + 1;

                aiCat.items.forEach((aiItem: any) => {
                    const itemId = randomUUID();
                    const itemName = aiItem.name || aiItem.nom || aiItem.title || aiItem.titre || "Produit INCONNU";
                    const itemPrice = aiItem.price ?? aiItem.prix ?? 10.0;
                    const encodedImg = encodeURIComponent(itemName.trim().replace(/\s+/g, '_'));

                    finalData.items[itemId] = {
                        id: Math.floor(Math.random() * 900) + 1000,
                        type: "items",
                        title: itemName,
                        price: { dflt: { ttc: itemPrice } },
                        img: { dflt: { img: `https://image.pollinations.ai/prompt/${encodedImg}` } }
                    };

                    if (aiItem.description || aiItem.desc) {
                        finalData.items[itemId].desc = aiItem.description || aiItem.desc;
                    }

                    // Attacher le modifier scavengé si disponible
                    if (scavengedModifierId) {
                        finalData.items[itemId].modifier = scavengedModifierId;
                    }

                    finalData.workflow[targetCatId].content[itemId] = { type: "items", rank: itemRankCounter++ };
                });
            }
        });
    }

    """
    content = content[:start_idx] + new_block + content[end_idx:]
    with open(file_path, "w") as f:
        f.write(content)
    print("Spliced successfully!")
else:
    print("Markers not found.")
