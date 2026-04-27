import re

file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

# 1. Replace `cloneGeneticModifier`
target_clone_function = """    // Genetic Scavenger Helper
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
    };"""

new_clone_function = """    // Genetic Scavenger Helper - DEEP CLONING (Zero Conflict UUIDs)
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
    };"""

content = content.replace(target_clone_function, new_clone_function)


# 2. Replace the ScavengedModifier Injection and Call block
target_injection = """            // Genetic Scavenger: Find the best modifier to attach
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
            }"""

new_injection = """            // Genetic Scavenger: Find the best modifier template to attach
            const scavengedModifierTemplateId = getScavengedModifierForCategory(aiCatName);

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

                    // Attacher le modifier scavengé EN LE CLONANT spécifiquement pour cet item !
                    if (scavengedModifierTemplateId) {
                        const uniqueClonedModId = cloneGeneticModifier(scavengedModifierTemplateId, itemId, finalData);
                        if (uniqueClonedModId) {
                            finalData.items[itemId].modifier = uniqueClonedModId;
                        }
                    }

                    finalData.workflow[targetCatId].content[itemId] = { type: "items", rank: itemRankCounter++ };
                });
            }"""

content = content.replace(target_injection, new_injection)

# 3. Add forced prompt for Desserts
target_prompt = """Adapte rigoureusement le nombre de catégories, leurs noms, et la description/quantité des produits selon les consignes exactes (langue, badges, etc.) dictées dans le Sujet Demandé par le client. AUCUN texte additionnel.`;"""
new_prompt = """Adapte rigoureusement le nombre de catégories, leurs noms, et la description/quantité des produits selon les consignes exactes (langue, badges, etc.) dictées dans le Sujet Demandé par le client.
INSTRUCTION CRITIQUE : Tu dois OBLIGATOIREMENT créer un noeud 'categories' pour chaque type de produit réclamé par le client (ex: si le sujet demande explicitement des Desserts ou Boissons, tu DOIS générer la catégorie même si tu n'as pas d'idées, mets 2 produits fictifs au minimum). Aucun abandon n'est toléré.
AUCUN texte additionnel.`;"""

content = content.replace(target_prompt, new_prompt)

with open(file_path, "w") as f:
    f.write(content)

print("Deep clone injected!")
