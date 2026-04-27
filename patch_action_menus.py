import re

file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

old_block = """                            // Boissons - fake logic auto
                            const stepBoissonMenu = randomUUID();
                            menuSteps[stepBoissonMenu] = { rank: sRank++ };
                            const b1 = randomUUID(); const b2 = randomUUID();
                            finalData.steps[stepBoissonMenu] = { title: "Choix de la Boisson", minChoices: 1, maxChoices: 1, items: {
                                [b1]: { price: 0, uuid: b1, rank: 1 },
                                [b2]: { price: 0, uuid: b2, rank: 2 }
                            }};
                            finalData.items[b1] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: "Coca-Cola (33cl)", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/coca_cola" } } };
                            finalData.items[b2] = { id: Math.floor(Math.random()*9000)+1000, type: "items", title: "Eau Plate (50cl)", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/water_bottle" } } };"""

new_block = """                            // Boissons dynamiques
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
                            }"""

content = content.replace(old_block, new_block)

old_accomp = """                            finalData.steps[stepAccompMenu] = { title: "Choix de l'Accompagnement", minChoices: 1, maxChoices: 1, items: accompItems };"""

new_accomp = """                            finalData.steps[stepAccompMenu] = { title: "Choix de l'Accompagnement", minChoices: 1, maxChoices: 1, items: accompItems };
                            
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
                            }"""

content = content.replace(old_accomp, new_accomp)

with open(file_path, "w") as f:
    f.write(content)

