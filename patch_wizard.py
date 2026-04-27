import re

file_path = "src/app/generer-carte/page.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Update initial state map
old_state = """    options: [] as string[],
    palette: ""
  });"""
new_state = """    options: [] as string[],
    palette: "",
    compositions: { defaultIngredients: "", cookingOptions: false, customSupplements: [] as {name: string, price: number}[], fastSupplementName: "", fastSupplementPrice: "" },
    formulas: { isSeul: true, isMenu: false, menuPrice: 2.50, isMaxi: false, maxiPrice: 3.50 },
    accompaniments: { list: "Frites, Potatoes", hasSizes: false, sizeS: 0, sizeM: 1.0, sizeL: 1.50 }
  });"""
content = content.replace(old_state, new_state)

# 2. Update compiler block
old_compiler = """77: - Tailles requises sur les produits applicables : ${wizardData.productSizes}.
78: ${wizardData.productSupplements.length > 0 ? `- IMPORTANT : Intègre ces suppléments/options globales : ${wizardData.productSupplements.join(", ")}.` : ""}
79: ${wizardData.productBadges.length > 0 ? `- IMPORTANT : Assure-toi de saupoudrer certains produits de ces émojis spéciaux dans leurs titres : ${wizardData.productBadges.join(", ")}.` : ""}
80: ${wizardData.showAllergens ? `- IMPORTANT : Ajoute explicitement les allergènes typiques (A) à la fin des descriptions.` : ""}"""
# Use regex to replace the old block lines 77-80 simply since numbers might not be there
content = re.sub(
    r"- Tailles requises sur les produits applicables : \$\{wizardData\.productSizes\}\.\n\$\{wizardData\.productSupplements\.length > 0 \? [^\n]*\n\$\{wizardData\.productBadges\.length > 0 \? [^\n]*\n\$\{wizardData\.showAllergens \? [^\n]*",
    """${wizardData.compositions.defaultIngredients ? `- Ingrédients typiques à distribuer intelligemment dans les descriptions : ${wizardData.compositions.defaultIngredients}.` : ""}
${wizardData.productBadges.length > 0 ? `- IMPORTANT : Assure-toi de saupoudrer certains produits majeurs de ces badges dans leurs titres : ${wizardData.productBadges.join(", ")}.` : ""}
${wizardData.showAllergens ? `- IMPORTANT : Ajoute explicitement les allergènes typiques (A) à la fin des descriptions.` : ""}""",
    content
)

# inject systemConfigJSON in formData
formdata_hook = 'formData.set("sourceInspiration", wizardData.theme);'
content = content.replace(formdata_hook, """formData.set("sourceInspiration", wizardData.theme);
      formData.set("systemConfigJSON", JSON.stringify({
          compositions: wizardData.compositions,
          formulas: wizardData.formulas,
          accompaniments: wizardData.accompaniments,
          badges: wizardData.productBadges
      }));""")

# 3. Replace Step Modals! 
# We need to completely rewrite the JSX for steps 2 to 6.
# Let's find the start of Step 2 JSX
step2_idx = content.find('{wizardStep === 2 && (')
step_end_idx = content.find('{wizardStep === 6 && (')
if step2_idx == -1 or step_end_idx == -1:
    print("Could not find step markers")
    import sys
    sys.exit(1)

# we find the end of step 6 block
step6_end = content.find(')}', content.find('{wizardStep === 6 && (')) + 2

# We will just replace everything from {wizardStep === 2 && (  to the start of {wizardStep === 6 && (
# BUT actually, since the code is large, we can just replace the whole render area for steps.
# To be safe, let's write a targeted function to overwrite the `return (` block.

import sys
print("We need to be careful with JSX replacement.")

