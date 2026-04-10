'use server';

import { getPromptSystemForAI } from "../../lib/memory";
import { generateAIResponse, getAILabel } from "../../lib/aiClient";
import fs from "fs";
import path from "path";

export async function genererUneNouvelleCarte(data: FormData) {
  const sujetDemande = data.get("sujet") as string;
  const sauvegarder = data.get("sauvegarder") === "on";
  const aiType = (data.get("ai_type") as string) || undefined;

  const promptSysteme = getPromptSystemForAI();
  const promptUtilisateur = `Génère-moi une nouvelle carte traitant du sujet suivant : ${sujetDemande}. Réponds UNIQUEMENT avec le JSON de la carte, strictement sans aucun texte avant ni après, et sans le formater dans un bloc markdown (pas de \`\`\`json). On doit pouvoir le parser directement via JSON.parse.`;

  try {
    let jsonResponse = await generateAIResponse(promptSysteme, promptUtilisateur, 0.7, aiType);

    // Nettoyage agressif du JSON
    jsonResponse = jsonResponse.replace(/```json/gi, "").replace(/```/g, "").trim();

    JSON.parse(jsonResponse); // Vérifier la syntaxe

    if (sauvegarder) {
      const timestamp = Date.now();
      const safeName = sujetDemande.slice(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `ia_${safeName}_${timestamp}.json`;
      const filepath = path.join(process.cwd(), '.softavera', 'carte', filename);
      fs.writeFileSync(filepath, jsonResponse, 'utf-8');
      return JSON.stringify({ success: true, json: jsonResponse, savedPath: filename });
    }

    return JSON.stringify({ success: true, json: jsonResponse, savedPath: null });

  } catch (error: any) {
    console.error(`Erreur ${getAILabel(aiType)} Génération:`, error);
    return JSON.stringify({ success: false, error: `Erreur ${getAILabel(aiType)} : ${error.message}` });
  }
}
