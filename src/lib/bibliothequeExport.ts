import { VisualCardSummary } from "./memory";

/** Échappe les caractères qui casseraient une cellule de tableau Markdown. */
function mdCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === "") return "—";
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

/**
 * Construit le contenu Markdown de la bibliothèque : une ligne par carte avec
 * le nom de boutique (Company) et sa Nature, tels que stockés dans le shoplist.
 *
 * @param generatedAt Date d'export injectée par l'appelant (évite tout effet de
 *                    bord ici ; le route handler passe `new Date()`).
 */
export function buildBibliothequeMarkdown(
  cartes: VisualCardSummary[],
  generatedAt: Date
): string {
  const lines: string[] = [];

  lines.push("# Bibliothèque des cartes");
  lines.push("");
  lines.push(
    `> Généré le ${generatedAt.toLocaleString("fr-FR")} — ${cartes.length} carte(s).`
  );
  lines.push("");
  lines.push("| # | Boutique (Company) | Nature | Articles | ID carte |");
  lines.push("|---|---|---|---|---|");

  cartes.forEach((carte, index) => {
    const boutique = carte.companyName || carte.restaurantName || carte.titre;
    lines.push(
      `| ${index + 1} | ${mdCell(boutique)} | ${mdCell(carte.nature)} | ${mdCell(
        carte.itemCount
      )} | ${mdCell(carte.nomFichier)} |`
    );
  });

  lines.push("");
  return lines.join("\n");
}
