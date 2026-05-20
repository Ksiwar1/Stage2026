import fs from 'fs';
import path from 'path';

export interface MemoryFile {
  nomFichier: string;
  contenu: string;
}

export async function getCartesMemory(): Promise<MemoryFile[]> {
  const cards = await cardService.getAllCards();
  
  return (cards as any[]).map(card => {
    return {
      nomFichier: card.id,
      contenu: JSON.stringify(card.content)
    };
  });
}

export const GENERIC_MASTER_TEMPLATE_JSON_STR = `{
  "theme": {
    "palette": ["#4F46E5", "#10B981", "#F59E0B", "#F3F4F6", "#111827"]
  },
  "workflow": {
    "cat_menus": {
      "type": "categories",
      "rank": 1,
      "content": {
        "item_menu_burger": { "type": "items", "rank": 1, "modifier": "mod_menu_burger_steps" }
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
    "cat_menus": { "title": "Nos Menus", "isVisible": true },
    "cat_boissons": { "title": "Boissons", "isVisible": true }
  },
  "items": {
    "item_menu_burger": { "t": "Menu Classic", "m": "mod_menu_burger_steps" },
    "item_coca": { "t": "Coca Cola", "p": 2.50, "m": "mod_boisson_taille" },
    "item_coca_33cl": { "t": "Normale 33cl", "p": 0 },
    "item_coca_50cl": { "t": "Maxi 50cl", "p": 0.50 },
    "item_frites": { "t": "Frites Classiques" },
    "item_potatoes": { "t": "Potatoes Croustillantes" },
    "item_sauce_mayo": { "t": "Mayonnaise" },
    "item_sauce_ket": { "t": "Ketchup" }
  },
  "modifier": {
    "mod_menu_burger_steps": {
      "steps": {
        "step_choix_boisson": { "rank": 1 },
        "step_choix_accompagnement": { "rank": 2 },
        "step_choix_sauce": { "rank": 3 }
      }
    },
    "mod_boisson_taille": {
      "steps": {
        "step_taille_boisson": { "rank": 1 }
      }
    }
  },
  "steps": {
    "step_choix_boisson": {
      "t": "Choisissez votre boisson", "min": 1, "max": 1,
      "stepItems": { "item_coca": { "rank": 1 } }
    },
    "step_choix_accompagnement": {
      "t": "Votre accompagnement", "min": 1, "max": 1,
      "stepItems": { "item_frites": { "rank": 1 }, "item_potatoes": { "rank": 2 } }
    },
    "step_choix_sauce": {
      "t": "Choisir vos sauces", "min": 0, "max": 2,
      "stepItems": { "item_sauce_mayo": { "rank": 1 }, "item_sauce_ket": { "rank": 2 } }
    },
    "step_taille_boisson": {
      "t": "Taille de votre boisson", "min": 1, "max": 1,
      "stepItems": { "item_coca_33cl": { "rank": 1 }, "item_coca_50cl": { "rank": 2 } }
    }
  }
}`;

