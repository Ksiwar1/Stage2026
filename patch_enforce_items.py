import re

file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

# Target block
target_anchor = """            const contentBlock: any = {};
            let itemRank = 1;

            if (catInfo.items && Array.isArray(catInfo.items)) {"""

new_block = """            const contentBlock: any = {};
            let itemRank = 1;

            const catTitle = catInfo.name || "Catégorie";
            const forcedItemsStr = systemConfig?.forcedItems?.[catTitle] || systemConfig?.forcedItems?.[catTitle.toUpperCase()] || systemConfig?.forcedItems?.[catTitle.toLowerCase()];
            
            if (forcedItemsStr && forcedItemsStr.trim() !== "") {
                const forcedArr = forcedItemsStr.split(",").map((s: string) => s.trim()).filter((s: string) => s !== "");
                const oldItems = Array.isArray(catInfo.items) ? catInfo.items : [];
                
                catInfo.items = forcedArr.map((forcedName: string) => {
                    const found = oldItems.find((i: any) => i.name && (i.name.toLowerCase().includes(forcedName.toLowerCase()) || forcedName.toLowerCase().includes(i.name.toLowerCase())));
                    return {
                        name: forcedName,
                        price: found && found.price ? found.price : (Math.floor(Math.random() * 5) + 5)
                    };
                });
            }

            if (catInfo.items && Array.isArray(catInfo.items)) {"""

content = content.replace(target_anchor, new_block)

with open(file_path, "w") as f:
    f.write(content)
