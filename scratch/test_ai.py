import urllib.request
import json
import os
import re

# Load .env.local
with open('.env.local', 'r') as f:
    env_content = f.read()
    
gemini_key = None
for line in env_content.split('\n'):
    if line.startswith('GEMINI_API_KEY='):
        gemini_key = line.split('=', 1)[1].strip()

if not gemini_key:
    print("No GEMINI_API_KEY found")
    exit(1)

# Prompt logic copied from memory.ts
def get_prompt_system():
    # To be extremely accurate I will just use the text.
    with open('src/lib/memory.ts', 'r') as f:
        text = f.read()

    # Extract GENERIC_MASTER_TEMPLATE_JSON_STR array content
    template_match = re.search(r'export const GENERIC_MASTER_TEMPLATE_JSON_STR = `(.*?)`;', text, re.DOTALL)
    master_template = template_match.group(1) if template_match else "{}"
    
    # Extract prompt
    return f"""Tu es l'architecte JSON expert du système de kiosque ETK360.
Ta mission est d'effectuer la PHASE 2 : FUSION ET ENRICHISSEMENT.
L'utilisateur te fournit en entrée l'Architecture (Le Squelette). 
Ton rôle est d'ASSEMBLER ET FUSIONNER le Modèle Maître avec l'Inspiration RAG pour répondre à la demande. NE CRÉE PAS DE STRUCTURE LIBREMENT. Tu dois utiliser et copier à l'identique ("copier / coller intelligent") les types de steps, modifiers et items existants dans les modèles fournis en ne modifiant que ce qui est strictement nécessaire pour fusionner l'ensemble.
Tu vas créer les dictionnaires ("items", "steps", "modifier") avec la même logique hiérarchique que celle des modèles fournis.
Tu ne dois renvoyer QUE le JSON final (sans balises markdown autour du texte ni blabla).


MA RÉFÉRENCE PRINCIPALE (TON MODÈLE MÂÎTRE) :
Voici la structure parfaite que tu dois copier et adapter au nouveau sujet :
```json
{master_template}
```

Tu vas complèter la carte en générant :
- items
- modifier
- steps

🚨 RÈGLE VITALE DE MAPPING 🚨 : Tu dois OBLIGATOIREMENT créer dans ton dictionnaire "items" les produits avec les IDENTIFIANTS EXACTS (ex: "item_gen_pizza") qui ont été pré-déclarés dans le 'workflow' qui t'a été fourni en entrée. Ne crée jamais de nouvel identifiant. S'il te manque des identifiants dans le workflow, inventes-en de manière logique.

📉 RÈGLE DE DÉCOMPRESSION DE L'INSPIRATION (TRÈS IMPORTANT) 📉 : 
Pour optimiser la lecture, le Modèle Maître fourni utilise des clés aliasées ("t" au lieu de "title", "p" au lieu de "price").
Cependant, TON JSON GÉNÉRÉ DOIT STRICTEMENT ÊTRE DÉCOMPRESSÉ au format canonique suivant :
- Remplace l'alias "t" par la vraie clé "title": "Nom".
- Remplace l'alias "p": 12.5 par la vraie structure complexe ETK360 "price": {{ "dflt": {{ "ttc": 12.5 }} }}. Ne génère JAMAIS un prix plat en sortie.
- Remplace l'alias "m" par la vraie clé "modifier": "mod_xxx".
- Remplace l'alias "min" par "minChoices" et "max" par "maxChoices" dans les steps.

RÈGLES D'OR STRUCTURELLES: 
- INTERDICTION ABSOLUE D'UTILISER LE MOT-CLÉ "opt".
- OBLIGATION GLOBALE DE PREMIER NIVEAU : Les 3 nouveaux dictionnaires ("items", "modifier", "steps") que tu dois générer DOIVENT OBLIGATOIREMENT ÊTRE PLACÉS À LA RACINE GLOBALE DU JSON (au tout premier niveau, exactement à côté de "workflow" et "categories"). NE LES INCLUS JAMAIS À L'INTÉRIEUR DU WORKFLOW !
- COHÉRENCE ABSOLUE DES IDENTIFIANTS (TRÈS IMPORTANT) : Le dictionnaire 'items' que tu vas générer doit IMPÉRATIVEMENT redéclarer TOUS les identifiants qui ont été déclarés dans les tableaux 'content' du 'workflow' de l'Architecture de base. Ne génère pas d'identifiants aléatoires ! Chaque identifiant déclaré dans le workflow DOIT avoir sa définition produit dans 'items'. Pense bien à donner des noms logiques liés à la catégorie (ex: Des VRAIES frites dans la catégorie Frites).
- Tu dois REPRODUIRE exactement la structure du Modèle Maître décompressée, sans en inventer une nouvelle: pointage d'IDs (Cross-Referencing) : un produit "Menu" pointe vers un ID de "modifier", qui pointe vers des IDs de "steps", qui pointent inversement vers des IDs d'"items" existants à la racine.

Contraintes :
- Ne génère JAMAIS de "opt" ou une autre structure personnalisée.
- On change uniquement les noms (produits, catégories) et le contenu (prix), mais JAMAIS la structure générale du référencement croisé.
- PERFORMANCES (TRÈS IMPORTANT) : Génère MAXIMUM 3 à 5 items par catégorie. Ne crée jamais de listes de 20 produits. Reste concis.
- PERFORMANCES : Génère MAXIMUM 2 à 3 options par 'steps' (ex: juste 2 tailles, 2 sauces, etc).
- Chaque catégorie doit pointer vers le dictionnaire items.
- Un maximum d'items doit contenir au moins un modifier pour suivre la logique imposée.
- Chaque modifier doit pointer vers des steps.
- Chaque step doit lister ses options minimalistes (déclarées dans le dictionnaire "items" à la racine).
- REGLE D'IMAGE INTELLIGENTE : Pour tout objet, ajoute la propriété "img": {{ "dflt": {{ "img": "https://image.pollinations.ai/prompt/[NOM_DU_PRODUIT_TRADUIT_EN_ANGLAIS_SANS_ESPACE]" }} }}. Exemple pour "Frites Cheddar" : '.../prompt/cheddar_fries'. Pour "Burger Poulet" : '.../prompt/chicken_burger'. L'image sera hautement réaliste.

Respecte strictement la boucle infinie ETK360 :
workflow → categories → items → modifier → steps → items

Voici le squelette de la carte (généré à l'étape 1) dont tu dois hériter :
"""

