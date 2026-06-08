import { VisualCardSummary } from "./memory";
import type {
  ParsedCategory,
  ParsedProduct,
  ParsedStep,
  ParsedModifier,
} from "./softaveraParser";

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

/** Formate un prix TTC en euros, ou « — » si absent. */
function mdPrice(ttc: number | null | undefined): string {
  if (ttc === null || ttc === undefined) return "—";
  return `${ttc.toFixed(2).replace(".", ",")} €`;
}

/** Sérialise une option (modificateur) et, récursivement, ses sous-étapes. */
function appendModifier(
  lines: string[],
  opt: ParsedModifier,
  depth: number
): void {
  const indent = "  ".repeat(depth);
  const parts: string[] = [opt.name || "—"];
  if (opt.priceDelta && opt.priceDelta !== 0) {
    const sign = opt.priceDelta > 0 ? "+" : "";
    parts.push(`(${sign}${opt.priceDelta.toFixed(2).replace(".", ",")} €)`);
  }
  if (opt.isObligatory) parts.push("**[obligatoire]**");
  lines.push(`${indent}- ${parts.join(" ")}`);

  for (const sub of opt.subSteps || []) {
    appendStep(lines, sub, depth + 1);
  }
}

/** Sérialise une étape de personnalisation et ses options. */
function appendStep(lines: string[], step: ParsedStep, depth: number): void {
  const indent = "  ".repeat(depth);
  lines.push(
    `${indent}- **${step.title || "—"}** _(${step.minChoices}–${step.maxChoices}, ${step.semanticType})_`
  );
  for (const opt of step.options || []) {
    appendModifier(lines, opt, depth + 1);
  }
}

/**
 * Construit le Markdown complet d'une carte telle qu'elle s'affiche sur la borne :
 * catégories → produits (prix + description) → étapes de personnalisation (tailles,
 * sauces, modificateurs, sous-étapes). Parcourt l'arbre `ParsedCategory[]` produit
 * par `parseETK360Hierarchy`, donc strictement « tout ce qui sert à afficher ».
 *
 * Fonction pure : la date est injectée par l'appelant (le route handler passe
 * `new Date()`).
 */
export function buildCarteMarkdown(
  restaurantName: string,
  tree: ParsedCategory[],
  generatedAt: Date
): string {
  const lines: string[] = [];

  const totalProducts = tree.reduce(
    (sum, cat) => sum + (cat.products?.length || 0),
    0
  );

  lines.push(`# ${restaurantName}`);
  lines.push("");
  lines.push(
    `> Généré le ${generatedAt.toLocaleString("fr-FR")} — ${tree.length} catégorie(s), ${totalProducts} article(s).`
  );
  lines.push("");

  const categories = [...tree].sort(
    (a, b) => (a.workflowRank || 0) - (b.workflowRank || 0)
  );

  for (const cat of categories) {
    lines.push(`## ${cat.title || "—"}`);
    lines.push("");

    for (const product of cat.products as ParsedProduct[]) {
      lines.push(`### ${product.name || "—"} — ${mdPrice(product.priceTTC)}`);
      if (product.description && product.description.trim() !== "") {
        lines.push("");
        lines.push(product.description.trim());
      }
      if (product.steps && product.steps.length > 0) {
        lines.push("");
        for (const step of product.steps) {
          appendStep(lines, step, 0);
        }
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
