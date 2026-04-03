'use server';

import { getPromptSystemForAI } from "../../lib/memory";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function genererUneNouvelleCarte(data: FormData) {
  const sujetDemande = data.get("sujet") as string;
  const sauvegarder = data.get("sauvegarder") === "on";

  // 1. On récupère la mémoire (Few-Shot Prompt System)
  const promptSysteme = getPromptSystemForAI();

  // 2. Assemblage du super-prompt final pour forcer le pur JSON
  const promptFinal = `${promptSysteme}\n\nL'utilisateur demande : "Génère-moi une nouvelle carte traitant du sujet suivant : ${sujetDemande}". Réponds UNIQUEMENT avec le JSON de la carte, strictement sans aucun texte avant ni après, et sans le formater dans un bloc markdown (pas de \`\`\`json). On doit pouvoir le parser directement via JSON.parse.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(promptFinal);
    let jsonResponse = result.response.text() || "";

    // Nettoyage agressif pour assurer le parse JSON et enlever les codes markdown si l'IA est bavarde
    jsonResponse = jsonResponse.replace(/```json/gi, "").replace(/```/g, "").trim();

    // Vérifier la syntaxe
    JSON.parse(jsonResponse);

    // Sauvegarde Physique Optionnelle
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
    console.error("Erreur Gemini Génération:", error);
    return JSON.stringify({ success: false, error: "Erreur Gemini IA : " + error.message });
  }
}