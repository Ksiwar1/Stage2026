import re

file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

# We want to find:
#                     contentBlock[itemId] = { type: "items", rank: itemRank++ };
#                 });

hook = 'contentBlock[itemId] = { type: "items", rank: itemRank++ };'
new_code = """                    contentBlock[itemId] = { type: "items", rank: itemRank++ };

                    // Auto-construct Formula Menus for categories named 'Menu'
                    if (catInfo.name && (catInfo.name.toLowerCase().includes("menu") || catInfo.name.toLowerCase().includes("formule"))) {
                        const step1Id = randomUUID();
                        const step2Id = randomUUID();
                        const sub1Id = randomUUID();
                        const sub2Id = randomUUID();
                        const sub3Id = randomUUID();
                        const sub4Id = randomUUID();
                        
                        finalData.modifier[itemId] = {
                            "1": { "uuid": step1Id },
                            "2": { "uuid": step2Id }
                        };
                        
                        finalData.steps[step1Id] = {
                            title: "Choix de l'Accompagnement",
                            minChoices: 1,
                            maxChoices: 1,
                            items: {
                                [sub1Id]: { price: 0, uuid: sub1Id, rank: 1 },
                                [sub2Id]: { price: 0, uuid: sub2Id, rank: 2 }
                            }
                        };
                        
                        finalData.steps[step2Id] = {
                            title: "Choix de la Boisson",
                            minChoices: 1,
                            maxChoices: 1,
                            items: {
                                [sub3Id]: { price: 0, uuid: sub3Id, rank: 1 },
                                [sub4Id]: { price: 0, uuid: sub4Id, rank: 2 }
                            }
                        };
                        
                        finalData.items[sub1Id] = { id: 9001, type: "items", title: "Frites Maison", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/frites_croustillantes" } } };
                        finalData.items[sub2Id] = { id: 9002, type: "items", title: "Salade Verte", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/salade_verte" } } };
                        finalData.items[sub3Id] = { id: 9003, type: "items", title: "Coca-Cola", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/coca_cola" } } };
                        finalData.items[sub4Id] = { id: 9004, type: "items", title: "Eau Plate", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/eau_bouteille" } } };
                    }"""

content = content.replace(hook, new_code)

with open(file_path, "w") as f:
    f.write(content)

print("Modifiers injection applied.")
