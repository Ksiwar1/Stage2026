'use server';

import { getPromptSystemForAI } from "../../lib/memory";

export async function genererUneNouvelleCarte(data: FormData) {
  const sujetDemande = data.get("sujet") as string;

  // 1. On récupère la mémoire (Few-Shot Prompt System)
  const promptSysteme = getPromptSystemForAI();

  // 2. Assemblage du super-prompt final
  const promptFinal = `${promptSysteme}\n\nL'utilisateur demande : "Génère-moi une nouvelle carte traitant du sujet suivant : ${sujetDemande}"`;

  // Dans la vraie vie, vous remplaceriez le console.log par un const aiResponse = await fetch("https://api.openai.com/...
  console.log("\n========== PROMPT ENVOYÉ À L'IA ==========\n");
  console.log(promptFinal);
  console.log("\n==========================================\n");

  // Simulation d'un traitement IA... On renvoie une carte fictive.
  return `export const carteGenerée = {
  titre: "${sujetDemande}",
  description: "Description générée automatiquement par l'IA en se calquant EXACTEMENT sur vos fichiers mémoires !",
  type: "Information",
  priorite: 3,
  couleurHex: "#ff8a00",
  actions: []
};`;
}
