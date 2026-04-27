file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

target_desserts = """                            // Desserts dynamiques
                            const dessertsListStr = systemConfig?.desserts?.list || "";
                            const dessertsArr = dessertsListStr.split(",").map((s:string) => s.trim()).filter((s:string) => s !== "");"""

new_desserts = """                            // Desserts dynamiques sourcés depuis la catégorie générée si possible
                            let dynamicDesserts = extractItemsFromCategoryKeyword("dessert");
                            if (dynamicDesserts.length === 0) dynamicDesserts = extractItemsFromCategoryKeyword("douceur");
                            if (dynamicDesserts.length === 0) dynamicDesserts = extractItemsFromCategoryKeyword("sucr");
                            
                            let dessertsArr = dynamicDesserts.length > 0
                                ? dynamicDesserts
                                : (systemConfig?.desserts?.list || "").split(",").map((s:string) => s.trim()).filter((s:string) => s !== "");"""

content = content.replace(target_desserts, new_desserts)

with open(file_path, "w") as f:
    f.write(content)
print("Desserts array mapped successfully")
