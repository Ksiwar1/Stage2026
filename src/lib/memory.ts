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
export function getPromptSystemForAI(sourceCatalogName?: string, secondaryInspirations: string[] = [], hasImage = false, phase: 1 | 2 = 1): string {
  const ocrAddon = hasImage ? `\n\n📌 MODE VISION / OCR ACTIF : L'utilisateur a fourni la photo d'un menu complet. Ton rôle prioritaire est d'agir comme un OCR intelligent:\n - Lis précisément toutes les catégories, les noms de produits, et SURTOUT LES PRIX figurant sur l'image.\n - RAPPEL STRICT: Modélise UNIQUEMENT ce que tu vois sur l'image ou en inférant logiquement le menu à partir de celle-ci, tout en respectant scrupuleusement la structure de mon exemple ETK360.\n - Ne génère pas de produits hors-sujet qui ne sont pas sur l'image.` : "";

  // Construction du RAG avec les modèles secondaires !
  let secondaryContext = "";
  if (secondaryInspirations.length > 0) {
     const extractions = secondaryInspirations.map(file => extractTemplateFromCatalogue(path.join(process.cwd(), '.softavera', 'carte', file))).filter(t => t);
     if (extractions.length > 0) {
        secondaryContext = `\n\nPOUR TON INSPIRATION STRUCTURELLE (RAG), voici ${extractions.length} autre(s) méthode(s) validée(s) dans notre librairie. Inspires-en toi pour les patterns complexes :\n`;
        extractions.forEach((ext, i) => {
           secondaryContext += `--- BASE INSPIRATION ${i + 1} :\n\`\`\`json\n${ext}\n\`\`\`\n`;
        });
     }
  }

  let baseTemplate = "";
  if (sourceCatalogName && sourceCatalogName !== 'generique') {
    const extractedTemplate = extractTemplateFromCatalogue(path.join(process.cwd(), '.softavera', 'carte', sourceCatalogName));
    if (extractedTemplate) baseTemplate = extractedTemplate;
  } else {
    // Le Generique master template
    baseTemplate = `{
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
    "item_menu_burger": {
      "title": "Menu Classic",
      "modifier": "mod_menu_burger_steps"
    },
    "item_coca": {
      "title": "Coca Cola",
      "price": { "dflt": { "ttc": 2.50 } },
      "opt": { "dim_taille_boisson": [ "val_33cl", "val_50cl" ] }
    },
    "item_frites": { "title": "Frites Classiques" },
    "item_potatoes": { "title": "Potatoes Croustillantes" },
    "item_sauce_mayo": { "title": "Mayonnaise" },
    "item_sauce_ket": { "title": "Ketchup" }
  },
  "opt": {
    "dim_taille_boisson": {
      "title": "Taille de votre boisson",
      "values": {
        "val_33cl": { "title": "Normale", "rank": 1 },
        "val_50cl": { "title": "Maxi", "rank": 2, "priceDelta": 0.50 }
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
      "title": "Choisissez votre boisson",
      "minChoices": 1,
      "maxChoices": 1,
      "items": { "item_coca": {} }
    },
    "step_choix_accompagnement": {
      "title": "Votre accompagnement",
      "minChoices": 1,
      "maxChoices": 1,
      "items": { "item_frites": {}, "item_potatoes": {} }
    },
    "step_choix_sauce": {
      "title": "Choisir vos sauces",
      "minChoices": 0,
      "maxChoices": 2,
      "items": { "item_sauce_mayo": {}, "item_sauce_ket": {} }
    }
  }
}`;
  }

  if (phase === 1) {
    return `Tu es l'architecte JSON expert du système de kiosque ETK360.
Ta mission est d'effectuer la PHASE 1 de génération : CONSTRUIRE LE WORKFLOW ABSTRAIT.
Tu ne dois renvoyer QUE le JSON final (sans balises markdown autour du texte ni blabla).
${ocrAddon}

MA RÉFÉRENCE PRINCIPALE (TON MODÈLE MÂÎTRE) :
Tu dois t'en inspirer PROFONDÉMENT. 
\`\`\`json
${baseTemplate}
\`\`\`
${secondaryContext}

RÈGLES VITALES PHASE 1 :
1. TON JSON DOIT CONSTRUIRE UN PARCOURS ABSTRAIT (Génère UNIQUEMENT les objets "workflow", "categories", et les attributs "modifier" liés).
2. NE METS AUCUN PRIX, AUCUNE IMAGE. On ne veut que la structure des IDs.
3. Chaque identifiant de catégorie dans "workflow" doit correspondre exactement au dictionnaire "categories".
4. Chaque ID de produit listé dans "workflow -> content" doit obligatoirement inclure l'affectation de son "modifier" si c'est un menu complexe, ou "opt" si c'est simplement quelques tailles/variantes.
5. Produis un Json contenant uniqument "workflow", "categories" (et Optionellement un mapping abstrait "modifier" contenant les steps vide d'items).

Génère l'architecture abstraite ETK360 la plus pertinente pour la demande suivante :`;
  }

  // PHASE 2 (Enrichissement)
  return `Tu es l'architecte JSON expert du système de kiosque ETK360.
Ta mission est d'effectuer la PHASE 2 de génération : L'ENRICHISSEMENT COMPLET.
L'utilisateur te fournit en entrée l'Architecture Abstraite parfaite (Le Squelette). 
Ton rôle est de remplir cette architecture en créant les dictionnaires ("items", "steps", "opt", "modifier" manquants) avec les vrais produits et prix.
Tu ne dois renvoyer QUE le JSON final (sans balises markdown autour du texte ni blabla).
${ocrAddon}

MA RÉFÉRENCE PRINCIPALE (TON MODÈLE MÂÎTRE) :
Pour savoir COMMENT formater un dictionnaire 'steps', 'items' ou 'opt', voici la structure parfaite que tu dois imiter :
${baseTemplate ? `\`\`\`json\n${baseTemplate}\n\`\`\`` : "Aucun modèle maître, crée l'architecture Standard ETK360."}

