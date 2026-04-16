'use server';

import { getPromptSystemForAI } from "../../lib/memory";
import { generateAIResponse, getAILabel, getAIType } from "../../lib/aiClient";
import { validateETK360Code } from "../../lib/aiValidator";
import { patchETK360Structure } from "../../lib/autoHealer";
import fs from "fs";
import path from "path";

export async function genererArchitectureAction(data: FormData) {
  let sujetDemande = (data.get("sujet") as string) || "Générer une carte à partir de l'image";
  const restaurantName = data.get("restaurantName") as string | null;
  const rawAiType = (data.get("ai_type") as string) || undefined;
  const aiType = getAIType(rawAiType);
  const sourceInspiration = (data.get("sourceInspiration") as string) || undefined;
  const menuImage = data.get("menuImage") as File | null;

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

  let activeSourceInspiration = sourceInspiration;
  let activeSecondaryInspirations: string[] = [];
  const maxSecondary = (aiType === "groq") ? 1 : 2;
  const availableDocs = await getAvailableLibraryCards();

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
  } else {
    activeSecondaryInspirations = availableDocs
      .filter(doc => doc !== activeSourceInspiration && doc !== 'generique')
      .slice(0, maxSecondary);
  }

  try {
    console.log("[PHASE 1] Génération de l'Architecture abstraite...");
    const promptSysteme1 = getPromptSystemForAI(activeSourceInspiration, activeSecondaryInspirations, hasImage, 1);

    const promptUtilisateur1 = hasImage
      ? `Voici l'image d'un menu de restaurant. ${sujetDemande !== "Générer une carte à partir de l'image" ? `Précision supplémentaire: ${sujetDemande}` : "Analyse l'intégralité de l'image."} Extrais la structure (catégories, menus, liaisons). Assure-toi de remplir l'objet 'content' de chaque catégorie avec les identifiants des futurs produits (ex: "item_nomduproduit": { "type": "items", "rank": 1 }). Ne laisse jamais un 'content' vide.`
      : `OBJECTIF : FUSION ARCHITECTURALE. Tu n'es pas chargé de créer une carte imaginaire. Tu dois composer une carte pour le sujet "${sujetDemande}" en FUSIONNANT de manière cohérente les catégories et structures trouvées dans les MODÈLES qui te sont fournis. Prends ce dont tu as besoin dans le 'Modèle Maître' et dans les 'Bases Inspiration' pour créer ton assemblage parfait. OBLIGATION : Ne laisse JAMAIS le bloc 'content' des catégories vide ! Tu dois y pré-déclarer les identifiants uniques des 3 à 5 futurs produits qui appartiendront à cette catégorie (ex: "item_pizza_margarita": { "type": "items", "rank": 1 }). Réponds UNIQUEMENT avec le JSON (workflow, categories) de la carte, strictement sans aucun texte.`;
    let architectureJson = await generateAIResponse(promptSysteme1, promptUtilisateur1, 0.7, aiType, base64Image, 500);
    architectureJson = architectureJson.replace(/```json/gi, "").replace(/```/g, "").trim();

    return {
       success: true,
       architectureJson,
       activeSourceInspiration,
       activeSecondaryInspirations
    };
  } catch (error: any) {
    console.error(`Erreur ${getAILabel(aiType)} Génération P1:`, error);
    return { success: false, error: `Erreur ${getAILabel(aiType)} : ${error.message}` };
  }
}

