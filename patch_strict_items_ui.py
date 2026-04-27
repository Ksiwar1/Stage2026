import re

file_path = "src/app/generer-carte/page.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Update State
content = content.replace(
    'desserts: { list: "", hasSizes: false, sizeS: 0, sizeM: 0.5, sizeL: 1.0 }\n  });',
    'desserts: { list: "", hasSizes: false, sizeS: 0, sizeM: 0.5, sizeL: 1.0 },\n    forcedItems: {} as Record<string, string>\n  });'
)

# 2. Update config JSON payload
content = content.replace(
"""      formData.set("systemConfigJSON", JSON.stringify({
          compositions: wizardData.compositions,
          formulas: wizardData.formulas,
          accompaniments: wizardData.accompaniments,
          drinks: wizardData.drinks,
          desserts: wizardData.desserts,
          badges: wizardData.productBadges
      }));""",
"""      formData.set("systemConfigJSON", JSON.stringify({
          compositions: wizardData.compositions,
          formulas: wizardData.formulas,
          accompaniments: wizardData.accompaniments,
          drinks: wizardData.drinks,
          desserts: wizardData.desserts,
          badges: wizardData.productBadges,
          forcedItems: wizardData.forcedItems
      }));"""
)

# 3. Update instructions to Gemini
old_instruct = '86: - Affichage global : Orienté pour ${wizardData.outputFormat} en mode ${wizardData.navigationType}.\n87: `;'

# To safely replace the compiledSubject, we use a more reliable anchor
compile_anchor = "- Affichage global : Orienté pour ${wizardData.outputFormat} en mode ${wizardData.navigationType}."
new_compile = compile_anchor + """
${Object.keys(wizardData.forcedItems).length > 0 ? 
  `- RÈGLES ABSOLUES SUR LES PRODUITS :\\n` + 
  Object.entries(wizardData.forcedItems).map(([cat, items]) => {
      if(items.trim() === "") return "";
      return `  -> Pour la catégorie "${cat}", tu DOIS générer UNIQUEMENT ces produits : ${items}. N'invente rien d'autre.`;
  }).join('\\n')
  : ""}
"""
content = content.replace(compile_anchor, new_compile)

# 4. Insert UI input for each category in Step 2
# Current UI:
ui_anchor = """                             <span style={{ fontWeight: 600 }}>{c}</span>
                             <div style={{ display: 'flex', gap: '0.5rem' }}>"""

ui_new = """                             <div style={{ flex: 1, marginRight: '1rem' }}>
                                <span style={{ fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>{c}</span>
                                <input type="text" placeholder="Produits exacts imposés ? (ex: Coca, Sprite...)" value={wizardData.forcedItems[c] || ""} onChange={e => setWizardData({...wizardData, forcedItems: {...wizardData.forcedItems, [c]: e.target.value}})} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} title="Si rempli, l'IA n'inventera pas d'autres produits pour cette catégorie." />
                             </div>
                             <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>"""

content = content.replace(ui_anchor, ui_new)

with open(file_path, "w") as f:
    f.write(content)