// Désormais, on n'utilise PLUS le few-shot brutal avec slice() car il détruit le JSON.
// On injecte un Master Schema parfait.
export async function getPromptSystemForAI(sourceCatalogId?: string, secondaryInspirations: string[] = [], hasImage = false, phase: 1 | 2 = 1): Promise<string> {
  const ocrAddon = hasImage ? `\n\n📌 MODE VISION / OCR ACTIF : L'utilisateur a fourni la photo d'un menu complet. Ton rôle prioritaire est d'agir comme un OCR intelligent:\n - Lis précisément toutes les catégories, les noms de produits, et SURTOUT LES PRIX figurant sur l'image.\n - RAPPEL STRICT: Modélise UNIQUEMENT ce que tu vois sur l'image ou en inférant logiquement le menu à partir de celle-ci, tout en respectant scrupuleusement la structure de mon exemple ETK360.\n - Ne génère pas de produits hors-sujet qui ne sont pas sur l'image.` : "";

  // Construction du RAG avec les modèles secondaires !
  let secondaryContext = "";
  if (secondaryInspirations.length > 0) {
     const extractionsRaw = await Promise.all(secondaryInspirations.map(id => extractLightStructureFromCatalogue(id)));
     const extractions = extractionsRaw.filter(t => t);
     if (extractions.length > 0) {
        secondaryContext = `\n\nPOUR TON INSPIRATION STRUCTURELLE (RAG), voici ${extractions.length} autre(s) méthode(s) validée(s) dans notre librairie. Inspires-en toi pour les patterns complexes :\n`;
        extractions.forEach((ext, i) => {
           secondaryContext += `--- BASE INSPIRATION ${i + 1} :\n\`\`\`json\n${ext}\n\`\`\`\n`;
        });
     }
  }

  let baseTemplate = "";
  if (sourceCatalogId && sourceCatalogId !== 'generique') {
    if (phase === 1) {
       const extractedTemplate = await extractLightStructureFromCatalogue(sourceCatalogId);
       if (extractedTemplate) baseTemplate = extractedTemplate;
    } else {
       const extractedTemplate = await extractTemplateFromCatalogue(sourceCatalogId);
       if (extractedTemplate) baseTemplate = extractedTemplate;
    }
  } else {
    // Le Generique master template
    baseTemplate = GENERIC_MASTER_TEMPLATE_JSON_STR;
  }

  if (phase === 1) {
    return `Tu es l'architecte JSON expert du système de kiosque ETK360.
Ta mission est d'effectuer la PHASE 1 de génération : CONSTRUIRE LE WORKFLOW ABSTRAIT.
Tu ne dois renvoyer QUE le JSON final (sans balises markdown autour du texte ni blabla).
${ocrAddon}

🚨 RÈGLE STYLISTIQUE OBLIGATOIRE 🚨 : Tu DOIS obligatoirement commencer le titre de CHAQUE catégorie par un Emoji représentatif correspondant au thème (ex: "🍕 Pizzas", "🥤 Boissons fraîches", "🥗 Salades", "🍰 Desserts"). Ceci est vital pour le design de l'application UI.

MA RÉFÉRENCE PRINCIPALE (TON MODÈLE MÂÎTRE) :
Tu dois t'en inspirer PROFONDÉMENT. 
\`\`\`json
${baseTemplate}
\`\`\`
${secondaryContext}
Génère la structure d'une carte de restaurant pour le sujet suivant :

Contraintes :
- Générer uniquement : "theme", "workflow", "categories".
- Ne génère aucun item, modifier ou option. Laisse les 'content' vides.
- Le workflow doit représenter un parcours utilisateur réel (borne de commande).
- Respecter le format exact des dictionnaires de l'architecture ETK360 (Modèle Maître ci-dessus).
- Si une "PALETTE GRAPHIQUE" est précisée, l'injecter dans "theme" (format: { "palette": [...] }).

Sujet demandé :`;
  }

  // PHASE 2 (Enrichissement)
  return `Tu es l'architecte JSON expert du système de kiosque ETK360.
Ta mission est d'effectuer la PHASE 2 : FUSION ET ENRICHISSEMENT.
L'utilisateur te fournit en entrée l'Architecture (Le Squelette). 
Ton rôle est d'ASSEMBLER ET FUSIONNER le Modèle Maître avec l'Inspiration RAG pour répondre à la demande. NE CRÉE PAS DE STRUCTURE LIBREMENT. Tu dois utiliser et copier à l'identique ("copier / coller intelligent") les types de steps, modifiers et items existants dans les modèles fournis en ne modifiant que ce qui est strictement nécessaire pour fusionner l'ensemble.
Tu vas créer les dictionnaires ("items", "steps", "modifier") avec la même logique hiérarchique que celle des modèles fournis.
Tu ne dois renvoyer QUE le JSON final (sans balises markdown autour du texte ni blabla).
${ocrAddon}

MA RÉFÉRENCE PRINCIPALE (TON MODÈLE MÂÎTRE) :
Voici la structure parfaite que tu dois copier et adapter au nouveau sujet :
${baseTemplate ? `\`\`\`json\n${baseTemplate}\n\`\`\`` : "Aucun modèle maître."}

