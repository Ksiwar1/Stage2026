import re

file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

start_marker = "                    let modIndex = 1;"
end_marker = "                    if (Object.keys(itemModifiers).length > 0) {"

start_idx = content.find(start_marker)
end_idx = content.find("                });", start_idx) 

if start_idx == -1 or end_idx == -1:
    print("Could not find the old modification block.")
    exit(1)

new_code = """                    // NOUVEAU PARCOURS "MENU" TYPE MCDONALDS EXACT ETK360 COMPATIBLE
                    const realModifierId = randomUUID();
                    const modSteps: any = {};
                    let modRank = 1;
                    let hasModifiers = false;

                    if (isFoodItem) {
                        hasModifiers = true;
                        // ETAPE 1: Personnalisation
                        const stepPersoId = randomUUID();
                        const p1 = randomUUID(); const p2 = randomUUID(); const p3 = randomUUID(); const p4 = randomUUID();
                        modSteps[stepPersoId] = { rank: modRank++ };
                        
                        finalData.steps[stepPersoId] = { title: "Composition & Cuisson", minChoices: 0, maxChoices: 5, items: {
                            [p1]: { price: 0, uuid: p1, rank: 1 },
                            [p2]: { price: 0, uuid: p2, rank: 2 },
                            [p3]: { price: 0, uuid: p3, rank: 3 },
                            [p4]: { price: 1.50, uuid: p4, rank: 4 }
                        }};
                        
                        finalData.items[p1] = { id: 7001, type: "items", title: "Cuisson : À point", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/medium_rare" } } };
                        finalData.items[p2] = { id: 7002, type: "items", title: "Sans Oignon", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/no_onion" } } };
                        finalData.items[p3] = { id: 7003, type: "items", title: "Sans Tomate", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/no_tomato" } } };
                        finalData.items[p4] = { id: 7004, type: "items", title: "Supplément Fromage (+1.50€)", price: { dflt: { ttc: 1.50 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/extra_cheese" } } };

                        // ETAPE 2: Choix Formule
                        const stepFormuleId = randomUUID();
                        const optSeul = randomUUID(); 
                        const optMenu = randomUUID();
                        modSteps[stepFormuleId] = { rank: modRank++ };

                        finalData.steps[stepFormuleId] = { title: "Choix de la Formule", minChoices: 1, maxChoices: 1, items: {
                            [optSeul]: { price: 0, uuid: optSeul, rank: 1 },
                            [optMenu]: { price: 2.50, uuid: optMenu, rank: 2 }
                        }};

                        finalData.items[optSeul] = { id: 7101, type: "items", title: "Seul", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/single_burger" } } };

                        const optMenuModId = randomUUID();
                        finalData.items[optMenu] = { id: 7102, type: "items", title: "En Menu (+2.50€)", price: { dflt: { ttc: 2.50 } }, modifier: optMenuModId, img: { dflt: { img: "https://image.pollinations.ai/prompt/fastfood_menu_combo" } } };
                        
                        const stepBoissonMenu = randomUUID();
                        const stepAccompMenu = randomUUID();
                        
                        finalData.modifier[optMenuModId] = {
                            "uuid-item": optMenu,
                            steps: {
                                [stepBoissonMenu]: { rank: 1 },
                                [stepAccompMenu]: { rank: 2 }
                            }
                        };

                        const b1 = randomUUID(); const b2 = randomUUID();
                        finalData.steps[stepBoissonMenu] = { title: "Choix de la Boisson", minChoices: 1, maxChoices: 1, items: {
                            [b1]: { price: 0, uuid: b1, rank: 1 },
                            [b2]: { price: 0, uuid: b2, rank: 2 }
                        }};
                        finalData.items[b1] = { id: 7201, type: "items", title: "Coca-Cola (33cl)", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/coca_cola" } } };
                        finalData.items[b2] = { id: 7202, type: "items", title: "Eau Plate (50cl)", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/water_bottle" } } };

                        const a1 = randomUUID(); const a2 = randomUUID();
                        finalData.steps[stepAccompMenu] = { title: "Choix de l'Accompagnement", minChoices: 1, maxChoices: 1, items: {
                            [a1]: { price: 0, uuid: a1, rank: 1 },
                            [a2]: { price: 0, uuid: a2, rank: 2 }
                        }};
                        finalData.items[a1] = { id: 7301, type: "items", title: "Frites", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/french_fries" } } };
                        finalData.items[a2] = { id: 7302, type: "items", title: "Potatoes", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/potatoes_wedges" } } };

                    } else {
                        const requiresSizes = sujetDemande.includes("S / M / L");
                        if (requiresSizes) {
                            hasModifiers = true;
                            const stepSizeId = randomUUID();
                            const s1 = randomUUID(); const s2 = randomUUID();
                            modSteps[stepSizeId] = { rank: modRank++ };
                            
                            finalData.steps[stepSizeId] = { title: "Choix de la Taille", minChoices: 1, maxChoices: 1, items: {
                                [s1]: { price: 0, uuid: s1, rank: 1 },
                                [s2]: { price: 1.5, uuid: s2, rank: 2 }
                            }};
                            finalData.items[s1] = { id: 7401, type: "items", title: "Taille Standard", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/regular_size" } } };
                            finalData.items[s2] = { id: 7402, type: "items", title: "Taille Maxi (+1.50€)", price: { dflt: { ttc: 1.5 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/large_size" } } };
                        }
                    }

                    if (hasModifiers) {
                        finalData.items[itemId].modifier = realModifierId;
                        finalData.modifier[realModifierId] = {
                            "uuid-item": itemId,
                            steps: modSteps
                        };
                    }
"""

content = content[:start_idx] + new_code + content[end_idx:]

with open(file_path, "w") as f:
    f.write(content)

print("ETK360 parser compatible layout properly injected!")
