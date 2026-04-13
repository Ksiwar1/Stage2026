'use server';

import { getPromptSystemForAI } from "../../lib/memory";
import { generateAIResponse, getAILabel } from "../../lib/aiClient";
import { validateETK360Code } from "../../lib/aiValidator";
import fs from "fs";
import path from "path";

export async function genererUneNouvelleCarte(data: FormData) {
  let sujetDemande = (data.get("sujet") as string) || "Générer une carte à partir de l'image";
  const sauvegarder = data.get("sauvegarder") === "on";
  const aiType = (data.get("ai_type") as string) || undefined;
  const sourceInspiration = (data.get("sourceInspiration") as string) || undefined;
  const menuImage = data.get("menuImage") as File | null;

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

  const promptSysteme = getPromptSystemForAI(sourceInspiration, secondaryInspirations, hasImage);
  const promptUtilisateur = hasImage
    ? `Voici l'image d'un menu de restaurant. ${sujetDemande !== "Générer une carte à partir de l'image" ? `Précision supplémentaire: ${sujetDemande}` : "Analyse l'intégralité de l'image."} Extrais TOUTES les catégories, produits, et prix visibles."`
    : `Génère-moi une nouvelle carte traitant du sujet suivant : ${sujetDemande}. Réponds UNIQUEMENT avec le JSON de la carte, strictement sans aucun texte avant ni après, et sans le formater dans un bloc markdown (pas de \`\`\`json). On doit pouvoir le parser directement via JSON.parse.`;

  try {
    let jsonResponse = "";
    let dataObj = null;
    let isValid = false;
    let retryCount = 0;
    const maxRetries = 2; // Auto-correction limit
    
    // Le prompt va évoluer si le validator remonte des erreurs
    let currentPromptUtilisateur = promptUtilisateur;

    while (!isValid && retryCount <= maxRetries) {
      console.log(`[GENERATION] Tentative ${retryCount + 1}/${maxRetries + 1}...`);
      
      jsonResponse = await generateAIResponse(promptSysteme, currentPromptUtilisateur, 0.7, aiType, base64Image);
      
      // Nettoyage agressif du JSON
      jsonResponse = jsonResponse.replace(/```json/gi, "").replace(/```/g, "").trim();

      // IMPORTANT : le validator de notre framework localise les erreurs métiers
      const errors = validateETK360Code(jsonResponse);

      if (errors.length === 0) {
        isValid = true;
        break;
      }

      console.error(`❌ [VALIDATOR] Le JSON de l'IA contient ${errors.length} erreurs métier.`);
      errors.forEach((e: string) => console.error(`   -> ${e}`));

      // Si ça échoue et qu'on a encore des retries, on informe l'agent
      retryCount++;
      if (retryCount <= maxRetries) {
        console.log(`🤖 [AUTO-HEALING] Envoi de la demande de correction à l'IA...`);
        // On modifie l'instruction utilisateur pour lui renvoyer SES propres erreurs et son ancien code
        currentPromptUtilisateur = `ATTENTION ! Ta dernière génération a produit une carte de restaurant techniquement INVALIDE ou INCOMPLETE selon nos règles métier.
        
Voici les erreurs détectées par le parseur TypeScript :
${errors.map((e: string) => `- ${e}`).join("\n")}

Ton objectif est de corriger la génération de la carte en respectant strictement ces règles pour régler LES ERREURS LISTÉES. 
Conserve tous les bons choix précédents, et renvoie UNIQUEMENT le code JSON mis à jour, sans blabla.
Sujet initial pour rappel : ${sujetDemande}`;
      } else {
        console.log(`⚠️ [ABORT] Trop d'erreurs après ${maxRetries} corrections. On force le renvoi du dernier résultat au Kiosk (potentiellement défectueux).`);
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