Tu vas complèter la carte en générant :
- items
- modifier
- steps

🚨 RÈGLE VITALE DE MAPPING 🚨 : Tu dois OBLIGATOIREMENT créer dans ton dictionnaire "items" les produits avec les IDENTIFIANTS EXACTS (ex: "item_gen_pizza") qui ont été pré-déclarés dans le 'workflow' qui t'a été fourni en entrée. Ne crée jamais de nouvel identifiant. S'il te manque des identifiants dans le workflow, inventes-en de manière logique.

📉 RÈGLE DE DÉCOMPRESSION DE L'INSPIRATION (TRÈS IMPORTANT) 📉 : 
Pour optimiser la lecture, le Modèle Maître fourni utilise des clés aliasées ("t" au lieu de "title", "p" au lieu de "price").
Cependant, TON JSON GÉNÉRÉ DOIT STRICTEMENT ÊTRE DÉCOMPRESSÉ au format canonique suivant :
- Remplace l'alias "t" par la vraie clé "title": "Nom".
- Remplace l'alias "p": 12.5 par la vraie structure complexe ETK360 "price": { "dflt": { "ttc": 12.5 } }. Ne génère JAMAIS un prix plat en sortie.
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
- REGLE D'IMAGE INTELLIGENTE : Pour tout objet, ajoute la propriété "img": { "dflt": { "img": "https://image.pollinations.ai/prompt/[NOM_DU_PRODUIT_TRADUIT_EN_ANGLAIS_SANS_ESPACE]" } }. Exemple pour "Frites Cheddar" : '.../prompt/cheddar_fries'. Pour "Burger Poulet" : '.../prompt/chicken_burger'. L'image sera hautement réaliste.

Respecte strictement la boucle infinie ETK360 :
workflow → categories → items → modifier → steps → items

Voici le squelette de la carte (généré à l'étape 1) dont tu dois hériter :
`;
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

import { cardService } from '../services/cardService';

export async function getCartesVisualSummary(): Promise<VisualCardSummary[]> {
  const cards = await cardService.getAllCards();
  const summaries: VisualCardSummary[] = [];

  for (const card of cards as any[]) {
    try {
      const data = card.content;

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
        let restaurantName = card.store_name || null;
        if (data.shoplist && typeof data.shoplist === 'object') {
           const firstShop = Object.values(data.shoplist)[0] as any;
           if (firstShop) {
              if (!restaurantName) restaurantName = firstShop.Company || data.title;
              if (firstShop.img && firstShop.img !== 'no-pictures.svg' && firstShop.img !== 'undefined') {
                 logoUrl = firstShop.img.startsWith('http') ? firstShop.img : `https://beta-catalogue.etk360.com/${firstShop.img}`;
              }
           }
        }
        
        // Extraction du nom de franchise pour les anciennes cartes ETK360
        if (!restaurantName && images.length > 0) {
           const firstImage = images.find(img => img.includes('franchise_'));
           if (firstImage) {
               const match = firstImage.match(/franchise_\\d+_([a-zA-Z0-9_]+)/);
               if (match && match[1]) {
                   restaurantName = match[1].replace(/_/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
               }
           }
        }

        summaries.push({
          nomFichier: card.id,
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
          nomFichier: card.id,
          type: 'SOFTAVERA_CARD',
          itemCount: 0,
          previewImages: [],
          titre: card.store_name || data.titre,
          statut: data.statut
        });
      } 
      else {
        summaries.push({
          nomFichier: card.id,
          type: 'UNKNOWN',
          itemCount: 0,
          previewImages: []
        });
      }

    } catch (e) {
      summaries.push({
        nomFichier: card.id,
        type: 'ERROR',
        itemCount: 0,
        previewImages: []
      });
    }
  }

  return summaries;
}

