import { NextResponse } from "next/server";
import { enrichirCarteAction } from "../../actions/genererCarteAction";

// Route de TEST TEMPORAIRE : valide la transformation Phase 2 (mix simple/composé + formule)
// sans toucher à la base de données (source 'generique' = template fichier, sauvegarder off).
export async function GET() {
  const architecture = {
    categories: [
      {
        name: "🍔 Burgers",
        items: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            name: "Cheese Burger",
            price: 8.5,
            description: "Boeuf, cheddar fondant",
            type: "compose",
            steps: [
              {
                title: "Choix de la sauce",
                minChoices: 1,
                maxChoices: 1,
                options: [
                  { id: "123e4567-e89b-12d3-a456-426614174000", name: "Ketchup", priceDelta: 0 },
                  { id: "123e4567-e89b-12d3-a456-426614174001", name: "Mayonnaise", priceDelta: 0 },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "🥤 Boissons",
        items: [
          { id: "550e8400-e29b-41d4-a716-446655440010", name: "Coca-Cola 33cl", price: 2.5, description: "Canette 33cl", type: "simple" },
        ],
      },
      {
        name: "🍰 Desserts",
        items: [
          { id: "550e8400-e29b-41d4-a716-446655440020", name: "Tiramisu Maison", price: 3.5, description: "Recette maison", type: "simple" },
        ],
      },
    ],
  };

  const fd = new FormData();
  fd.set("sujet", "Test mix simple/composé");
  fd.set("restaurantName", "Test Mix Burger");
  fd.set("ai_type", "groq");
  fd.set("sourceInspiration", "generique");
  fd.set("primaryColor", "#4f46e5");
  fd.set("secondaryColor", "#10b981");
  fd.set(
    "systemConfigJSON",
    JSON.stringify({ formulas: { isSeul: true, isMenu: true, menuPrice: 2.5, isMaxi: true, maxiPrice: 3.5 } })
  );
  // sauvegarder volontairement ABSENT => aucune écriture DB

  const resStr = await enrichirCarteAction(fd, JSON.stringify(architecture), "generique", []);
  const res = JSON.parse(resStr);
  if (!res.success) return NextResponse.json({ ok: false, error: res.error });

  const data = JSON.parse(res.json);
  const items: any = data.items || {};
  const steps: any = data.steps || {};
  const modifier: any = data.modifier || {};

  // Construit un résumé lisible par produit principal (rattaché à une catégorie)
  const summary: any[] = [];
  for (const cId of Object.keys(data.categories || {})) {
    const cat = data.categories[cId];
    const catItems = Array.isArray(cat.items) ? cat.items : [];
    for (const itemId of catItems) {
      const it = items[itemId];
      if (!it) continue;
      const modId = it.modifier;
      const stepTitles: string[] = [];
      let formuleDeltas: number[] | null = null;
      if (modId && modifier[modId]?.steps) {
        for (const sId of Object.keys(modifier[modId].steps)) {
          const st = steps[sId];
          if (!st) continue;
          stepTitles.push(st.title);
          if ((st.title || "").includes("formule")) {
            formuleDeltas = Object.values(st.stepItems || {}).map((si: any) => si.priceStep).sort((a, b) => a - b);
          }
        }
      }
      summary.push({
        categorie: cat.title,
        produit: it.title,
        type: modId ? "composé" : "simple",
        modifier: !!modId,
        steps: stepTitles,
        formuleDeltas,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    totals: { items: Object.keys(items).length, steps: Object.keys(steps).length, modifier: Object.keys(modifier).length },
    produits: summary,
  });
}
