import re

file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

target = """        // 2. Fallback de sécurité
        for (const meta of memoryWorkflowMeta) {
            if (meta.modId && (needle.includes(meta.catTitle) || meta.catTitle.includes(needle))) {
                return meta.modId;
            }
        }
        
        return null; // Pas trouvé"""

new_fallback = """        // 2. Fallback de sécurité
        for (const meta of memoryWorkflowMeta) {
            if (meta.modId && (needle.includes(meta.catTitle) || meta.catTitle.includes(needle))) {
                return meta.modId;
            }
        }
        
        // 3. Fallback d'Urgence absolu : Si "isMenu" a été demandé, on FORCE un modifier de Type Menu ("menu" dans le dico interne)
        if (systemConfig?.formulas?.isMenu && normalNeedle !== "boisson" && normalNeedle !== "dessert") {
            const fallbackMenu = memoryWorkflowMeta.find(m => normalizeCategory(m.catTitle) === "menu" && m.modId);
            if (fallbackMenu) return fallbackMenu.modId;
        }

        return null; // Pas trouvé"""

if target in content:
    content = content.replace(target, new_fallback)
    with open(file_path, "w") as f:
        f.write(content)
    print("Fallback attached.")
else:
    print("Not found.")
