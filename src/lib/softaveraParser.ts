// src/lib/softaveraParser.ts

export interface ParsedModifier {
  id: string;
  name: string;
  priceDelta: number;
  image: string | null;
  subSteps?: ParsedStep[];
}

export interface ParsedStep {
  id: string;
  title: string;
  minChoices: number;
  maxChoices: number;
  semanticType: 'TAILLE' | 'FRITES' | 'SAUCES' | 'BOISSON' | 'DESSERT' | 'EXTRAS' | 'UNKNOWN';
  options: ParsedModifier[];
}

export interface ParsedProduct {
  id: string;
  name: string;
  priceTTC: number;
  image: string | null;
  description: string;
  steps: ParsedStep[];
}

export interface ParsedCategory {
  id: string;
  title: string;
  image?: string | null;
  products: ParsedProduct[];
  workflowRank?: number;
}

/**
 * Extrait le prix TTC le plus pertinent de l'objet Item d'ETK360
 */
function extractBestPrice(rawItem: any): number {
  let priceTTC = 0;
  if (typeof rawItem.price?.ttc === 'number' && rawItem.price.ttc > 0) priceTTC = rawItem.price.ttc;
  else if (typeof rawItem.price?.dflt === 'number' && rawItem.price.dflt > 0) priceTTC = rawItem.price.dflt;
  else if (typeof rawItem.price?.ht === 'number' && rawItem.price.ht > 0) priceTTC = rawItem.price.ht * 1.1;
  
  if (priceTTC === 0 && rawItem.price?.advanced && typeof rawItem.price.advanced === 'object') {
    const advKeys = Object.keys(rawItem.price.advanced);
    for (const ak of advKeys) {
      const tarifObj = rawItem.price.advanced[ak];
      if (tarifObj && typeof tarifObj.ttc === 'number' && tarifObj.ttc > 0) {
        priceTTC = tarifObj.ttc;
        break;
      }
    }
  }
  return priceTTC;
}

/**
 * Extrait le nom formel destiné au public
 */
function extractBestName(obj: any, fallback: string = "Inconnu"): string {
  if (obj?.displayName?.dflt?.nameDef) return obj.displayName.dflt.nameDef;
  if (typeof obj?.displayName === 'string') return obj.displayName;
  if (obj?.label) return obj.label;
  if (obj?.trads?.fr) return obj.trads.fr;
  if (obj?.title) return obj.title;
  if (obj?.name) return obj.name;
  return fallback;
}

/**
 * Fonction récursive pour construire les étapes et options depuis le Workflow Modifiers (data.modifier)
 * Implémente l'Algorithme cible : Récursion multiple & Anti-boucle.
 */
function buildRecursiveSteps(modifierId: string, data: any, visitedModifierIds: Set<string> = new Set()): ParsedStep[] {
  // Étape 6 : Anti-boucle
  if (visitedModifierIds.has(modifierId)) {
      return []; // Protection contre les cycles infinis
  }
  visitedModifierIds.add(modifierId);

  // Étape 1 : Identifier le modifier
  const modObj = data.modifier?.[modifierId];
  if (!modObj || !modObj.steps) return [];

  // Étape 2 : Lire et trier les steps
  const stepKeys = Object.keys(modObj.steps);
  if (stepKeys.length === 0) return []; // Cas particulier : steps vides → tableau vide

  const stepsToProcess = stepKeys.map(k => ({ id: k, ...modObj.steps[k] }));
  stepsToProcess.sort((a, b) => (a.rank || 0) - (b.rank || 0)); // Tri croissant par rank

  const parsedSteps: ParsedStep[] = [];

  // Étape 3 : Parcourir chaque step
  for (const sNode of stepsToProcess) {
     const stepId = sNode.id;
     
     // Récupération des infos générales de l'étape pour le titre et les valeurs min/max
     const stepInfos = data.opt?.[stepId] || data.steps?.[stepId] || {};
     const title = extractBestName(stepInfos, stepInfos.title || "Choix");
     
     // Déduction sémantique de l'étape
     let sType: 'TAILLE' | 'FRITES' | 'SAUCES' | 'BOISSON' | 'DESSERT' | 'EXTRAS' | 'UNKNOWN' = 'UNKNOWN';
     const t = title.toLowerCase();
     if (t.includes('taille') || t.includes('format') || t.includes('size')) sType = 'TAILLE';
     else if (t.includes('frite') || t.includes('side')) sType = 'FRITES';
     else if (t.includes('sauce') || t.includes('dip')) sType = 'SAUCES';
     else if (t.includes('boisson') || t.includes('drink')) sType = 'BOISSON';
     else if (t.includes('dessert') || t.includes('glace')) sType = 'DESSERT';
     else sType = 'EXTRAS';

     let minChoices = stepInfos.minChoices || 0;
     let maxChoices = stepInfos.maxChoices || 1;
     
     // Surcharge avec l'objet ovr (override)
     if (sNode.ovr) {
        if (sNode.ovr.minChoices !== undefined) minChoices = sNode.ovr.minChoices;
        if (sNode.ovr.maxChoices !== undefined) maxChoices = sNode.ovr.maxChoices;
     }

     const step: ParsedStep = {
        id: stepId,
        title,
        minChoices,
        maxChoices,
        semanticType: sType,
        options: []
     };

     // Étape 4 : Parcourir les items
     const itemsMap = sNode.items;
     if (itemsMap && typeof itemsMap === 'object') {
        const itemKeys = Object.keys(itemsMap);
        for (const productId of itemKeys) {
           const itemVal = itemsMap[productId];
           
           const optProductRef = data.items?.[productId];
           const optName = optProductRef ? extractBestName(optProductRef, "Option").trim() : `Item ${productId}`;
           
           let optImg = optProductRef?.img?.dflt?.img || optProductRef?.img?.url || null;
           if (optImg === "https://beta-catalogue.etk360.com/no-pictures.svg") optImg = null;

           // Résolution du prix delta
           let priceDelta = 0;
           const legacyValObj = stepInfos.values?.[productId] || stepInfos.items?.[productId] || stepInfos.stepItems?.[productId];
           if (legacyValObj && legacyValObj.priceStep !== undefined) {
              priceDelta = Number(legacyValObj.priceStep) || 0;
           } else if (optProductRef) {
              priceDelta = Number(extractBestPrice(optProductRef)) || 0;
           }

           const option: ParsedModifier = {
              id: productId,
              name: optName,
              priceDelta,
              image: optImg,
           };

           // Étape 5 : Récursion
           // itemsMap contient `productId` comme clé et `modifierId` ou null comme valeur
           const itemModifierId = typeof itemVal === 'string' ? itemVal : (itemVal && (itemVal as any).modifier ? (itemVal as any).modifier : null);
           
           if (itemModifierId) {
              // On passe un clone du Set visited pour l'anti-boucle sur cette branche
              const newVisited = new Set(visitedModifierIds);
              option.subSteps = buildRecursiveSteps(itemModifierId, data, newVisited);
           }

           step.options.push(option);
        }
     }

     parsedSteps.push(step);
  }
  
  return parsedSteps;
}

