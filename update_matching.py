import re

file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

# We want to insert normalizeCategory before getScavengedModifierForCategory
# And modify getScavengedModifierForCategory
target_block_1 = """    const getScavengedModifierForCategory = (aiCatName: string) => {
        const needle = aiCatName.toLowerCase();
        // Exact match or partial match
        for (const meta of memoryWorkflowMeta) {
            if (meta.modId && (needle.includes(meta.catTitle) || meta.catTitle.includes(needle))) {
                return meta.modId;
            }
        }
        // Fallback generic search (Burgers, Pizzas)
        if (needle.includes("menu") || needle.includes("formule")) {
            const fh = memoryWorkflowMeta.find(m => m.catTitle.includes("menu") && m.modId);
            if (fh) return fh.modId;
        }
        return null; // Pas trouvé
    };"""

new_block_1 = """    // Dictionnaire de normalisation sémantique interne ETK360
    const normalizeCategory = (name: string): string => {
        if (!name) return "";
        const n = name.toLowerCase();
        if (n.match(/pizza|pizzas/)) return "pizza";
        if (n.match(/boisson|boissons|soft|softs|drink|drinks|soda/)) return "boisson";
        if (n.match(/dessert|desserts|glace|glaces|sucre|sucré/)) return "dessert";
        if (n.match(/burger|burgers|sandwich|hamburger/)) return "burger";
        if (n.match(/menu|menus|formule|formules|combo|combos/)) return "menu";
        if (n.match(/salade|salades|bowl|pokebowl/)) return "salade";
        if (n.match(/accompagnement|frite|frites|potatoes|side/)) return "accompagnement";
        if (n.match(/tacos|wrap|wraps/)) return "tacos";
        return n.replace(/nos /g, "").trim(); // Remove generic prefixes
    };

    const getScavengedModifierForCategory = (aiCatName: string) => {
        const needle = aiCatName.toLowerCase();
        const normalNeedle = normalizeCategory(needle);

        // 1. Sémantique métier stricte
        for (const meta of memoryWorkflowMeta) {
            if (meta.modId && ((normalizeCategory(meta.catTitle) === normalNeedle) || (normalNeedle !== "" && normalNeedle.length > 3 && meta.catTitle.includes(normalNeedle)))) {
                return meta.modId;
            }
        }

        // 2. Fallback de sécurité
        for (const meta of memoryWorkflowMeta) {
            if (meta.modId && (needle.includes(meta.catTitle) || meta.catTitle.includes(needle))) {
                return meta.modId;
            }
        }
        
        return null; // Pas trouvé
    };"""

# And modify the workflow matching
target_block_2 = """            // On essaie de trouver un match dans BaseMap
            for (const wCatId of Object.keys(finalData.workflow)) {
                const wCatTitle = (finalData.categories[wCatId]?.title || "").toLowerCase();
                if (aiCatName.toLowerCase().includes(wCatTitle) || wCatTitle.includes(aiCatName.toLowerCase())) {
                    targetCatId = wCatId;
                    break;
                }
            }"""

new_block_2 = """            // Sémantique Match dans BaseMap (Évite de créer "Softs" si "Boissons" existe)
            const normalAICat = normalizeCategory(aiCatName);
            for (const wCatId of Object.keys(finalData.workflow)) {
                const wCatTitle = (finalData.categories[wCatId]?.title || "").toLowerCase();
                const normalWCat = normalizeCategory(wCatTitle);
                
                if (normalAICat === normalWCat || aiCatName.toLowerCase().includes(wCatTitle) || wCatTitle.includes(aiCatName.toLowerCase())) {
                    targetCatId = wCatId;
                    break;
                }
            }"""

if target_block_1 in content and target_block_2 in content:
    content = content.replace(target_block_1, new_block_1)
    content = content.replace(target_block_2, new_block_2)
    with open(file_path, "w") as f:
        f.write(content)
    print("Matching secured successfully!")
else:
    print("Blocks not found.")
