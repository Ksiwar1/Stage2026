import re

file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

# I will replace the previous patch
hook = """                    // Auto-construct Formula Menus for categories named 'Menu'
                    if (catInfo.name && (catInfo.name.toLowerCase().includes("menu") || catInfo.name.toLowerCase().includes("formule"))) {"""

# We need to find the old code I just added and replace it entirely.
start_idx = content.find("// Auto-construct Formula Menus")
# find the end of the if block
end_idx = content.find("finalData.items[sub4Id] =") 
if end_idx != -1:
    end_idx = content.find("}", end_idx) + 1

if start_idx != -1 and end_idx != -1:
    new_code = """                    // Auto-construct Modifiers dynamically
                    const isFeatureMenu = catInfo.name && (catInfo.name.toLowerCase().includes("menu") || catInfo.name.toLowerCase().includes("formule") || catInfo.name.toLowerCase().includes("trio"));
                    const requiresSizes = sujetDemande.includes("S / M / L");
                    const requiresSauces = sujetDemande.includes("Sauces au choix");
                    const isDrinkOrDessert = catInfo.name && (catInfo.name.toLowerCase().includes("boisson") || catInfo.name.toLowerCase().includes("dessert"));

                    let modIndex = 1;
                    const itemModifiers = {};

                    if (isFeatureMenu) {
                        const step1Id = randomUUID();
                        const step2Id = randomUUID();
                        const sub1Id = randomUUID(); const sub2Id = randomUUID(); const sub3Id = randomUUID(); const sub4Id = randomUUID();
                        itemModifiers[modIndex++] = { "uuid": step1Id };
                        itemModifiers[modIndex++] = { "uuid": step2Id };
                        
                        finalData.steps[step1Id] = { title: "Choix de l'Accompagnement", minChoices: 1, maxChoices: 1, items: {
                            [sub1Id]: { price: 0, uuid: sub1Id, rank: 1 },
                            [sub2Id]: { price: 0, uuid: sub2Id, rank: 2 }
                        }};
                        finalData.steps[step2Id] = { title: "Choix de la Boisson", minChoices: 1, maxChoices: 1, items: {
                            [sub3Id]: { price: 0, uuid: sub3Id, rank: 1 },
                            [sub4Id]: { price: 0, uuid: sub4Id, rank: 2 }
                        }};
                        finalData.items[sub1Id] = { id: 9101, type: "items", title: "Frites Maison", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/frites_croustillantes" } } };
                        finalData.items[sub2Id] = { id: 9102, type: "items", title: "Salade Verte", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/salade_verte" } } };
                        finalData.items[sub3Id] = { id: 9103, type: "items", title: "Coca-Cola", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/coca_cola" } } };
                        finalData.items[sub4Id] = { id: 9104, type: "items", title: "Eau Plate", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/eau_bouteille" } } };
                    }
                    
                    if (requiresSizes && !isFeatureMenu) {
                        const stepSizeId = randomUUID();
                        const s1 = randomUUID(); const s2 = randomUUID(); const s3 = randomUUID();
                        itemModifiers[modIndex++] = { "uuid": stepSizeId };
                        
                        finalData.steps[stepSizeId] = { title: "Le choix de la Taille", minChoices: 1, maxChoices: 1, items: {
                            [s1]: { price: 0, uuid: s1, rank: 1 },
                            [s2]: { price: 2.0, uuid: s2, rank: 2 },
                            [s3]: { price: 3.5, uuid: s3, rank: 3 }
                        }};
                        finalData.items[s1] = { id: 9201, type: "items", title: "Taille Normale", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/regular_size" } } };
                        finalData.items[s2] = { id: 9202, type: "items", title: "Taille Maxi (+2.00€)", price: { dflt: { ttc: 2.0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/large_size" } } };
                        finalData.items[s3] = { id: 9203, type: "items", title: "Taille Géante (+3.50€)", price: { dflt: { ttc: 3.5 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/giant_size" } } };
                    }

                    if (requiresSauces && !isDrinkOrDessert && !isFeatureMenu) {
                        const stepSauceId = randomUUID();
                        const sc1 = randomUUID(); const sc2 = randomUUID(); const sc3 = randomUUID();
                        itemModifiers[modIndex++] = { "uuid": stepSauceId };
                        
                        finalData.steps[stepSauceId] = { title: "Sauce au Choix", minChoices: 1, maxChoices: 2, items: {
                            [sc1]: { price: 0, uuid: sc1, rank: 1 },
                            [sc2]: { price: 0, uuid: sc2, rank: 2 },
                            [sc3]: { price: 0, uuid: sc3, rank: 3 }
                        }};
                        finalData.items[sc1] = { id: 9301, type: "items", title: "Ketchup", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/ketchup_sauce" } } };
                        finalData.items[sc2] = { id: 9302, type: "items", title: "Mayonnaise", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/mayo_sauce" } } };
                        finalData.items[sc3] = { id: 9303, type: "items", title: "Sauce Algérienne", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/spicy_sauce" } } };
                    }

                    if (Object.keys(itemModifiers).length > 0) {
                        finalData.modifier[itemId] = itemModifiers;
                    }"""
    
    content = content[:start_idx] + new_code + content[end_idx:]
    with open(file_path, "w") as f:
        f.write(content)
    print("Modifier logic heavily upgraded.")
else:
    print("Couldn't find old block.")