export async function enrichirCarteAction(
  data: FormData, 
  architectureJson: string, 
  activeSourceInspiration: string, 
  activeSecondaryInspirations: string[]
) {
  let sujetDemande = (data.get("sujet") as string) || "Générer une carte à partir de l'image";
  const restaurantName = data.get("restaurantName") as string | null;
  const sauvegarder = data.get("sauvegarder") === "on";
  const rawAiType = (data.get("ai_type") as string) || undefined;
  const aiType = getAIType(rawAiType);
  const menuImage = data.get("menuImage") as File | null;

  sujetDemande += `\n\n=== RÈGLES IMPORTANTES ET OBLIGATOIRES ===\n`;
  if (restaurantName) {
    sujetDemande += `- Nom du restaurant : "${restaurantName}". Ce nom doit être utilisé dans la carte, apparaître dans les titres, descriptions ou le branding.\n- Le design, le nom des menus et des produits doivent absolument être stylistiquement et culturellement cohérents avec l'identité "${restaurantName}".\n`;
  }
  
  let base64Image: { mimeType: string; data: string } | undefined = undefined;
  let hasImage = false;

  if (menuImage && menuImage.size > 0) {
    hasImage = true;
    const arrayBuffer = await menuImage.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    base64Image = { mimeType: menuImage.type, data: buffer.toString('base64') };
  }

  try {
    console.log("[PHASE 2] Enrichissement final en cours...");
    const promptSysteme2 = getPromptSystemForAI(activeSourceInspiration, activeSecondaryInspirations, hasImage, 2);

    let jsonResponse = "";

    const currentPromptUtilisateur2 = `Voici l'Architecture de base générée :\n\`\`\`json\n${architectureJson}\n\`\`\`\nMaintenant, GÉNÈRE LE JSON FINAL COMPLET ET ENRICHI avec les produits finaux pour le sujet suivant : ${sujetDemande}`;
    console.log(`[GENERATION P2] Exécution...`);
    jsonResponse = await generateAIResponse(promptSysteme2, currentPromptUtilisateur2, 0.7, aiType, base64Image, 900);
    jsonResponse = jsonResponse.replace(/```json/gi, "").replace(/```/g, "").trim();

    // ------- AUTO-HEALING JAVASCRIPT (FALLBACK METIER) -------
    let parsedData: any = null;
    try {
        parsedData = JSON.parse(jsonResponse);
        const parsedArch = JSON.parse(architectureJson);
        
        // Fusion Programmatiquement pour éviter les ommissions par l'IA
        if (!parsedData.workflow) parsedData.workflow = parsedArch.workflow;
        if (!parsedData.categories) parsedData.categories = parsedArch.categories;
        if (!parsedData.theme && parsedArch.theme) parsedData.theme = parsedArch.theme;

        console.log("🤖 [AUTO-HEALING] Application des correctifs Backend...");
        parsedData = patchETK360Structure(parsedData);
        jsonResponse = JSON.stringify(parsedData, null, 2);
    } catch (e) {
        console.error("Échec critique du parsing JSON de l'IA (Syntaxe corrompue).", e);
        return JSON.stringify({ success: false, error: "Le modèle d'IA a généré un JSON corrompu ou illisible." });
    }

    const errors = validateETK360Code(jsonResponse);
    if (errors.length > 0) {
        console.error(`❌ [VALIDATOR] Le JSON patché contient encore ${errors.length} erreurs métier critiques.`);
        errors.forEach((e: string) => console.error(`   -> ${e}`));
        try {
          fs.writeFileSync(path.join(process.cwd(), '.softavera', 'carte', 'debug_failed_errors.json'), JSON.stringify(errors, null, 2));
          fs.writeFileSync(path.join(process.cwd(), '.softavera', 'carte', 'debug_failed_response.json'), jsonResponse);
        } catch (e) { }
        return JSON.stringify({ success: false, json: jsonResponse, savedPath: null, error: "Validation échouée même après le patching Backend." });
    }

    // Le JSON est 100% OK
    if (sauvegarder) {
      const timestamp = Date.now();
      const safeName = sujetDemande.slice(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `ia_${safeName}_${timestamp}.json`;
      const filepath = path.join(process.cwd(), '.softavera', 'carte', filename);
      fs.writeFileSync(filepath, jsonResponse, 'utf-8');
      return JSON.stringify({ success: true, json: jsonResponse, savedPath: filename });
    }

    return JSON.stringify({ success: isValid, json: jsonResponse, savedPath: null, error: isValid ? undefined : "L'IA a échoué à valider les critères métiers même après correction." });

  } catch (error: any) {
    console.error(`Erreur ${getAILabel(aiType)} Génération P2:`, error);
    return JSON.stringify({ success: false, error: `Erreur ${getAILabel(aiType)} : ${error.message}` });
  }
}

export async function getAvailableLibraryCards() {
  try {
    const directoryPath = path.join(process.cwd(), '.softavera', 'carte');
    if (!fs.existsSync(directoryPath)) return [];

    const files = fs.readdirSync(directoryPath);
    return files.filter(f => f.endsWith('.json') && !f.startsWith('ia_'));
  } catch (e) {
    console.error("Erreur read library:", e);
    return [];
  }
}
