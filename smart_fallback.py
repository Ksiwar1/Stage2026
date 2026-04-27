import re

file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

target_injection = """                    // FALLBACK PROCEDURAL COMPLET (A la demande de l'utilisateur : Mode "Menu" garanti)
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

new_injection = """                    // FALLBACK PROCEDURAL COMPLET ET ADAPTATIF
                    if (!injectedModifierId) {
                        const procModId = randomUUID();
                        let stepRank = 1;
                        finalData.modifier[procModId] = { "uuid-item": itemId, steps: {} };
                        const normCat = normalizeCategory(aiCatName);

                        // 1. Choix de la formule (Seulement pour plats principaux, si isMenu demandé)
                        const wantsMenu = systemConfig?.formulas?.isMenu && normCat !== "boisson" && normCat !== "dessert" && normCat !== "entree";
                        if (wantsMenu) {
                            const sFormuleId = randomUUID();
                            finalData.modifier[procModId].steps[sFormuleId] = { rank: stepRank++ };
                            finalData.steps[sFormuleId] = { title: "Choix de la Formule", minChoices: 1, maxChoices: 1, semanticType: "OPTION_GLOBALE", items: {} };
                            
                            const stId1 = randomUUID(); finalData.steps[sFormuleId].items[stId1] = { rank: 1, price: {dflt:{ttc:0}} };
                            finalData.items[stId1] = { title: "Produit Seul" };
                            
                            if (systemConfig.formulas.isMenu) {
                                 const stId2 = randomUUID(); finalData.steps[sFormuleId].items[stId2] = { rank: 2, price: {dflt:{ttc:systemConfig.formulas.menuPrice||2.50}} };
                                 finalData.items[stId2] = { title: "Menu complet" };
                            }
                            if (systemConfig.formulas.isMaxi) {
                                 const stId3 = randomUUID(); finalData.steps[sFormuleId].items[stId3] = { rank: 3, price: {dflt:{ttc:systemConfig.formulas.maxiPrice||3.50}} };
                                 finalData.items[stId3] = { title: "Maxi Menu" };
                            }
                        }

                        // 2. Etapes sémantiques adaptées au type de produit
                        const sSpecificId = randomUUID();
                        let specificAdded = false;
                        
                        if (["burger", "kebab", "viande", "tacos", "sandwich"].some(x => normCat.includes(x))) {
                            finalData.steps[sSpecificId] = { title: "Cuisson & Options", minChoices: 0, maxChoices: 1, items: {} };
                            const c1 = randomUUID(); finalData.steps[sSpecificId].items[c1] = { rank: 1, price: {dflt:{ttc:0}} }; finalData.items[c1] = { title: "A point" };
                            const c2 = randomUUID(); finalData.steps[sSpecificId].items[c2] = { rank: 2, price: {dflt:{ttc:0}} }; finalData.items[c2] = { title: "Bien cuit" };
                            specificAdded = true;
                        } else if (normCat.includes("salade")) {
                            finalData.steps[sSpecificId] = { title: "Choix de la Vinaigrette", minChoices: 0, maxChoices: 1, semanticType: "SAUCES", items: {} };
                            const c1 = randomUUID(); finalData.steps[sSpecificId].items[c1] = { rank: 1, price: {dflt:{ttc:0}} }; finalData.items[c1] = { title: "Vinaigrette Balsamique" };
                            const c2 = randomUUID(); finalData.steps[sSpecificId].items[c2] = { rank: 2, price: {dflt:{ttc:0}} }; finalData.items[c2] = { title: "Sauce César" };
                            specificAdded = true;
                        } else if (normCat.includes("boisson")) {
                            finalData.steps[sSpecificId] = { title: "Format et Options", minChoices: 1, maxChoices: 1, semanticType: "TAILLE", items: {} };
                            const c1 = randomUUID(); finalData.steps[sSpecificId].items[c1] = { rank: 1, price: {dflt:{ttc:0}} }; finalData.items[c1] = { title: "Standard (33cl)" };
                            const c2 = randomUUID(); finalData.steps[sSpecificId].items[c2] = { rank: 2, price: {dflt:{ttc:1.50}} }; finalData.items[c2] = { title: "Maxi (50cl)" };
                            specificAdded = true;
                        } else if (normCat.includes("dessert")) {
                            finalData.steps[sSpecificId] = { title: "Gourmandises supplémentaires", minChoices: 0, maxChoices: 1, semanticType: "EXTRAS", items: {} };
                            const c1 = randomUUID(); finalData.steps[sSpecificId].items[c1] = { rank: 1, price: {dflt:{ttc:1.0}} }; finalData.items[c1] = { title: "Avec Chantilly" };
                            const c2 = randomUUID(); finalData.steps[sSpecificId].items[c2] = { rank: 2, price: {dflt:{ttc:1.5}} }; finalData.items[c2] = { title: "Boule de glace vanille" };
                            specificAdded = true;
                        } else if (normCat.includes("pizza")) {
                            finalData.steps[sSpecificId] = { title: "Bord farci (Optionnel)", minChoices: 0, maxChoices: 1, semanticType: "TAILLE", items: {} };
                            const c2 = randomUUID(); finalData.steps[sSpecificId].items[c2] = { rank: 1, price: {dflt:{ttc:3.0}} }; finalData.items[c2] = { title: "Bord Fourré Fromage" };
                            specificAdded = true;
                        }

                        if (specificAdded) {
                            finalData.modifier[procModId].steps[sSpecificId] = { rank: stepRank++ };
                        }

                        // 3. Choix liés au menu (Boisson + Frites)
                        if (wantsMenu) {
                            const sBoissonId = randomUUID();
                            finalData.modifier[procModId].steps[sBoissonId] = { rank: stepRank++ };
                            finalData.steps[sBoissonId] = { title: "Choix de la boisson", minChoices: 1, maxChoices: 1, semanticType: "BOISSON", items: {} };
                            const b1 = randomUUID(); finalData.steps[sBoissonId].items[b1] = { rank: 1, price: {dflt:{ttc:0}} }; finalData.items[b1] = { title: "Coca-Cola" };
                            const b2 = randomUUID(); finalData.steps[sBoissonId].items[b2] = { rank: 2, price: {dflt:{ttc:0}} }; finalData.items[b2] = { title: "Fanta" };
                            const b3 = randomUUID(); finalData.steps[sBoissonId].items[b3] = { rank: 3, price: {dflt:{ttc:0}} }; finalData.items[b3] = { title: "Sprite" };

                            const sFriteId = randomUUID();
                            finalData.modifier[procModId].steps[sFriteId] = { rank: stepRank++ };
                            finalData.steps[sFriteId] = { title: "Choix de l'accompagnement", minChoices: 1, maxChoices: 1, semanticType: "FRITES", items: {} };
                            const a1 = randomUUID(); finalData.steps[sFriteId].items[a1] = { rank: 1, price: {dflt:{ttc:0}} }; finalData.items[a1] = { title: "Frites Classiques" };
                            const a2 = randomUUID(); finalData.steps[sFriteId].items[a2] = { rank: 2, price: {dflt:{ttc:1.0}} }; finalData.items[a2] = { title: "Potatoes Crispy" };
                        }

                        // On assigne le modifier généré QUE s'il y a au moins une étape à afficher
                        if (stepRank > 1) {
                            finalData.items[itemId].modifier = procModId;
                            injectedModifierId = procModId;
                        }
                    }"""

if target_injection in content:
    content = content.replace(target_injection, new_injection)
    with open(file_path, "w") as f:
        f.write(content)
    print("Smart Procedural Adaptive Modifiers OK.")
else:
    print("Injection target not found in genererCarteAction.ts!")

