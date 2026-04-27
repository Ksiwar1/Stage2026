const apiKey = "YOUR_GROQ_API_KEY_HERE";

const promptSysteme1 = `Tu es un assistant restaurateur. Tu dois répondre STRICTEMENT en format JSON pur, sans texte MD. Tu vas générer un menu complet.
Format attendu:
{
  "categories": [
    {
      "name": "Catégorie 1",
      "items": [
        { "name": "Produit A", "price": 10.0 }
      ]
    }
  ]
}
Adapte rigoureusement le nombre de catégories, leurs noms, et la description/quantité des produits selon les consignes exactes (langue, badges, etc.) dictées dans le Sujet Demandé par le client. AUCUN texte additionnel.`;

const sujetDemande = `--- INSTRUCTIONS STRUCTURELLES ET CRÉATIVES ---
Je veux générer la carte complète pour un restaurant.
- Nom : FastFood Test
- Type/Concept : Fast-Food / Burger
- Langue prioritaire : Français
- Quantité cible de produits par catégorie : environ 3-5.
- Catégories obligatoires (exactement dans cet ordre) : Burgers, Boissons.
- Style Visuel souhaité : Coloré / Moderne.
- Tailles requises sur les produits applicables : Aucune.
- Affichage global : Orienté pour Écran kiosque en mode Parcours guidé.`;

const promptUtilisateur1 = `Sujet demandé: ${sujetDemande}. Produis le JSON du menu.`;

async function test() {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "llama3-8b-8192",
            messages: [
                { role: "system", content: promptSysteme1 },
                { role: "user", content: promptUtilisateur1 }
            ],
            temperature: 0.7
        })
    });
    const json = await res.json();
    console.log(json.choices[0].message.content);
}

test();
