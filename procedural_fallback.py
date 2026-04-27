import re

file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

target_injection = """                    let injectedModifierId: string | null = null;
                    // Attacher le modifier scavengé EN LE CLONANT spécifiquement pour cet item !
                    if (scavengedModifierTemplateId) {
                        const uniqueClonedModId = cloneGeneticModifier(scavengedModifierTemplateId, itemId, finalData);
                        if (uniqueClonedModId) {
                            finalData.items[itemId].modifier = uniqueClonedModId;
                            injectedModifierId = uniqueClonedModId;
                        }
                    }"""

new_injection = """                    let injectedModifierId: string | null = null;
                    // Attacher le modifier scavengé EN LE CLONANT spécifiquement pour cet item !
                    if (scavengedModifierTemplateId) {
                        const uniqueClonedModId = cloneGeneticModifier(scavengedModifierTemplateId, itemId, finalData);
                        if (uniqueClonedModId) {
                            finalData.items[itemId].modifier = uniqueClonedModId;
                            injectedModifierId = uniqueClonedModId;
                        }
                    } 
                    
                    // FALLBACK PROCEDURAL COMPLET (A la demande de l'utilisateur : Mode "Menu" garanti)
                    if (!injectedModifierId && systemConfig?.formulas?.isMenu && normalizeCategory(aiCatName) !== "boisson" && normalizeCategory(aiCatName) !== "dessert") {
                        const procModId = randomUUID();
                        const sFormuleId = randomUUID();
                        const sCuissonId = randomUUID();
                        const sBoissonId = randomUUID();
                        const sFriteId = randomUUID();
                        
                        // Modifier structure
                        finalData.modifier[procModId] = {
                            "uuid-item": itemId,
                            "steps": {
                                [sFormuleId]: { rank: 1 },
                                [sCuissonId]: { rank: 2 },
                                [sBoissonId]: { rank: 3 },
                                [sFriteId]: { rank: 4 }
                            }
                        };
                        
                        // Steps structure
                        finalData.steps[sFormuleId] = { title: "Choix de la Formule", minChoices: 1, maxChoices: 1, items: {} };
                        const stId1 = randomUUID(); finalData.steps[sFormuleId].items[stId1] = { rank: 1, price: {dflt:{ttc:0}} };
                        finalData.items[stId1] = { title: "Produit Seul" };
                        
                        if (systemConfig.formulas.isMenu) {
                             const stId2 = randomUUID(); finalData.steps[sFormuleId].items[stId2] = { rank: 2, price: {dflt:{ttc:systemConfig.formulas.menuPrice||2.50}} };
                             finalData.items[stId2] = { title: "Menu (Boisson + Frites)" };
                        }
                        if (systemConfig.formulas.isMaxi) {
                             const stId3 = randomUUID(); finalData.steps[sFormuleId].items[stId3] = { rank: 3, price: {dflt:{ttc:systemConfig.formulas.maxiPrice||3.50}} };
                             finalData.items[stId3] = { title: "Maxi Menu" };
                        }

                        finalData.steps[sCuissonId] = { title: "Cuisson & Options", minChoices: 0, maxChoices: 1, items: {} };
                        const c1 = randomUUID(); finalData.steps[sCuissonId].items[c1] = { rank: 1, price: {dflt:{ttc:0}} }; finalData.items[c1] = { title: "A point" };
                        const c2 = randomUUID(); finalData.steps[sCuissonId].items[c2] = { rank: 2, price: {dflt:{ttc:0}} }; finalData.items[c2] = { title: "Bien cuit" };

                        finalData.steps[sBoissonId] = { title: "Choix de la boisson", minChoices: 1, maxChoices: 1, items: {} };
                        const b1 = randomUUID(); finalData.steps[sBoissonId].items[b1] = { rank: 1, price: {dflt:{ttc:0}} }; finalData.items[b1] = { title: "Coca-Cola" };
                        const b2 = randomUUID(); finalData.steps[sBoissonId].items[b2] = { rank: 2, price: {dflt:{ttc:0}} }; finalData.items[b2] = { title: "Fanta" };
                        const b3 = randomUUID(); finalData.steps[sBoissonId].items[b3] = { rank: 3, price: {dflt:{ttc:0}} }; finalData.items[b3] = { title: "Sprite" };

                        finalData.steps[sFriteId] = { title: "Choix de l'accompagnement", minChoices: 1, maxChoices: 1, items: {} };
                        const a1 = randomUUID(); finalData.steps[sFriteId].items[a1] = { rank: 1, price: {dflt:{ttc:0}} }; finalData.items[a1] = { title: "Frites Classiques" };
                        const a2 = randomUUID(); finalData.steps[sFriteId].items[a2] = { rank: 2, price: {dflt:{ttc:1.0}} }; finalData.items[a2] = { title: "Potatoes Crispy" };

                        finalData.items[itemId].modifier = procModId;
                        injectedModifierId = procModId;
                    }"""

if target_injection in content:
    content = content.replace(target_injection, new_injection)
    with open(file_path, "w") as f:
        f.write(content)
    print("Procedural Menu Fallback OK.")
else:
    print("Injection target not found in genererCarteAction.ts!")

