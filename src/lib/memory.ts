import fs from 'fs';
import path from 'path';

export interface MemoryFile {
  nomFichier: string;
  contenu: string;
}

export function getCartesMemory(): MemoryFile[] {
  const directoryPath = path.join(process.cwd(), '.softavera', 'carte');
  
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  // Lecture de tous les fichiers JS, TS ou JSON dans le dossier
  const files = fs.readdirSync(directoryPath).filter(file => 
    file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.ts')
  );
  
  return files.map(file => {
    const filePath = path.join(directoryPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      nomFichier: file,
      contenu: content
    };
  });
}

// Désormais, on n'utilise PLUS le few-shot brutal avec slice() car il détruit le JSON.
// On injecte un Master Schema parfait.
export function getPromptSystemForAI(): string {
  return `Tu es l'architecte JSON expert du système de kiosque ETK360.
Ta mission stricte est de générer une carte de restaurant hyper complète, interactive, et multicatégorie au format JSON pur. 
Tu ne dois renvoyer QUE le JSON final (sans balises markdown autour du texte ni blabla).

Voici le MASTER TEMPLATE de la structure ultime ETK360.
Pour créer une carte valide interactif (ex: un vrai Kiosque McDonald's, O'Tacos, etc), tu dois TOUJOURS structurer ton JSON comme cet exemple. L'exemple présente un Menu (avec 3 étapes obligatoires de choix) et une Boisson individuelle avec des Tailles.

{
  "workflow": {
    "cat_menus": {
      "type": "categories",
      "rank": 1,
      "content": {
        "item_menu_burger": { "type": "items", "rank": 1 }
      }
    },
    "cat_boissons": {
      "type": "categories",
      "rank": 2,
      "content": {
        "item_coca": { "type": "items", "rank": 1 }
      }
    }
  },
  "categories": {
    "cat_menus": { "title": "Nos Menus", "isVisible": true, "img": { "dflt": { "img": "https://image.pollinations.ai/prompt/fast%20food%20combo%20meal" } } },
    "cat_boissons": { "title": "Bvgs & Boissons", "isVisible": true, "img": { "dflt": { "img": "https://image.pollinations.ai/prompt/refreshing%20soda%20drink%20glass" } } }
  },
  "items": {
    "item_menu_burger": {
      "title": "Menu Classic Smash Burger",
      "price": { "dflt": { "ttc": 12.50 } },
      "modifier": "mod_menu_burger_steps",
      "img": { "dflt": { "img": "https://image.pollinations.ai/prompt/classic%20smash%20burger%20with%20french%20fries" } }
    },
    "item_coca": {
      "title": "Coca-Cola Original",
      "price": { "dflt": { "ttc": 2.50 } },
      "opt": { "dim_taille_boisson": [ "val_33cl", "val_50cl" ] },
      "img": { "dflt": { "img": "https://image.pollinations.ai/prompt/coca%20cola%20soda%20glass%20with%20ice" } }
    },
    "item_frites": { "title": "Frites Classiques", "price": { "dflt": { "ttc": 0 } }, "img": { "dflt": { "img": "https://image.pollinations.ai/prompt/crispy%20french%20fries" } } },
    "item_potatoes": { "title": "Potatoes Croustillantes", "price": { "dflt": { "ttc": 0.50 } }, "img": { "dflt": { "img": "https://image.pollinations.ai/prompt/crispy%20potato%20wedges" } } },
    "item_sauce_mayo": { "title": "Mayonnaise", "price": { "dflt": { "ttc": 0 } }, "img": { "dflt": { "img": "https://image.pollinations.ai/prompt/mayonnaise%20sauce%20cup" } } },
    "item_sauce_ket": { "title": "Ketchup", "price": { "dflt": { "ttc": 0 } }, "img": { "dflt": { "img": "https://image.pollinations.ai/prompt/ketchup%20sauce%20cup" } } }
  },
  "opt": {
    "dim_taille_boisson": {
      "title": "Taille de votre boisson",
      "values": {
        "val_33cl": { "title": "Normale (33 cl)", "rank": 1 },
        "val_50cl": { "title": "Maxi (50 cl)", "rank": 2, "priceDelta": 0.50 }
      }
    }
  },
  "modifier": {
    "mod_menu_burger_steps": {
      "steps": {
        "step_choix_boisson": { "rank": 1 },
        "step_choix_accompagnement": { "rank": 2 },
        "step_choix_sauce": { "rank": 3 }
      }
    }
  },
  "steps": {
    "step_choix_boisson": {
      "title": "1. Choisissez votre boisson froide",
      "minChoices": 1,
      "maxChoices": 1,
      "items": { "item_coca": {} }
    },
    "step_choix_accompagnement": {
      "title": "2. Votre accompagnement",
      "minChoices": 1,
      "maxChoices": 1,
      "items": { "item_frites": {}, "item_potatoes": {} }
    },
    "step_choix_sauce": {
      "title": "3. Choisir vos sauces (Max 2)",
      "minChoices": 0,
      "maxChoices": 2,
      "items": { "item_sauce_mayo": {}, "item_sauce_ket": {} }
    }
  }
}

RÈGLES VITALES :
1. TON JSON DOIT CONSTRUIRE UN PARCOURS IMMERSIF COMPLET (Au minimum 2 catégories, au moins un produit "Menu" complexe avec son dictionnaire de "modifier" / "steps")! Ne fais pas juste un simple catalogue statique de produits isolés.
2. Chaque étape (steps) doit pointer vers de multiples "items" valides s'il y a un choix à faire (Exemple: choix du parfum, de la viande, du type).
3. TOUS les IDs (ex: \`item_XXX\`, \`cat_XXX\`) utilisés doivent obligatoirement exister à la racine (items, categories).
4. S'il s'agit d'une option globale qui ne nécessite pas d'étapes multiples, utilise un objet "opt" lié au produit.
5. INTELLIGENCE VISUELLE : Pour chaque objet généré dans "categories" et "items" tu DOIS obligatoirement ajouter la propriété \`img\` avec une URL d'image générée dynamiquement. Suis STRICTEMENT cette convention : \`"img": { "dflt": { "img": "https://image.pollinations.ai/prompt/{prompt_anglais}" } }\` et remplace \`{prompt_anglais}\` par une description ANGLAISE du produit très ciblée et réaliste (ex: delicious%20pizza, tasty%20burger, fresh%20soda). Encode obligatoirement les espaces avec %20. Laisse Pollinations renvoyer une image standard optimisée. Ne met SURTOUT PAS de paramètres comme width ou height à la fin. Ne laisse AUCUNE image vide.

Génère la machinerie complète ETK360 la plus pertinente pour la demande suivante :`;
}

