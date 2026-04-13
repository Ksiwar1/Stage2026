'use server';

import { getPromptSystemForAI } from "../../lib/memory";
import { generateAIResponse, getAILabel } from "../../lib/aiClient";
import { validateETK360Code } from "../../lib/aiValidator";
import fs from "fs";
import path from "path";

export async function genererUneNouvelleCarte(data: FormData) {
  let sujetDemande = (data.get("sujet") as string) || "Générer une carte à partir de l'image";
  const restaurantName = data.get("restaurantName") as string | null;
  const sauvegarder = data.get("sauvegarder") === "on";
  const aiType = (data.get("ai_type") as string) || undefined;
  const sourceInspiration = (data.get("sourceInspiration") as string) || undefined;
  const menuImage = data.get("menuImage") as File | null;

  // Injection of strict user rules (Branding & Structure)
  sujetDemande += `\n\n=== RÈGLES IMPORTANTES ET OBLIGATOIRES ===\n`;
  if (restaurantName) {
    sujetDemande += `- Nom du restaurant : "${restaurantName}". Ce nom doit être utilisé dans la carte, apparaître dans les titres, descriptions ou le branding.\n- Le design, le nom des menus et des produits doivent absolument être stylistiquement et culturellement cohérents avec l'identité "${restaurantName}".\n`;
  }
  sujetDemande += `- STRUCTURE STRICTE : workflow, categories, items, modifier, steps, opt. AUCUNE DE CES PARTIES NE DOIT ÊTRE VIDE.\n`;

  let base64Image: { mimeType: string; data: string } | undefined = undefined;
  let hasImage = false;

  if (menuImage && menuImage.size > 0) {
    hasImage = true;
    const arrayBuffer = await menuImage.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    base64Image = {
      mimeType: menuImage.type,
      data: buffer.toString('base64')
    };
  }

  // RAG : On choppe automatiquement les catalogues disponibles comme "sources secondaires"
  // Groq "Free Tier" a une limite stricte de 6000 Tokens/minute.
  // Si on utilise Groq, on ne charge AUCUN squelette secondaire pour ne pas saturer. 
  // Pour Gemini et Claude, on peut en charger jusqu'à 2.
  const maxSecondary = (aiType === "groq") ? 0 : 2;

  const availableDocs = await getAvailableLibraryCards();
  const secondaryInspirations = availableDocs
    .filter(doc => doc !== sourceInspiration && doc !== 'generique')
    .slice(0, maxSecondary);

  try {
    let architectureJson = "";
    
    // ----------- PHASE 1 : ARCHITECTURE -----------
    console.log("[PHASE 1] Génération de l'Architecture abstraite...");
    const promptSysteme1 = getPromptSystemForAI(sourceInspiration, secondaryInspirations, hasImage, 1);
    
    const promptUtilisateur1 = hasImage
      ? `Voici l'image d'un menu de restaurant. ${sujetDemande !== "Générer une carte à partir de l'image" ? `Précision supplémentaire: ${sujetDemande}` : "Analyse l'intégralité de l'image."} Extrais la structure (catégories, menus, liaisons).`
      : `Génère l'architecture abstraite pour le sujet suivant : ${sujetDemande}. Réponds UNIQUEMENT avec le JSON (workflow, categories) de la carte, strictement sans aucun texte.`;

    architectureJson = await generateAIResponse(promptSysteme1, promptUtilisateur1, 0.7, aiType, base64Image);
    architectureJson = architectureJson.replace(/```json/gi, "").replace(/```/g, "").trim();

    // ----------- PHASE 2 : ENRICHISSEMENT (Auto-Healing) -----------
    console.log("[PHASE 2] Enrichissement final en cours...");
    const promptSysteme2 = getPromptSystemForAI(sourceInspiration, secondaryInspirations, hasImage, 2);
    
    let jsonResponse = "";
    let isValid = false;
    let retryCount = 0;
    const maxRetries = 2;
    
    let currentPromptUtilisateur2 = `Voici l'Architecture de base générée :\n\`\`\`json\n${architectureJson}\n\`\`\`\nMaintenant, GÉNÈRE LE JSON FINAL COMPLET ET ENRICHI avec les produits finaux.`;

    while (!isValid && retryCount <= maxRetries) {
      console.log(`[GENERATION P2] Tentative ${retryCount + 1}/${maxRetries + 1}...`);
      
      jsonResponse = await generateAIResponse(promptSysteme2, currentPromptUtilisateur2, 0.7, aiType, base64Image);
      jsonResponse = jsonResponse.replace(/```json/gi, "").replace(/```/g, "").trim();

      const errors = validateETK360Code(jsonResponse);

      if (errors.length === 0) {
        isValid = true;
        break;
      }

      console.error(`❌ [VALIDATOR] Le JSON de l'IA contient ${errors.length} erreurs métier.`);
      errors.forEach((e: string) => console.error(`   -> ${e}`));

      retryCount++;
      if (retryCount <= maxRetries) {
        console.log(`🤖 [AUTO-HEALING] Envoi de la demande de correction à l'IA...`);
        currentPromptUtilisateur2 = `ATTENTION ! Ta dernière génération a produit une carte INVALIDE selon nos règles métier.
        
Voici les erreurs détectées par le parseur TypeScript :
${errors.map((e: string) => `- ${e}`).join("\n")}

Corrige la génération de la carte en respectant strictement ces règles pour régler LES ERREURS LISTÉES. 
Conserve tous les bons choix précédents, et renvoie UNIQUEMENT le code JSON complet.
Squelette d'origine à respecter :
\`\`\`json
${architectureJson}
\`\`\`
Sujet : ${sujetDemande}`;
      } else {
        console.log(`⚠️ [ABORT] Trop d'erreurs après ${maxRetries} corrections. On force le renvoi du dernier résultat au Kiosk.`);
        try {
           fs.writeFileSync(path.join(process.cwd(), '.softavera', 'carte', 'debug_failed_errors.json'), JSON.stringify(errors, null, 2));
           fs.writeFileSync(path.join(process.cwd(), '.softavera', 'carte', 'debug_failed_response.json'), jsonResponse);
        } catch (e) {}
      }
    }

    if (sauvegarder && isValid) {
      const timestamp = Date.now();
      const safeName = sujetDemande.slice(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `ia_${safeName}_${timestamp}.json`;
      const filepath = path.join(process.cwd(), '.softavera', 'carte', filename);
      fs.writeFileSync(filepath, jsonResponse, 'utf-8');
      return JSON.stringify({ success: true, json: jsonResponse, savedPath: filename });
    }

    return JSON.stringify({ success: isValid, json: jsonResponse, savedPath: null, error: isValid ? undefined : "L'IA a échoué à valider les critères métiers même après correction." });

  } catch (error: any) {
    console.error(`Erreur ${getAILabel(aiType)} Génération:`, error);
    return JSON.stringify({ success: false, error: `Erreur ${getAILabel(aiType)} : ${error.message}` });
  }
}

export async function getAvailableLibraryCards() {
  try {
    const directoryPath = path.join(process.cwd(), '.softavera', 'carte');
    if (!fs.existsSync(directoryPath)) return [];
    
    const files = fs.readdirSync(directoryPath);
    return files.filter(f => f.endsWith('.json') && !f.startsWith('ia_'));
  } catch(e) {
    console.error("Erreur read library:", e);
    return [];
  }
}
