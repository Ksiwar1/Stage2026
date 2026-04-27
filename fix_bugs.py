import re

file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

# Fix 1: Coerce AI Items output to Array & Fix 2: Inject modifier into workflow object
target_injection = """            // Inject the Products (Items)
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

new_injection = """            // Inject the Products (Items) resolving LLM Hallucinations (Dictionnary vs Array)
            let aiItemsList = aiCat.items;
            if (aiItemsList && !Array.isArray(aiItemsList) && typeof aiItemsList === 'object') {
                aiItemsList = Object.values(aiItemsList);
            }

            if (aiItemsList && Array.isArray(aiItemsList)) {
                let itemRankCounter = Object.keys(finalData.workflow[targetCatId].content).length + 1;

                aiItemsList.forEach((aiItem: any) => {
                    const itemId = randomUUID();
                    const itemName = aiItem.name || aiItem.nom || aiItem.title || aiItem.titre || "Produit INCONNU";
                    const itemPrice = aiItem.price ?? aiItem.prix ?? 10.0;
                    const encodedImg = encodeURIComponent(itemName.trim().replace(/\\s+/g, '_'));

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

                    let injectedModifierId: string | null = null;
                    // Attacher le modifier scavengé EN LE CLONANT spécifiquement pour cet item !
                    if (scavengedModifierTemplateId) {
                        const uniqueClonedModId = cloneGeneticModifier(scavengedModifierTemplateId, itemId, finalData);
                        if (uniqueClonedModId) {
                            finalData.items[itemId].modifier = uniqueClonedModId;
                            injectedModifierId = uniqueClonedModId;
                        }
                    }

                    // ETK360 REQUIERT LE MODIFIER SUR LE NOEUD WORKFLOW POUR ACTIVER LE CLIC !
                    finalData.workflow[targetCatId].content[itemId] = { 
                        type: "items", 
                        rank: itemRankCounter++ 
                    };
                    if (injectedModifierId) {
                        finalData.workflow[targetCatId].content[itemId].modifier = injectedModifierId;
                    }
                });
            }"""

if target_injection in content:
    content = content.replace(target_injection, new_injection)
    with open(file_path, "w") as f:
        f.write(content)
    print("Fixes applied successfully.")
else:
    print("Target block not found.")