export async function extractLightStructureFromCatalogue(cardId: string): Promise<string | null> {
  try {
    const card = await cardService.getCardById(cardId);
    if (!card) return null;
    const data = card.content;
    if (!data.workflow || !data.categories) return null;

    // Purge the deeply nested "content" loops inside workflow to keep only structural buckets
    const cleanWorkflow: any = {};
    for (const key of Object.keys(data.workflow)) {
       const node = data.workflow[key];
       if (node.type === 'categories') {
          cleanWorkflow[key] = { type: 'categories', rank: node.rank };
          if (node.content) cleanWorkflow[key].content = {};
       } else {
          // If wrapper exist (like work_base -> category)
          const subKeys = Object.keys(node);
          if (subKeys.length > 0 && node[subKeys[0]]?.type === 'categories') {
             cleanWorkflow[key] = {};
             for (const sK of subKeys) {
                cleanWorkflow[key][sK] = { type: 'categories', rank: node[sK].rank };
                if (node[sK].content) cleanWorkflow[key][sK].content = {};
             }
          }
       }
    }

    const skeleton: any = {
       workflow: cleanWorkflow,
       categories: Object.keys(data.categories).slice(0, 15).reduce((acc: any, k) => {
          acc[k] = { title: data.categories[k].title };
          return acc;
       }, {})
    };

    if (data.steps) {
       skeleton.steps = Object.keys(data.steps).slice(0, 15).reduce((acc: any, k) => {
          acc[k] = { 
            title: data.steps[k].title, 
            minChoices: data.steps[k].minChoices, 
            maxChoices: data.steps[k].maxChoices 
          };
          return acc;
       }, {});
    }

    return JSON.stringify(skeleton, null, 0);
  } catch (err) {
    return null;
  }
}

