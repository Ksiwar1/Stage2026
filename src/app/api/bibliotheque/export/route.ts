import fs from "fs";
import path from "path";
import { getCartesVisualSummary } from "../../../../lib/memory";
import { buildBibliothequeMarkdown } from "../../../../lib/bibliothequeExport";

/**
 * GET /api/bibliotheque/export
 *
 * Régénère depuis la base de données la liste des boutiques (nom Company +
 * Nature), l'écrit dans `docs/bibliotheque.md` à la racine du projet, puis la
 * renvoie en téléchargement (`bibliotheque.md`).
 *
 * Non caché par défaut (Route Handler GET) → données toujours fraîches.
 */
export async function GET(_request: Request) {
  try {
    const cartes = await getCartesVisualSummary();
    const markdown = buildBibliothequeMarkdown(cartes, new Date());

    // Persiste le fichier dans docs/ (best-effort : un échec d'écriture ne doit
    // pas empêcher le téléchargement).
    try {
      const docsDir = path.join(process.cwd(), "docs");
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, "bibliotheque.md"), markdown, "utf-8");
    } catch (writeErr) {
      console.warn("[EXPORT MD] Écriture docs/bibliotheque.md impossible :", writeErr);
    }

    return new Response(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="bibliotheque.md"',
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
