file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

target1 = "    return files.filter(f => f.endsWith('.json') && !f.startsWith('ia_'));"
new1 = "    return files.filter(f => f.endsWith('.json') && f !== 'last_architecture.json' && f !== 'system_config.json');"
content = content.replace(target1, new1)

# Now, we patch the rag code block entirely!
import re

# We will inject the code where availableDocs is processed.
# Let's see the context
#   const availableDocs = await getAvailableLibraryCards();
#   if (!activeSourceInspiration || activeSourceInspiration === 'generique') {
#      console.log("[RAG] Auto-séléction
#      ...ragSys = ...
# Let's do a block replacement
target2_search = r'  const availableDocs = await getAvailableLibraryCards\(\);(.*?)    \} catch \(e\) \{.*?    \}'
# We'll just replace the whole RAG section.
old_rag = """  const availableDocs = await getAvailableLibraryCards();

  if (!activeSourceInspiration || activeSourceInspiration === 'generique') {
    console.log("[RAG] Auto-sélection intelligente des templates algorithmiques...");
    const ragSys = `Tu es un agent RAG. Fichiers templates existants : ${availableDocs.join(", ")}. La demande métier est : "${sujetDemande}". Réponds UNIQUEMENT en string listant le PRIX ou LE MEILLEUR fichier, suivi d'éventuels autres intéressants (ex: "carte_pizza.json, carte_burger.json"). Aucun blabla. Si la demande est trop exotique, renvoie "generique".`;
    try {
      const ragRes = await generateAIResponse(ragSys, "Analyse le RAG", 0.1, "gemini");
      const selectedFiles = ragRes.replace(/```/g, "").split(',').map(s => s.trim());
      const validFiles = selectedFiles.filter(f => availableDocs.includes(f));

      if (validFiles.length > 0) {
        activeSourceInspiration = validFiles[0];
        activeSecondaryInspirations = validFiles.slice(1, maxSecondary + 1);
      } else {
        activeSourceInspiration = 'generique';
        activeSecondaryInspirations = availableDocs.slice(0, maxSecondary);
      }
    } catch (e) {
      activeSourceInspiration = 'generique';
      activeSecondaryInspirations = availableDocs.slice(0, maxSecondary);
    }
  }"""

new_rag = """  const availableDocs = await getAvailableLibraryCards();
  const fsLib = require('fs');
  const pathLib = require('path');

  // RAG Semantic Profiling
  const docsDescriptions = availableDocs.map(f => {
      try {
          const content = JSON.parse(fsLib.readFileSync(pathLib.join(process.cwd(), '.softavera', 'carte', f), 'utf-8'));
          const catTitles = content.categories ? Object.values(content.categories).map((c:any) => c.title).slice(0, 3).join(", ") : "Inconnu";
          return `${f} (Thème: ${content.title || 'Inconnu'} | Catégories: ${catTitles})`;
      } catch(e) { return f; }
  });

  if (!activeSourceInspiration || activeSourceInspiration === 'generique') {
    console.log("[RAG] Auto-sélection intelligente des templates algorithmiques...");
    const ragSys = `Tu es un agent RAG expert en Data Structuration.
Ton objectif est de choisir la carte existante qui correspond structurellement le mieux à la demande du client.
Fichiers templates disponibles :\n${docsDescriptions.join("\\n")}\n\nLa demande métier (Type de resto) est : "${sujetDemande}". 
Réponds UNIQUEMENT par le texte brut, en listant le MEILLEUR fichier de base pour fusionner la structure, suivi d'éventuels 1 ou 2 autres intéressants, séparés par des virgules (ex: "ia_pizza.json, ia_sandwich.json"). 
Si et seulement si absolument AUCUNE carte de la liste ne permet une bonne base structurelle pour la demande, renvoie "generique".`;
    
    try {
      const ragRes = await generateAIResponse(ragSys, "Analyse le RAG", 0.1, "gemini");
      const selectedFiles = ragRes.replace(/```(json)?/gi, "").replace(/\\n/g, ",").split(',').map(s => s.trim());
      const validFiles = selectedFiles.filter(f => availableDocs.includes(f));

      if (validFiles.length > 0) {
        activeSourceInspiration = validFiles[0];
        activeSecondaryInspirations = validFiles.slice(1, maxSecondary + 1);
        console.log(`[RAG] BASE SÉLECTIONNÉE : ${activeSourceInspiration}`);
      } else {
        activeSourceInspiration = 'generique';
        activeSecondaryInspirations = availableDocs.slice(0, maxSecondary);
        console.log(`[RAG] BASE GÉNÉRIQUE (Aucun match trouvé)`);
      }
    } catch (e) {
      activeSourceInspiration = 'generique';
      activeSecondaryInspirations = availableDocs.slice(0, maxSecondary);
    }
  }"""
if old_rag in content:
    content = content.replace(old_rag, new_rag)
else:
    print("WARNING: OLD RAG BLOCK NOT FOUND")

with open(file_path, "w") as f:
    f.write(content)
print("Updated successfully")