export async function extractTemplateFromCatalogue(cardId: string): Promise<string | null> {
  try {
    const card = await cardService.getCardById(cardId);
    if (!card) return null;
    const data = card.content;
    if (!data.workflow || !data.items) return null;

    // 1. Identify correct Category node in workflow
    const workflowKeys = Object.keys(data.workflow);
    if (workflowKeys.length === 0) return null;
    
    let firstCatId = null;
    let firstCatNode = null;
    let isWrapperLevel = false;
    
    for (const wKey of workflowKeys) {
       const node = data.workflow[wKey];
       if (node && (node.type === 'categories' || node.content)) {
          firstCatId = wKey;
          firstCatNode = node;
          break;
       }
    }
    
    // Fallback if there's a wrapper level (e.g. work_base -> category)
    if (!firstCatId) {
       for (const wKey of workflowKeys) {
          const wrapper = data.workflow[wKey];
          const innerKeys = Object.keys(wrapper || {});
          if (innerKeys.length > 0) {
             firstCatId = innerKeys[0];
             firstCatNode = wrapper[innerKeys[0]];
             isWrapperLevel = true;
             break;
          }
       }
    }
    if (!firstCatId || !firstCatNode) return null;

    const catSkeleton = data.categories?.[firstCatId] ? { ...data.categories[firstCatId] } : { title: "Categorie", img: { dflt: { img: "URL..." } } };
    if (catSkeleton.visibilityInfo) catSkeleton.visibilityInfo.isVisible = true;
    catSkeleton.archive = false;
    catSkeleton.isVisible = true;
    catSkeleton.title = "NOM_CATEGORIE_A_REMPLACER";

    // 2. Build skeleton structure
    const skeleton: any = {
      workflow: isWrapperLevel ? { "work_base": { [firstCatId]: firstCatNode } } : { [firstCatId]: firstCatNode },
      categories: {
        [firstCatId]: catSkeleton
      },
      items: {},
      modifier: {},
      steps: {},
      opt: {}
    };

    // 4. Sample 1 Menu (with modifier) and 1 simple Item
    let simpleItemId: string | null = null;
    let complexItemId: string | null = null;

    const catInfo = data.categories?.[firstCatId];
    let itemPool: string[] = [];
    if (catInfo && Array.isArray(catInfo.item)) {
       itemPool = catInfo.item;
    } else if (catInfo && typeof catInfo.item === 'object') {
       itemPool = Object.keys(catInfo.item);
    } else {
       itemPool = Object.keys(data.items).slice(0, 50); // Fallback
    }

    // Attempt to pick specific types
    for (const itemId of itemPool) {
       const it = data.items[itemId];
       if (!it) continue;
       if (it.modifier && !complexItemId) {
          complexItemId = itemId;
       } else if (!it.modifier && !simpleItemId) {
          simpleItemId = itemId;
       }
       if (simpleItemId && complexItemId) break;
    }

    if (!complexItemId && !simpleItemId && itemPool.length > 0) {
       simpleItemId = itemPool[0];
    }
    
    // 5. Recursive Traversal Algorithm
    const extractPriceTTC = (priceData: any) => {
        if (!priceData) return null;
        if (typeof priceData.dflt === 'object' && priceData.dflt !== null && typeof priceData.dflt.ttc === 'number') return priceData.dflt.ttc;
        if (typeof priceData.ttc === 'number') return priceData.ttc;
        if (typeof priceData.dflt === 'number') return priceData.dflt;
        return null;
    };

    const traverseItem = (itemId: string, depth: number = 0) => {
      if (skeleton.items[itemId]) return;
      if (!data.items[itemId]) return;
      const it = data.items[itemId];
      const p = extractPriceTTC(it.price);
      
      const compressedIt: any = {
          t: "NOM_PRODUIT_A_REMPLACER"
      };
      if (p !== null) compressedIt.p = p;
      if (it.modifier && depth < 1) {
          compressedIt.m = it.modifier;
          traverseModifier(it.modifier, depth);
      }
      skeleton.items[itemId] = compressedIt;
    };

    const traverseModifier = (modId: string, depth: number) => {
      if (skeleton.modifier[modId]) return;
      if (!data.modifier?.[modId]) return;
      
      const modData = data.modifier[modId];
      const compressedMod: any = {};
      
      if (modData.steps) {
         const selection = Object.keys(modData.steps).slice(0, 2); // Capped at 2 steps
         compressedMod.steps = {};
         selection.forEach(k => {
             compressedMod.steps[k] = { rank: modData.steps[k].rank || 1 };
             traverseStep(k, depth);
         });
      }
      skeleton.modifier[modId] = compressedMod;
    };

    const traverseStep = (stepId: string, depth: number) => {
      if (skeleton.steps[stepId]) return;
      if (!data.steps?.[stepId]) return;
      
      const stepData = data.steps[stepId];
      const compressedStep: any = {
          t: stepData.title || stepData.displayName?.dflt?.nameDef || "Choix",
          min: stepData.minChoices ?? 0,
          max: stepData.maxChoices ?? 1
      };
      
      const itemsSource = stepData.items || stepData.stepItems || {};
      const selection = Object.keys(itemsSource).slice(0, 2);
      if (selection.length > 0) {
          compressedStep.stepItems = {};
          selection.forEach(id => {
              compressedStep.stepItems[id] = { rank: itemsSource[id].rank || 1 };
              traverseItem(id, depth + 1);
          });
      }
      skeleton.steps[stepId] = compressedStep;
    };
    // Begin injection
    if (complexItemId) traverseItem(complexItemId);
    if (simpleItemId) traverseItem(simpleItemId);

    // Filter workflow/category content representation
    if (skeleton.categories[firstCatId]) {
       skeleton.categories[firstCatId].item = Object.keys(skeleton.items).filter(id => id === complexItemId || id === simpleItemId);
    }
    const targetContentContainer = isWrapperLevel ? skeleton.workflow["work_base"][firstCatId] : skeleton.workflow[firstCatId];
    if (targetContentContainer && targetContentContainer.content) {
       targetContentContainer.content = {};
       if (complexItemId) {
          targetContentContainer.content[complexItemId] = { type: 'items', rank: 1 };
          if (data.items[complexItemId].modifier) targetContentContainer.content[complexItemId].modifier = data.items[complexItemId].modifier;
       }
       if (simpleItemId) {
          targetContentContainer.content[simpleItemId] = { type: 'items', rank: 2 };
          if (data.items[simpleItemId].modifier) targetContentContainer.content[simpleItemId].modifier = data.items[simpleItemId].modifier;
       }
    }

    // Cleanup empty containers
    Object.keys(skeleton).forEach(k => {
       if (Object.keys(skeleton[k]).length === 0) {
          delete skeleton[k];
       }
    });

    return JSON.stringify(skeleton);
  } catch (e) {
    console.error("ETK Template Extraction Error :", e);
    return null;
  }
}

