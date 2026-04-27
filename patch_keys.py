file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

target1 = """                title: catInfo.name || "Catégorie","""
new1 = """                title: catInfo.name || catInfo.nom || catInfo.title || catInfo.titre || "Catégorie","""

target2 = """            const catTitle = catInfo.name || "Catégorie";"""
new2 = """            const catTitle = catInfo.name || catInfo.nom || catInfo.title || catInfo.titre || "Catégorie";"""

target3 = """                    const itemName = itemInfo.name || "Produit INCONNU";"""
new3 = """                    const itemName = itemInfo.name || itemInfo.nom || itemInfo.title || itemInfo.titre || "Produit INCONNU";"""

target4 = """                    const itemPrice = typeof itemInfo.price === 'number' ? itemInfo.price : 10.0;"""
new4 = """                    const itemPrice = typeof itemInfo.price === 'number' ? itemInfo.price : (typeof itemInfo.prix === 'number' ? itemInfo.prix : 10.0);"""

target5 = """                    const itemPrice = itemInfo.price || 10.0;"""
new5 = """                    const itemPrice = itemInfo.price ?? itemInfo.prix ?? 10.0;"""

# Need to accurately replace

# Let's read file and do string replaces
content = content.replace(target1, new1)
content = content.replace(target2, new2)
content = content.replace(target3, new3)
# The price part might be different, let's use regex
import re
content = re.sub(r'const itemName = itemInfo\.name \|\| "Produit INCONNU";', new3, content)
content = re.sub(r'const itemPrice = [^;]+;', 'const itemPrice = itemInfo.price ?? itemInfo.prix ?? 10.0;', content)

with open(file_path, "w") as f:
    f.write(content)
print("Keys patched successfully")
