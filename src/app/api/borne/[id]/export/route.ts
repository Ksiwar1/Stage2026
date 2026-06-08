import fs from "fs";
import path from "path";
import { cardService } from "../../../../../services/cardService";
import {
  parseETK360Hierarchy,
  extractRestaurantName,
} from "../../../../../lib/softaveraParser";
import { buildCarteMarkdown } from "../../../../../lib/bibliothequeExport";

/**
 * GET /api/borne/[id]/export
 *
 * Régénère depuis la base de données le Markdown complet de la carte affichée
 * sur la borne (catégories → produits → étapes de personnalisation), l'écrit
 * dans `docs/cartes/<id>.md` à la racine du projet, puis le renvoie en
 * téléchargement (`<id>.md`).
 *
 * Non caché par défaut (Route Handler GET) → données toujours fraîches.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // L'id peut arriver avec un suffixe .json (anciens liens).
    const cardId = id.endsWith(".json") ? id.replace(".json", "") : id;

    const card = await cardService.getCardById(cardId);
    if (!card) {
      return Response.json(
        { success: false, error: `Carte introuvable : ${cardId}` },
        { status: 404 }
      );
    }

    const data = card.content;
    const tree = parseETK360Hierarchy(data);
    const restaurantName = extractRestaurantName(data, cardId);
    const markdown = buildCarteMarkdown(restaurantName, tree, new Date());

    // Persiste le fichier dans docs/cartes/ (best-effort : un échec d'écriture
    // ne doit pas empêcher le téléchargement).
    try {
      const cartesDir = path.join(process.cwd(), "docs", "cartes");
      fs.mkdirSync(cartesDir, { recursive: true });
      fs.writeFileSync(path.join(cartesDir, `${cardId}.md`), markdown, "utf-8");
    } catch (writeErr) {
      console.warn(
        `[EXPORT MD] Écriture docs/cartes/${cardId}.md impossible :`,
        writeErr
      );
    }

    return new Response(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${cardId}.md"`,
      },
    });
  } catch (error: any) {
    console.error("[EXPORT MD] Erreur génération :", error);
    return Response.json(
      { success: false, error: error?.message || "Erreur inconnue" },
      { status: 500 }
    );
  }
}