${secondaryContext}

RÈGLES VITALES PHASE 2 :
1. Tu dois respecter SCRUPULEUSEMENT le Squelette de la Phase 1 passé en argument. Tout ID de produit listé dans le workflow de la Phase 1 doit TOUJOURS apparaître à la racine de "items". De même, le dictionnaire "steps" doit être OBLIGATOIREMENT défini à la RACINE du JSON final, et JAMAIS à l'intérieur de "modifier".
2. ATTENTION AUX PRIX : Invente des tarifs cohérents ! { "dflt": { "ttc": 12.50 } }. Ne conserve aucun produit à 0.00€.
3. RÈGLE D'OR SUR LES IDS : Absolument TOUS les identifiants présents à l'intérieur de tes 'steps' DOIVENT obligatoirement exister à la racine "items". Ne crée JAMAIS un identifiant fantôme.
4. RÈGLE D'OR SUR L'ORDRE DES ÉTAPES : Si tu crées un Menu avec "steps", utilise la propriété "rank" pour respecter l'ordre logique d'une commande française : d'abord Viande (1), puis Sauces (2), Frites (3), Boisson (4), Dessert (5).
5. S'il s'agit d'une option globale qui ne nécessite pas d'étapes multiples, utilise un objet "opt" lié au produit.
6. INTELLIGENCE VISUELLE : Pour chaque objet tu DOIS obligatoirement ajouter l'URL \`"img": { "dflt": { "img": "https://image.pollinations.ai/prompt/{prompt_anglais}" } }\`. Ne laisses AUCUNE image vide.
7. Chaque Step doit OBLIGATOIREMENT avoir au moins 2 options (items) pour qu'il y ait un choix.

Voici le Squelette Abstrait généré à l'étape 1 dont tu dois hériter et compléter :
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

export function extractTemplateFromCatalogue(catalogPath: string): string | null {
  try {
    if (!fs.existsSync(catalogPath)) return null;
    const content = fs.readFileSync(catalogPath, 'utf-8');
    const data = JSON.parse(content);
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
    const traverseItem = (itemId: string) => {
      if (skeleton.items[itemId]) return;
      if (!data.items[itemId]) return;
      const it = { ...data.items[itemId] };
      it.archive = false;
      it.isVisible = true;
      if (it.visibilityInfo) it.visibilityInfo.isVisible = true;
      it.title = "NOM_PRODUIT_A_REMPLACER"; // Forcer un titre explicite pour l'IA
      skeleton.items[itemId] = it;

      if (it.modifier) {
         traverseModifier(it.modifier);
      }
      if (it.opt) {
         Object.keys(it.opt).forEach(traverseOpt);
      }
    };

    const traverseModifier = (modId: string) => {
      if (skeleton.modifier[modId]) return;
      if (!data.modifier?.[modId]) return;
      skeleton.modifier[modId] = data.modifier[modId];
      if (data.modifier[modId].steps) {
         Object.keys(data.modifier[modId].steps).forEach(traverseStep);
      }
    };

    const traverseStep = (stepId: string) => {
      if (skeleton.steps[stepId]) return;
      if (!data.steps?.[stepId]) return;
      skeleton.steps[stepId] = data.steps[stepId];
      
      if (data.steps[stepId].opt) {
         Object.keys(data.steps[stepId].opt).forEach(traverseOpt);
      }
      if (data.steps[stepId].items) {
         Object.keys(data.steps[stepId].items).forEach(traverseItem);
      }
    };

    const traverseOpt = (optKey: string) => {
      if (skeleton.opt[optKey]) return;
      if (!data.opt?.[optKey]) return;
      skeleton.opt[optKey] = data.opt[optKey];
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
       if (complexItemId) targetContentContainer.content[complexItemId] = { type: 'items', rank: 1 };
       if (simpleItemId) targetContentContainer.content[simpleItemId] = { type: 'items', rank: 2 };
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