/**
 * Parseur Séquentiel Hybride basé exclusivement sur la logique data.workflow (Récursif)
 */
export function parseETK360Hierarchy(data: any): ParsedCategory[] {
  if (!data || !data.categories || !data.items || typeof data.items !== 'object') return [];

  const tree: ParsedCategory[] = [];

  // ÉTAPE 1 : Extraire UNIQUEMENT les catégories racines et visibles
  const catKeys = Object.keys(data.categories);
  let rawCategories = catKeys.map(k => {
      // Injection du rang workflow pour les catégories
      const wNode = data.workflow ? data.workflow[k] : null;
      return { 
         ...data.categories[k], 
         id: k, 
         workflowRank: wNode && wNode.rank !== undefined ? wNode.rank : (data.categories[k].rank || 0),
         inWorkflow: !!wNode
      };
    })
    .filter(c => {
       if (!c || !c.title || (c.parent && c.parent !== "")) return false;
       if (c.visibilityInfo && c.visibilityInfo.isVisible === false) return false;
       if (c.isVisible === false) return false;
       
       // Si un workflow global existe, on ne garde que les catégories présentes dedans
       if (data.workflow && !c.inWorkflow) return false;
       
       return true;
    });
    
  // Tri exclusif selon le rang défini dans le workflow ETK360
  rawCategories.sort((a, b) => (a.workflowRank || 0) - (b.workflowRank || 0));

  // ÉTAPE 2 : Grouper les articles disponibles selon leur 'parent' ETK
  const itemKeys = Object.keys(data.items);
  const rawItems = itemKeys.map(k => ({ ...data.items[k], id: k }));
  
  const itemsByParent: Record<string, any[]> = {};
  for (const item of rawItems) {
    if (item.parent) {
      if (!itemsByParent[item.parent]) itemsByParent[item.parent] = [];
      itemsByParent[item.parent].push(item);
    }
  }

  // ÉTAPE 3 : Reconstruction Finale par Catégorie Principale
  for (const category of rawCategories) {
    const parentItems = itemsByParent[category.id] || [];
    if (parentItems.length === 0) continue;

    const catTitle = extractBestName(category, category.title || `Catégorie`);
    
    let catImg = null;
    if (category.img?.dflt?.img) {
      catImg = category.img.dflt.img;
      if (catImg === "https://beta-catalogue.etk360.com/no-pictures.svg") catImg = null;
    } else if (category.img?.url) {
      catImg = category.img.url;
    }

    const categoryNode: ParsedCategory = {
      id: category.id,
      title: catTitle,
      image: catImg,
      products: []
    };

    // ➡️ Filtre et Tri via le WORKFLOW pour forcer l'ordre des produits de la catégorie
    const workflowNode = data.workflow?.[category.id];
    let validItems = [];
    
    if (workflowNode && workflowNode.content) {
       for (const item of parentItems) {
          const wItem = workflowNode.content[item.id];
          if (wItem !== undefined) {
             item.workflowRank = wItem.rank !== undefined ? wItem.rank : (item.rank || 0);
             item.workflowModifierId = wItem.modifier || null;
             validItems.push(item);
          }
       }
       validItems.sort((a, b) => a.workflowRank - b.workflowRank);
    } else {
       validItems = [...parentItems];
       validItems.sort((a, b) => (a.rank || 0) - (b.rank || 0));
    }

    for (const item of validItems) {
      // Ignorer les produits archivés ou explicitement invisibles globaux
      if (item.archive === true) continue;
      if (item.isVisible === false) continue;

      let desc = "";
      if (typeof item.description === 'string') desc = item.description;
      else if (item.description?.dflt?.nameDef) desc = item.description.dflt.nameDef;
      else if (item.desc) desc = item.desc;
      if (desc === "[object Object]") desc = "";

      let imageUrl = null;
      if (item.img?.dflt?.img) {
        imageUrl = item.img.dflt.img;
        if (imageUrl === "https://beta-catalogue.etk360.com/no-pictures.svg") imageUrl = null;
      } else if (item.img?.url) {
        imageUrl = item.img.url;
      }

      const productNode: ParsedProduct = {
        id: item.id,
        name: extractBestName(item, "Produit sans nom").trim(),
        priceTTC: extractBestPrice(item),
        image: imageUrl,
        description: desc,
        steps: []
      };

      // INIT DU PARCOURS RECURSIF DES MODIFIERS
      // Le produit possède éventuellement un workflowModifierId hérité de son noeud catégorie
      let startModifierId = item.workflowModifierId;

      // Sinon, il est défini au niveau du produit lui-même dans son objet "item" (base ETK360 native)
      if (!startModifierId && item.modifier) {
         startModifierId = item.modifier;
      }
      
      // Lancement de l'arbre complet avec protection anti-boucle
      if (startModifierId) {
         productNode.steps = buildRecursiveSteps(startModifierId, data);
      } else if (item.steps && Array.isArray(item.steps) && item.steps.length > 0) {
         // Fallback legacy (très rare désormais si la carte utilise le mode Modifier) : on lit le tableau standard non-récursif des anciennes cartes
         for (const stepId of item.steps) {
            const stepObj = data.opt?.[stepId] || data.steps?.[stepId];
            if (!stepObj) continue;
            
            const stepValues = stepObj.values || stepObj.items || stepObj.stepItems;
            if (!stepValues || typeof stepValues !== 'object') continue;

            const t = (extractBestName(stepObj, stepObj.title || "Choix")).toLowerCase();
            let sType: any = 'UNKNOWN';
            if (t.includes('taille') || t.includes('format')) sType = 'TAILLE';
            else if (t.includes('frite') || t.includes('side')) sType = 'FRITES';
            else if (t.includes('sauce') || t.includes('dip')) sType = 'SAUCES';
            else if (t.includes('boisson') || t.includes('drink')) sType = 'BOISSON';
            else if (t.includes('dessert') || t.includes('glace')) sType = 'DESSERT';

            const stepNode: ParsedStep = {
               id: stepId,
               title: extractBestName(stepObj, stepObj.title || "Choix"),
               minChoices: stepObj.minChoices || 0,
               maxChoices: stepObj.maxChoices || 1,
               semanticType: sType,
               options: []
            };

            const valueKeys = Object.keys(stepValues);
            const rawValues = valueKeys.map(k => ({ ...stepValues[k], id: k }));
            rawValues.sort((a, b) => (a.rank || 0) - (b.rank || 0));

            for (const valObj of rawValues) {
               const optProductRef = data.items[valObj.id];
               let optImg = optProductRef?.img?.dflt?.img || optProductRef?.img?.url || null;
               if (optImg === "https://beta-catalogue.etk360.com/no-pictures.svg") optImg = null;

               stepNode.options.push({
                  id: valObj.id,
                  name: optProductRef ? extractBestName(optProductRef, "Option").trim() : `Item ${valObj.id}`,
                  priceDelta: Number(valObj.priceStep) || 0,
                  image: optImg
               });
            }
            productNode.steps.push(stepNode);
         }
      }

      // Résolution de l'affichage à 0€ des Menus Composables (ex: menus basés sur des étapes payantes)
      if (productNode.priceTTC === 0 && productNode.steps.length > 0) {
         let startingPrice = 0;
         for (const step of productNode.steps) {
            if (step.minChoices > 0 && step.options.length > 0) {
               const minPriceDelta = Math.min(...step.options.map(o => o.priceDelta));
               if (minPriceDelta > 0) {
                  startingPrice += (minPriceDelta * step.minChoices);
               }
            }
         }
         if (startingPrice > 0) {
            productNode.priceTTC = startingPrice;
         }
      }

      categoryNode.products.push(productNode);
    }

    if (!categoryNode.image && categoryNode.products.length > 0) {
      const firstImgProduct = categoryNode.products.find(p => p.image);
      if (firstImgProduct) categoryNode.image = firstImgProduct.image;
    }

    if (categoryNode.products.length > 0) {
      tree.push(categoryNode);
    }
  }

  return tree;
}

