'use server';

import { getPromptSystemForAI } from "../../lib/memory";
import Groq from "groq-sdk";
import fs from "fs";
import path from "path";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function genererUneNouvelleCarte(data: FormData) {
  const sujetDemande = data.get("sujet") as string;
  const sauvegarder = data.get("sauvegarder") === "on";

  // 1. On récupère la mémoire (Few-Shot Prompt System)
  const promptSysteme = getPromptSystemForAI();

  // 2. Assemblage du super-prompt final pour forcer le pur JSON
  const promptFinal = `${promptSysteme}\n\nL'utilisateur demande : "Génère-moi une nouvelle carte traitant du sujet suivant : ${sujetDemande}". Réponds UNIQUEMENT avec le JSON de la carte, strictement sans aucun texte avant ni après, et sans le formater dans un bloc markdown (pas de \`\`\`json). On doit pouvoir le parser directement via JSON.parse.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Tu réponds UNIQUEMENT en JSON valide, sans texte ni markdown autour." },
        { role: "user", content: promptFinal },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 8000,
      response_format: { type: "json_object" },
    });

    let jsonResponse = chatCompletion.choices[0]?.message?.content || "";

    // Nettoyage au cas où
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
    console.error("Erreur Groq Génération:", error);
    return JSON.stringify({ success: false, error: "Erreur Groq IA : " + error.message });
  }
}
