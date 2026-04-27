import re

file_path = "src/app/generer-carte/page.tsx"
with open(file_path, "r") as f:
    content = f.read()

old_compiled_start = "      const compiledSubject ="
old_compiled_end = "if (wizardData.restaurantName) formData.set(\"restaurantName\", wizardData.restaurantName);"

start_idx = content.find(old_compiled_start)
end_idx = content.find(old_compiled_end) + len(old_compiled_end)

if start_idx == -1 or end_idx == -1:
    print("Could not find prompt compiler")
    exit(1)

new_compiled = """      const compiledSubject = `
--- INSTRUCTIONS STRUCTURELLES ET CRÉATIVES ---
Je veux générer la carte complète pour un restaurant.
- Nom : ${wizardData.restaurantName}
- Type/Concept : ${wizardData.typeLabel}
- Langue prioritaire : ${wizardData.language}
- Quantité cible de produits par catégorie : environ ${wizardData.productCountLimit}.
- Catégories obligatoires (exactement dans cet ordre) : ${wizardData.categories.join(", ")}.
- Style Visuel souhaité : ${wizardData.visualTheme} / ${wizardData.visualStyle}.
- Tailles requises sur les produits applicables : ${wizardData.productSizes}.
${wizardData.productSupplements.length > 0 ? `- IMPORTANT : Intègre ces suppléments/options globales : ${wizardData.productSupplements.join(", ")}.` : ""}
${wizardData.productBadges.length > 0 ? `- IMPORTANT : Assure-toi de saupoudrer certains produits de ces émojis spéciaux dans leurs titres : ${wizardData.productBadges.join(", ")}.` : ""}
${wizardData.showAllergens ? `- IMPORTANT : Ajoute explicitement les allergènes typiques (A) à la fin des descriptions.` : ""}
- Affichage global : Orienté pour ${wizardData.outputFormat} en mode ${wizardData.navigationType}.
`;
      formData.set("sujet", compiledSubject.trim());
      formData.set("sourceInspiration", wizardData.theme);
      formData.set("primaryColor", wizardData.primaryColor);
      formData.set("secondaryColor", wizardData.secondaryColor);
      
      if (wizardData.restaurantName) formData.set("restaurantName", wizardData.restaurantName);"""

new_content = content[:start_idx] + new_compiled + content[end_idx:]

with open(file_path, "w") as f:
    f.write(new_content)

print("Prompt compiler patched successfully.")