export function isValidETK360Catalogue(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  if (!data.workflow || typeof data.workflow !== 'object') return false;
  if (!data.categories || typeof data.categories !== 'object') return false;
  if (!data.items || typeof data.items !== 'object' || Object.keys(data.items).length === 0) return false;
  return true;
}

export async function extractTrueDataFromCatalogue(cardId: string): Promise<string | null> {
  try {
    const card = await cardService.getCardById(cardId);
    if (!card) return null;
    const data = card.content;
    
    if (!isValidETK360Catalogue(data)) {
        throw new Error("ERR_INVALID_CATALOGUE");
    }
    
    let catStr = "";
    let itemMapStr = "";
    if (data.categories) {
       let globalItemCount = 0;
       for (const [catId, catObj] of Object.entries<any>(data.categories)) {
           if (catObj.archive === true || catObj.visibilityInfo?.isVisible === false || catObj.isVisible === false) continue;
           catStr += `[${catId}]:${catObj.title || catObj.name || catId}\n`;
           
           let localItemStr = "";
           let localItemCount = 0;
           let catItems = catObj.items || {};
           
           const processItemIds = (itemsList: Array<string> | string[]) => {
               for (const itId of itemsList) {
                   if (!data.items || !data.items[itId]) continue;
                   const iObj = data.items[itId];
                   if (iObj.archive === true || iObj.visibilityInfo?.isVisible === false || iObj.isVisible === false) continue;
                   if (localItemCount > 8 || globalItemCount > 50) break;
                   let name = iObj.displayName?.dflt?.nameDef || iObj.title || iObj.name || itId;
                   localItemStr += `  - [${itId}]:${name}\n`;
                   localItemCount++;
                   globalItemCount++;
               }
           };

           if (Array.isArray(catItems)) {
               processItemIds(catItems);
           } else {
               processItemIds(Object.keys(catItems));
           }

           if (localItemStr) {
               itemMapStr += `\n### Famille: '${catObj.title || catObj.name || catId}' :\n${localItemStr}`;
           }
       }
    }

    return `\n-- CATALOGUE DISPONIBLE (MAPPAGE STRICT) --\nL'IA doit mapper ses produits en respectant strictement l'appartenance à ces familles. Interdiction absolue de prendre un produit d'une famille pour le mettre dans une catégorie non sensée.\n\nCATEGORIES DISPONIBLES:\n${catStr}\nPRODUITS PAR FAMILLE LOGIQUE:\n${itemMapStr}`;
  } catch (e) {
    console.error("ETK True Data Extraction Error :", e);
    return null;
  }
}