dummy_architecture = {
    "workflow": {
      "cat_1": {
        "type": "categories",
        "rank": 1,
        "content": {
          "item_test_sansprix": { "type": "items", "rank": 1 },
          "item_test_modifier": { "type": "items", "rank": 2 },
          "item_test_ambigu": { "type": "items", "rank": 3 }
        }
      }
    },
    "categories": {
      "cat_1": { "title": "Tests Edge Cases", "isVisible": True }
    }
}

user_prompt = f"Sujet demandé: Je veux un restaurant de Test.\n\nVoici le squelette de la carte:\n{json.dumps(dummy_architecture, indent=2)}"
system_prompt = get_prompt_system()

import time

start = time.time()
req_data = json.dumps({
    "systemInstruction": { "parts": [{ "text": system_prompt }] },
    "contents": [{"parts": [{"text": user_prompt}]}]
}).encode('utf-8')

req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}", data=req_data, headers={'Content-Type': 'application/json'}, method='POST')

try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode('utf-8'))
        text = result['candidates'][0]['content']['parts'][0]['text']
        latency = time.time() - start
        
        # Token metrics simulation
        toks = len(system_prompt) + len(user_prompt)
        print(f"Approximated Input String Length: {toks}")
        print(f"Latency: {latency:.2f} s")
        
        text = text.replace('```json', '').replace('```', '').strip()
        parsed = json.loads(text)
        
        passed = True
        for key in ['item_test_sansprix', 'item_test_modifier', 'item_test_ambigu']:
            if key not in parsed.get('items', {}):
                print(f"MISSING ITEM: {key}")
                passed = False
            else:
                it = parsed['items'][key]
                if 'title' not in it:
                    print(f"MISSING title in {key}")
                    passed = False
                if 't' in it:
                    print(f"LEAKED ALIAS 't' in {key}")
                    passed = False
                if 'p' in it:
                    print(f"LEAKED ALIAS 'p' in {key}")
                    passed = False
                if 'm' in it:
                    print(f"LEAKED ALIAS 'm' in {key}")
                    passed = False
                
                # Check price structure
                if 'price' in it:
                    if isinstance(it['price'], dict) and 'dflt' in it['price'] and 'ttc' in it['price']['dflt']:
                        pass # Valid
                    else:
                        print(f"BAD PRICE FORMAT in {key}: {it['price']}")
                        passed = False
                else:
                    print(f"No price generated for {key} (Valid Edge Case)")
                
        print(f"TEST RESULT: {'PASSED' if passed else 'FAILED'}")
        
except Exception as e:
    print(f"HTTP ERROR: {e}")
