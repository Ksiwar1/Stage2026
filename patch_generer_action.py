import re

file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

# 1. Inject JSON Parsing
hook1 = 'const primaryColor = data.get("primaryColor") as string | null;'
injector1 = """const primaryColor = data.get("primaryColor") as string | null;
  const secondaryColor = data.get("secondaryColor") as string | null;
  const configJsonRaw = data.get("systemConfigJSON") as string | null;
  let systemConfig: any = null;
  if (configJsonRaw) {
      try { systemConfig = JSON.parse(configJsonRaw); } catch(e) {}
  }"""
content = content.replace(hook1 + '\n  const secondaryColor = data.get("secondaryColor") as string | null;', injector1)

# 2. Re-write the food branch
start_block = "                    if (isFoodItem) {"
end_block = "                    } else {"
start_idx = content.find(start_block)
end_idx = content.find(end_block, start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find food branch")
    exit(1)

new_code = """                    if (isFoodItem) {
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

                            // Boissons - fake logic auto
                            const stepBoissonMenu = randomUUID();
                            menuSteps[stepBoissonMenu] = { rank: sRank++ };
                            const b1 = randomUUID(); const b2 = randomUUID();
                            finalData.steps[stepBoissonMenu] = { title: "Choix de la Boisson", minChoices: 1, maxChoices: 1, items: {
                                [b1]: { price: 0, uuid: b1, rank: 1 },
                                [b2]: { price: 0, uuid: b2, rank: 2 }
                            }};
                            finalData.items[b1] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: "Coca-Cola (33cl)", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/coca_cola" } } };
                            finalData.items[b2] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: "Eau Plate (50cl)", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/water_bottle" } } };

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

"""

content = content[:start_idx] + new_code + content[end_idx:]
with open(file_path, "w") as f:
    f.write(content)

print("Dynamic backend mapping rules injected!")
