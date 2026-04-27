import { generateAIResponse } from './src/app/actions/generateAIResponse';

async function run() {
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
    console.log("Calling Groq...");
    const res = await generateAIResponse(promptSysteme1, promptUtilisateur1, 0.7, { id: 'llama3-8b-8192', source: 'groq' });
    console.log("RESPONSE:\n", res);
}
run();
