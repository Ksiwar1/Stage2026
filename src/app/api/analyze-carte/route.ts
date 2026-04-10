import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { generateAIResponse, getAILabel } from "../../../lib/aiClient";

const SYSTEM_PROMPT = "Tu es l'Intelligence Artificielle de Softavera. Ton rôle est d'analyser techniquement et sémantiquement des fichiers de cartes JSON. Rédige un rapport concis en français (2 petits paragraphes maximum + quelques bullet points si besoin) qui synthétise ce que sont ces cartes, leurs caractéristiques communes, leur utilité, et l'état général de la donnée. Ne propose pas de code. Adopte un ton professionnel et direct SaaS B2B.";

export async function POST(req: Request) {
  try {
    const cartesDir = path.join(process.cwd(), '.softavera', 'carte');

    let files: string[] = [];
    if (fs.existsSync(cartesDir)) {
      files = fs.readdirSync(cartesDir).filter(f => f.endsWith('.json'));
    }

    if (files.length === 0) {
      return NextResponse.json(
        { message: "Aucun fichier JSON trouvé dans le système pour lancer l'analyse." },
        { status: 404 }
      );
    }

    let contenuGlobal = "";
    for (const file of files) {
      try {
        const filePath = path.join(cartesDir, file);
        const data = fs.readFileSync(filePath, 'utf-8');
        contenuGlobal += `\n--- Fichier : ${file} ---\n${data}\n`;
      } catch (err) {
        console.warn("Impossible de lire le fichier", file);
      }
    }

    const prompt = `Voici une extraction brute des cartes actuellement sauvegardées dans notre base de données locale (.softavera/carte/*.json) :\n\n${contenuGlobal}\n\nAgis en tant qu'Analyste Data chez Softavera et dresse un court bilan de ce contenu.`;

    const responseText = await generateAIResponse(SYSTEM_PROMPT, prompt, 0.5);

    return NextResponse.json({
      success: true,
      report: responseText,
      filesCount: files.length
    });

  } catch (error: any) {
    console.error(`Erreur ${getAILabel()} API Analyze:`, error);
    return NextResponse.json(
      { message: "Une erreur est survenue pendant l'analyse IA.", error: error.message },
      { status: 500 }
    );
  }
}
