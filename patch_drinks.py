file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

target_insert = """    // Mapping 1-to-1 absolu avec des UUIDs Backend natifs
    if (sourceCategories.length > 0) {"""

helper_func = """    const extractItemsFromCategoryKeyword = (keyword: string) => {
        const foundItems: string[] = [];
        sourceCategories.forEach((c: any) => {
            const cName = (c.name || c.nom || c.title || c.titre || "").toLowerCase();
            if (cName.includes(keyword)) {
                if (c.items && Array.isArray(c.items)) {
                    c.items.forEach((i: any) => {
                        const iName = i.name || i.nom || i.title || i.titre;
                        if (iName) foundItems.push(iName);
                    });
                }
            }
        });
        return foundItems;
    };

    // Mapping 1-to-1 absolu avec des UUIDs Backend natifs
    if (sourceCategories.length > 0) {"""

# Replace `drinksArr` logic
target_drinks = """                            // Boissons dynamiques
                            const drinksListStr = systemConfig?.drinks?.list || "Coca-Cola, Eau Plate";
                            const drinksArr = drinksListStr.split(",").map((s:string) => s.trim()).filter((s:string) => s !== "");
                            if (drinksArr.length > 0) {"""

new_drinks = """                            // Boissons dynamiques sourcées depuis la catégorie générée si possible
                            let dynamicDrinks = extractItemsFromCategoryKeyword("boisson");
                            if (dynamicDrinks.length === 0) dynamicDrinks = extractItemsFromCategoryKeyword("drink");
                            if (dynamicDrinks.length === 0) dynamicDrinks = extractItemsFromCategoryKeyword("breuvage");
                            
                            let drinksArr = dynamicDrinks.length > 0 
                                ? dynamicDrinks 
                                : (systemConfig?.drinks?.list || "Coca-Cola, Eau Plate").split(",").map((s:string) => s.trim()).filter((s:string) => s !== "");

                            if (drinksArr.length > 0) {"""


# Desserts (Accomps) Logic
target_accomp = """                            // Accompagnements dynamiques
                            const stepAccompMenu = randomUUID();
                            menuSteps[stepAccompMenu] = { rank: sRank++ };
                            
                            const accompListStr = systemConfig?.accompaniments?.list || "Frites, Potatoes";
                            const accompArr = accompListStr.split(",").map((s:string) => s.trim()).filter((s:string) => s !== "");"""

new_accomp = """                            // Accompagnements dynamiques sourcés depuis la catégorie générée si possible
                            const stepAccompMenu = randomUUID();
                            menuSteps[stepAccompMenu] = { rank: sRank++ };
                            
                            let dynamicAcc = extractItemsFromCategoryKeyword("accompagnement");
                            if (dynamicAcc.length === 0) dynamicAcc = extractItemsFromCategoryKeyword("frite");
                            if (dynamicAcc.length === 0) dynamicAcc = extractItemsFromCategoryKeyword("side");
                            
                            let accompArr = dynamicAcc.length > 0
                                ? dynamicAcc
                                : (systemConfig?.accompaniments?.list || "Frites, Potatoes").split(",").map((s:string) => s.trim()).filter((s:string) => s !== "");
"""

# Wait, what if the user also wants Desserts in the menu? 
# The UI has formulas. Usually Formula is (Dish + Drink) or (Dish + Accomp + Drink) or (Dish + Drink + Dessert).
# Let's see if menu steps include desserts.
import re

content = content.replace(target_insert, helper_func)
content = content.replace(target_drinks, new_drinks)
content = content.replace(target_accomp, new_accomp)

with open(file_path, "w") as f:
    f.write(content)
print("Drinks array mapped successfully")
