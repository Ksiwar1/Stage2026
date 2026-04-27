import urllib.request
import json

apiKey = "YOUR_GROQ_API_KEY_HERE"
url = "https://api.groq.com/openai/v1/chat/completions"

promptSysteme1 = """Tu es un assistant restaurateur. Tu dois répondre STRICTEMENT en format JSON pur, sans texte MD. Tu vas générer un menu complet.
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
Adapte rigoureusement le nombre de catégories, leurs noms, et la description/quantité des produits selon les consignes exactes (langue, badges, etc.) dictées dans le Sujet Demandé par le client. AUCUN texte additionnel."""

sujetDemande = """--- INSTRUCTIONS STRUCTURELLES ET CRÉATIVES ---
Je veux générer la carte complète pour un restaurant.
- Nom : FastFood Test
- Type/Concept : Fast-Food / Burger
- Langue prioritaire : Français
- Quantité cible de produits par catégorie : environ 3-5.
- Catégories obligatoires (exactement dans cet ordre) : Burgers, Boissons.
- Style Visuel souhaité : Coloré / Moderne.
- Tailles requises sur les produits applicables : Aucune.
- Affichage global : Orienté pour Écran kiosque en mode Parcours guidé."""

promptUtilisateur1 = f"""Sujet demandé: {sujetDemande}. Produis le JSON du menu."""

data = {
    "model": "llama3-8b-8192",
    "messages": [
        {"role": "system", "content": promptSysteme1},
        {"role": "user", "content": promptUtilisateur1}
    ],
    "temperature": 0.7
}

req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={
    'Authorization': f'Bearer {apiKey}',
    'Content-Type': 'application/json'
}, method='POST')

try:
    with urllib.request.urlopen(req) as response:
        res_body = response.read()
        res_json = json.loads(res_body)
        print(res_json["choices"][0]["message"]["content"])
except urllib.error.URLError as e:
    print(f"Error: {e}")
except Exception as e:
    print(f"Other Error: {e}")
