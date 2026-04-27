import re

file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

# Replace hardcoded limits in prompt
old_prompt = 'Génère 3 à 5 catégories avec 3 à 6 produits chacune. AUCUN texte additionnel.`;'
new_prompt = 'Adapte rigoureusement le nombre de catégories, leurs noms, et la description/quantité des produits selon les consignes exactes (langue, badges, etc.) dictées dans le Sujet Demandé par le client. AUCUN texte additionnel.`;'
content = content.replace(old_prompt, new_prompt)

# Add color retrievals
# Under: const menuImage = data.get("menuImage") as File | null;
hook1 = 'const menuImage = data.get("menuImage") as File | null;'
new_hook1 = hook1 + '\n  const primaryColor = data.get("primaryColor") as string | null;\n  const secondaryColor = data.get("secondaryColor") as string | null;'
content = content.replace(hook1, new_hook1)

# Add color injection
hook2 = '} catch(e) {\n            console.error("Erreur récupération thème", e);\n        }\n    }'
new_hook2 = hook2 + '\n\n    if (primaryColor) originalTheme.palette[0] = primaryColor;\n    if (secondaryColor) originalTheme.palette[1] = secondaryColor;\n    if (primaryColor) originalTheme.palette[2] = primaryColor;'
content = content.replace(hook2, new_hook2)

with open(file_path, "w") as f:
    f.write(content)

print("Backend patched successfully.")
