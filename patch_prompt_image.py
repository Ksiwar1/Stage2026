file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

target = """  sujetDemande += `\n\n=== RÈGLES IMPORTANTES ET OBLIGATOIRES ===\n`;
  if (restaurantName) {
    sujetDemande += `- Nom du restaurant : "${restaurantName}". Ce nom doit être utilisé dans la carte, apparaître dans les titres, descriptions ou le branding.\n- Le design, le nom des menus et des produits doivent absolument être stylistiquement et culturellement cohérents avec l'identité "${restaurantName}".\n`;
  }
  sujetDemande += `- STRUCTURE STRICTE : workflow, categories, items, modifier, steps, opt. AUCUNE DE CES PARTIES NE DOIT ÊTRE VIDE.\n`;"""

new_content = """  sujetDemande += `\n\n=== RÈGLES IMPORTANTES ET OBLIGATOIRES ===\n`;
  if (restaurantName) {
    sujetDemande += `- Nom du restaurant : "${restaurantName}". Ce nom doit être utilisé prioritairement pour désigner l'établissement.\n`;
  }
  
  if (menuImage && menuImage.size > 0) {
      sujetDemande += `- ⚠️ PRIORITÉ IMAGE OCR ⚠️ : Tu dois extraire FIDÈLEMENT le menu joint en image. N'invente AUCUN produit, AUCUN prix, AUCUNE catégorie qui ne soit pas sur l'image. NE MODIFIE PAS les noms des produits pour essayer d'être créatif avec le nom du restaurant. L'image fournie est la VÉRITÉ ABSOLUE.\n`;
  } else if (restaurantName) {
      sujetDemande += `- Le design, le nom des menus et des produits doivent absolument être stylistiquement et culturellement cohérents avec l'identité "${restaurantName}". Laisse libre cours à ta créativité !\n`;
  }
  
  sujetDemande += `- STRUCTURE STRICTE : workflow, categories, items, modifier, steps, opt. AUCUNE DE CES PARTIES NE DOIT ÊTRE VIDE.\n`;"""

if target in content:
    content = content.replace(target, new_content)
    with open(file_path, "w") as f:
        f.write(content)
    print("Replaced prompt rules successfully")
else:
    print("Target block not found")