export interface VisualCardSummary {
  nomFichier: string;
  type: 'ETK360_CATALOG' | 'SOFTAVERA_CARD' | 'UNKNOWN' | 'ERROR';
  itemCount: number;
  previewImages: string[];
  titre?: string;
  statut?: string;
  logoUrl?: string;
  restaurantName?: string;
}

export function getCartesVisualSummary(): VisualCardSummary[] {
  const directoryPath = path.join(process.cwd(), '.softavera', 'carte');
  if (!fs.existsSync(directoryPath)) return [];

  const files = fs.readdirSync(directoryPath).filter(file => file.endsWith('.json'));
  const summaries: VisualCardSummary[] = [];

  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Détecter ETK360 (gros JSON avec "items")
      if (data && typeof data === 'object' && data.items && typeof data.items === 'object') {
        const itemIds = Object.keys(data.items);
        const images: string[] = [];
        
        // Extraction max 4 images
        for (let i = 0; i < Math.min(20, itemIds.length); i++) {
          if (images.length >= 4) break;
          const item = data.items[itemIds[i]];
          if (item?.img?.dflt?.img) {
             images.push(item.img.dflt.img);
          }
        }

        let logoUrl = null;
        let restaurantName = null;
        if (data.shoplist && typeof data.shoplist === 'object') {
           const firstShop = Object.values(data.shoplist)[0] as any;
           if (firstShop) {
              restaurantName = firstShop.Company || data.title;
              if (firstShop.img && firstShop.img !== 'no-pictures.svg' && firstShop.img !== 'undefined') {
                 logoUrl = firstShop.img.startsWith('http') ? firstShop.img : `https://beta-catalogue.etk360.com/${firstShop.img}`;
              }
           }
        }

        summaries.push({
          nomFichier: file,
          type: 'ETK360_CATALOG',
          itemCount: itemIds.length,
          previewImages: images,
          logoUrl: logoUrl || undefined,
          restaurantName: restaurantName || data.title
        });
      } 
      // Détecter Softavera standard
      else if (data && data.titre && data.statut) {
        summaries.push({
          nomFichier: file,
          type: 'SOFTAVERA_CARD',
          itemCount: 0,
          previewImages: [],
          titre: data.titre,
          statut: data.statut
        });
      } 
      else {
        summaries.push({
          nomFichier: file,
          type: 'UNKNOWN',
          itemCount: 0,
          previewImages: []
        });
      }

    } catch (e) {
      summaries.push({
        nomFichier: file,
        type: 'ERROR',
        itemCount: 0,
        previewImages: []
      });
    }
  }

  return summaries;
}
