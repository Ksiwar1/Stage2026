import { NextResponse } from 'next/server';
import { generateAIResponse, getAILabel } from "../../../lib/aiClient";
import { cardService } from "../../../services/cardService";

const SYSTEM_PROMPT = "Tu es l'Intelligence Artificielle de Softavera. Ton rôle est d'analyser techniquement et sémantiquement des fichiers de cartes JSON. Rédige un rapport concis en français (2 petits paragraphes maximum + quelques bullet points si besoin) qui synthétise ce que sont ces cartes, leurs caractéristiques communes, leur utilité, et l'état général de la donnée. Ne propose pas de code. Adopte un ton professionnel et direct SaaS B2B.";

export async function POST(req: Request) {
  try {
    const cards = await cardService.getAllCards();

    if (!cards || cards.length === 0) {
      return NextResponse.json(
        { message: "Aucune carte trouvée dans la base de données pour lancer l'analyse." },
        { status: 404 }
      );
    }

    let contenuGlobal = "";
    for (const card of cards as any[]) {
      try {
        const data = JSON.stringify(card.content);
        contenuGlobal += `\n--- ID Carte : ${card.id} ---\n${data}\n`;
      } catch (err) {
        console.warn("Impossible de lire la carte", card.id);
      }
    }

    const prompt = `Voici une extraction brute des cartes actuellement sauvegardées dans notre base de données PostgreSQL :\n\n${contenuGlobal}\n\nAgis en tant qu'Analyste Data chez Softavera et dresse un court bilan de ce contenu.`;

    const responseText = await generateAIResponse(SYSTEM_PROMPT, prompt, 0.5);

    return NextResponse.json({
      success: true,
      report: responseText,
      filesCount: (cards as any[]).length
    });

  } catch (error: any) {
    console.error(`Erreur ${getAILabel()} API Analyze:`, error);
    return NextResponse.json(
      { message: "Une erreur est survenue pendant l'analyse IA.", error: error.message },
      { status: 500 }
    );
  }
}
