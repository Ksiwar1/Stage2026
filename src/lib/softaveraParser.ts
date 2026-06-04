// src/lib/softaveraParser.ts

export interface ParsedModifier {
  id: string;
  name: string;
  priceDelta: number;
  image: string | null;
  subSteps?: ParsedStep[];
  isObligatory?: boolean;
}

export interface ParsedStep {
  id: string;
  title: string;
  minChoices: number;
  maxChoices: number;
  semanticType: 'TAILLE' | 'FRITES' | 'SAUCES' | 'BOISSON' | 'DESSERT' | 'EXTRAS' | 'OPTION_GLOBALE' | 'UNKNOWN';
  options: ParsedModifier[];
}

export interface ParsedProduct {
  id: string;
  name: string;
  priceTTC: number | null;
  image: string | null;
  description: string;
  steps: ParsedStep[];
  modifierId?: string | null;
}

export interface ParsedSubCategory {
  id: string;
  title: string;
  products: ParsedProduct[];
  workflowRank?: number;
}

export interface ParsedCategory {
  id: string;
  title: string;
  image?: string | null;
  products: ParsedProduct[];
  subCategories: ParsedSubCategory[];
  workflowRank?: number;
}

/**
 * Extrait le prix TTC le plus pertinent de l'objet Item d'ETK360.
 * Gère plusieurs formats de données :
 * - Le format strict ETK360 (objet complexe avec dflt.ttc)
 * - Le format hérité ou simplifié (dflt comme simple nombre)
 * - Le format avancé (mode de vente spécifique) utile pour les Menus (dont le prix de base est 0)
 * 
 * @param {any} rawItem - L'item brut provenant de la base de données
 * @returns {number | null} Le prix extrait ou null si introuvable
 */
function extractBestPrice(rawItem: any): number | null {
  if (!rawItem || !rawItem.price) return null;
  
  let bestPrice: number | null = null;
  
  if (rawItem.price.dflt !== undefined) {
    if (typeof rawItem.price.dflt === 'number') {
      bestPrice = rawItem.price.dflt;
    } else if (typeof rawItem.price.dflt === 'object' && rawItem.price.dflt !== null) {
      bestPrice = rawItem.price.dflt.ttc !== undefined ? rawItem.price.dflt.ttc : null;
    }
  }

  // Fallback si le prix par défaut est de 0 (cas fréquent pour les menus où le prix est stocké dans les tarifs avancés/saleModes)
  if ((bestPrice === null || bestPrice === 0) && rawItem.price.advanced && typeof rawItem.price.advanced === 'object') {
    for (const key of Object.keys(rawItem.price.advanced)) {
      const adv = rawItem.price.advanced[key];
      if (adv && typeof adv.ttc === 'number' && adv.ttc > 0) {
        return adv.ttc;
      }
    }
  }
  
  return bestPrice;
}

/**
 * Extrait le nom formel destiné au public
 */
function extractBestName(obj: any, fallback: string = "Inconnu"): string {
  // Le nouveau format normalise tout dans 'title'
  if (obj?.title) return obj.title;
  // Les fallbacks conservés temporairement si des objets non mappés filtrent
  if (obj?.displayName?.dflt?.nameDef) return obj.displayName.dflt.nameDef;
  if (typeof obj?.displayName === 'string') return obj.displayName;
  if (obj?.name) return obj.name;
  return fallback;
}

function extractBasicCompStep(productId: string, itemObj: any, data: any): ParsedStep | null {
  const basicComp = itemObj?.basicComp;
  if (basicComp && typeof basicComp === 'object') {
    const ingEntries = Object.entries(basicComp)
      .filter(([, v]: [string, any]) => v?.isVisible !== false)
      .sort(([, a]: [string, any], [, b]: [string, any]) => (a?.rank || 0) - (b?.rank || 0));

    if (ingEntries.length > 0) {
      const compositionStep: ParsedStep = {
        id: `composition_${productId}`,
        title: 'Composition',
        minChoices: 0,
        maxChoices: ingEntries.length,
        semanticType: 'UNKNOWN',
        options: []
      };

      for (const [ingId, ingMeta] of ingEntries as [string, any][]) {
        const ingRef = data.items?.[ingId];
        const ingName = ingRef ? extractBestName(ingRef, `Item ${ingId}`).trim() : `Item ${ingId}`;

        let ingImg = ingRef?.img?.dflt?.img || ingRef?.img?.url || null;
        if (ingImg === "https://beta-catalogue.etk360.com/no-pictures.svg" || ingImg === "https://dev-catalogue.softavera.com/no-pictures.svg") {
           ingImg = null;
        }

        compositionStep.options.push({
          id: ingId,
          name: ingName,
          priceDelta: 0,
          image: ingImg,
          isObligatory: (ingMeta as any)?.isObligatory === true
        });
      }

      if (compositionStep.options.length > 0) {
        return compositionStep;
      }
    }
  }
  return null;
}

/**
 * Extrait les dimensions dynamiques (ex: Tailles) définies dans .opt du produit
 * pour forcer leur sélection avant tout le reste du parcours.
 */
function extractGlobalOptionsStep(productId: string, itemObj: any, data: any): ParsedStep[] {
  if (!itemObj.opt || Object.keys(itemObj.opt).length === 0) return [];
  
  const steps: ParsedStep[] = [];
  
  for (const dimId of Object.keys(itemObj.opt)) {
     const dimDef = data.opt && data.opt[dimId];
     if (!dimDef) continue;
     
     const allowedValues = itemObj.opt[dimId] as string[];
     if (!Array.isArray(allowedValues) || allowedValues.length === 0) continue;
     
     const options: ParsedModifier[] = [];
     for (const valId of allowedValues) {
        const valDef = dimDef.values && dimDef.values[valId];
        if (valDef) {
           options.push({
             id: valId,
             name: valDef.title || valId,
             priceDelta: 0, // MVP
             image: null
           });
        }
     }
     
     if (options.length > 0) {
        options.sort((a, b) => {
           const defA = dimDef.values[a.id];
           const defB = dimDef.values[b.id];
           return (defA?.rank || 0) - (defB?.rank || 0);
        });

        let cleanedTitle = dimDef.title || dimDef.displayName?.dflt?.nameDef || "Option";
        // Nettoyage de "Taille _FANTA_000005" -> "Taille"
        if (cleanedTitle.includes('_')) {
           cleanedTitle = cleanedTitle.split('_')[0].trim();
        }

        steps.push({
           id: dimId,
           title: cleanedTitle,
           minChoices: 1,
           maxChoices: 1,
           semanticType: 'OPTION_GLOBALE',
           options: options
        });
     }
  }
  return steps;
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
     let itemsMap = sNode.items;
     if (!itemsMap || Object.keys(itemsMap).length === 0) {
        itemsMap = stepInfos.stepItems || stepInfos.values || stepInfos.items || {};
     }

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

           // Ajout de la Composition de base sur l'option, si existante
           const compStep = extractBasicCompStep(productId, optProductRef, data);

           // Étape 5 : Récursion
           // itemsMap contient `productId` comme clé et `modifierId` ou null comme valeur
           const itemModifierId = typeof itemVal === 'string' ? itemVal : (itemVal && (itemVal as any).modifier ? (itemVal as any).modifier : (optProductRef?.modifier || null));
           
           if (itemModifierId) {
              // On passe un clone du Set visited pour l'anti-boucle sur cette branche
              const newVisited = new Set(visitedModifierIds);
              option.subSteps = buildRecursiveSteps(itemModifierId, data, newVisited);
           }

           if (compStep) {
               if (!option.subSteps) option.subSteps = [];
               option.subSteps.unshift(compStep);
           }

           step.options.push(option);
        }
     }

     parsedSteps.push(step);
  }
  
  return parsedSteps;
}

function parseLegacySteps(itemObj: any, data: any): ParsedStep[] {
   const steps: ParsedStep[] = [];
   for (const stepId of itemObj.steps) {
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
      steps.push(stepNode);
   }
   return steps;
}

/**
 * Ancienne logique de parsing de secours si la racine workflow n'est pas trouvée (très anciens menus)
 */
function parseLegacyETK360Hierarchy(data: any): ParsedCategory[] {
   const tree: ParsedCategory[] = [];
   const rawCategories = Object.keys(data.categories)
      .map(k => ({ ...data.categories[k], id: k, workflowRank: data.categories[k].rank || 0 }))
      .filter(c => c.title && !(c.parent && c.parent !== "") && c.visibilityInfo?.isVisible !== false && c.isVisible !== false);
   
   rawCategories.sort((a, b) => a.workflowRank - b.workflowRank);
   
   const itemsByParent: Record<string, any[]> = {};
   for (const [id, item] of Object.entries(data.items as Record<string, any>)) {
      if (item.parent) {
         if (!itemsByParent[item.parent]) itemsByParent[item.parent] = [];
         itemsByParent[item.parent].push({ ...item, id });
      }
   }

   const parseLegacyProduct = (item: any): ParsedProduct => {
      let desc = typeof item.description === 'string' ? item.description : (item.description?.dflt?.nameDef || item.desc || "");
      if (desc === "[object Object]") desc = "";
      let imageUrl = item.img?.dflt?.img || item.img?.url || null;
      if (imageUrl === "https://beta-catalogue.etk360.com/no-pictures.svg") imageUrl = null;

      const productNode: ParsedProduct = {
         id: item.id,
         name: extractBestName(item, "Produit").trim(),
         priceTTC: extractBestPrice(item),
         image: imageUrl,
         description: desc,
         steps: [],
         modifierId: item.modifier || null
      };

      if (item.modifier) productNode.steps = buildRecursiveSteps(item.modifier, data);
      else if (item.steps && Array.isArray(item.steps)) productNode.steps = parseLegacySteps(item, data);

      const compStep = extractBasicCompStep(item.id, item, data);
      if (compStep) {
          productNode.steps.unshift(compStep);
      }
      return productNode;
   };

   for (const category of rawCategories) {
      const subCategories: ParsedSubCategory[] = [];
      const directProducts: ParsedProduct[] = [];
      const directItems = [...(itemsByParent[category.id] || [])];
      directItems.sort((a, b) => (a.rank || 0) - (b.rank || 0));

      for (const item of directItems) {
         if (item.archive === true || item.isVisible === false) continue;
         directProducts.push(parseLegacyProduct(item));
      }

      if (directProducts.length > 0) {
         subCategories.push({
            id: `${category.id}_direct`,
            title: extractBestName(category, "Catégorie"),
            products: directProducts,
            workflowRank: -1
         });
      }

      const subCats = Object.keys(data.categories)
         .map(k => ({ ...data.categories[k], id: k }))
         .filter(c => c.parent === category.id && c.title && c.visibilityInfo?.isVisible !== false && c.isVisible !== false);
      subCats.sort((a, b) => (a.rank || 0) - (b.rank || 0));

      for (const subCat of subCats) {
         const subProducts: ParsedProduct[] = [];
         const subItems = [...(itemsByParent[subCat.id] || [])];
         subItems.sort((a, b) => (a.rank || 0) - (b.rank || 0));
         for (const item of subItems) {
            if (item.archive === true || item.isVisible === false) continue;
            subProducts.push(parseLegacyProduct(item));
         }
         subCategories.push({
            id: subCat.id,
            title: extractBestName(subCat, "Catégorie"),
            products: subProducts,
            workflowRank: subCat.rank || 0
         });
      }

      let catImg = category.img?.dflt?.img || category.img?.url || null;
      if (catImg === "https://beta-catalogue.etk360.com/no-pictures.svg") catImg = null;

      const categoryNode: ParsedCategory = {
         id: category.id,
         title: extractBestName(category, "Catégorie"),
         image: catImg,
         products: [],
         subCategories: subCategories
      };

      const allProducts: ParsedProduct[] = [];
      for (const sub of subCategories) {
         allProducts.push(...sub.products);
      }
      categoryNode.products = allProducts;

      if (!categoryNode.image && categoryNode.products.length > 0) {
         const firstImg = categoryNode.products.find(p => p.image);
         if (firstImg) categoryNode.image = firstImg.image;
      }
      tree.push(categoryNode);
   }
   return tree;
}

/**
 * Parseur Séquentiel Pur basé exclusivement sur l'Arbre de Syntaxe Abstrait (data.workflow) !
 */
function parseProduct(iNodeId: string, iNodeContent: any, data: any): ParsedProduct | null {
  const itemObj = data.items[iNodeId];
  if (!itemObj) return null;
  if (itemObj.archive === true || itemObj.isVisible === false) return null;

  let desc = typeof itemObj.description === 'string' ? itemObj.description : (itemObj.description?.dflt?.nameDef || itemObj.desc || "");
  if (desc === "[object Object]") desc = "";

  let imgUrl = itemObj.img?.dflt?.img;
  if (imgUrl === "https://dev-catalogue.softavera.com/no-pictures.svg" || imgUrl === "no-pictures.svg" || imgUrl === "https://beta-catalogue.etk360.com/no-pictures.svg") imgUrl = null;

  const itemContentKeys = Object.keys(iNodeContent || {});
  const modNodes = itemContentKeys.map(k => ({ id: k, ...iNodeContent[k] })).filter(n => n.type === 'modifier');
  let startModifierId = modNodes.length > 0 ? modNodes[0].id : itemObj.modifier;

  const productNode: ParsedProduct = {
      id: iNodeId,
      name: extractBestName(itemObj, "Produit").trim(),
      priceTTC: extractBestPrice(itemObj),
      image: imgUrl,
      description: desc,
      steps: [],
      modifierId: startModifierId || null,
  };

  if (startModifierId) {
     productNode.steps = buildRecursiveSteps(startModifierId, data);
  } else if (itemObj.steps && Array.isArray(itemObj.steps) && itemObj.steps.length > 0) {
     productNode.steps = parseLegacySteps(itemObj, data);
  }

  const compStep = extractBasicCompStep(iNodeId, itemObj, data);
  if (compStep) {
     productNode.steps.unshift(compStep);
  }

  const globalOptSteps = extractGlobalOptionsStep(iNodeId, itemObj, data);
  if (globalOptSteps.length > 0) {
     productNode.steps.unshift(...globalOptSteps);
  }

  return productNode;
}

/**
 * Transforme les données brutes d'une carte ETK360 (PostgreSQL)
 * en un AST (Abstract Syntax Tree) compréhensible par l'interface de la borne (KioskSimulator).
 * C'est le traducteur principal entre la base de données et l'UI.
 * 
 * @param {any} data - Le JSON brut complet de la carte
 * @param {boolean} enforceActiveWorkflow - Si vrai, filtre uniquement les catégories présentes dans le workflow (menu principal)
 * @returns {ParsedCategory[]} Une liste hiérarchique propre de catégories contenant des sous-catégories et des produits
 */
export function parseETK360Hierarchy(data: any): ParsedCategory[] {
  if (!data || !data.categories || !data.items || typeof data.items !== 'object') return [];

  // Fallback si pas de workflow du tout !
  if (!data.workflow || Object.keys(data.workflow).length === 0) {
      return parseLegacyETK360Hierarchy(data); 
  }

  const tree: ParsedCategory[] = [];
  const rootWorkflowIds = Object.keys(data.workflow);

  // Étape 1 : Parcourir les noeuds racines (Les Familles / Workflows)
  for (const wNodeId of rootWorkflowIds) {
      const wNode = data.workflow[wNodeId];
      if (wNode.type && wNode.type !== 'categories') continue;
      
      const catObj = data.categories[wNodeId];
      if (!catObj) continue;
      
      // Filtres de visibilité
      if (catObj.archive === true || catObj.isVisible === false) continue;
      if (catObj.visibilityInfo?.isVisible === false) continue;

      let title = catObj.title || "";
      let image = catObj.img?.dflt?.img;
      if (image === "https://dev-catalogue.softavera.com/no-pictures.svg" || image === "no-pictures.svg") image = null;

      const subCategories: ParsedSubCategory[] = [];
      const directProducts: ParsedProduct[] = [];

      const contentObj = wNode.content || {};
      const sortedEntries = Object.entries(contentObj)
        .map(([key, val]: [string, any]) => ({ id: key, ...val }))
        .sort((a, b) => (a.rank || 0) - (b.rank || 0));

      for (const entry of sortedEntries) {
        if (entry.type === 'categories') {
          const subCatId = entry.id;
          const subCatObj = data.categories[subCatId];
          if (!subCatObj) continue;
          if (subCatObj.archive === true || subCatObj.isVisible === false) continue;
          if (subCatObj.visibilityInfo?.isVisible === false) continue;

          const subCatTitle = subCatObj.title || "";
          const subProducts: ParsedProduct[] = [];
          
          const subItems = Object.entries(entry.content || {})
            .map(([k, v]: [string, any]) => ({ id: k, ...v }))
            .sort((a, b) => (a.rank || 0) - (b.rank || 0));

          for (const subItem of subItems) {
            const product = parseProduct(subItem.id, subItem.content, data);
            if (product) {
              subProducts.push(product);
            }
          }

          subCategories.push({
            id: subCatId,
            title: subCatTitle,
            products: subProducts,
            workflowRank: entry.rank || 0
          });
        } else if (entry.type === 'items' || !entry.type) {
          const product = parseProduct(entry.id, entry.content, data);
          if (product) {
            directProducts.push(product);
          }
        }
      }

      if (directProducts.length > 0) {
        subCategories.unshift({
          id: `${wNodeId}_direct`,
          title: title,
          products: directProducts,
          workflowRank: -1
        });
      }

      const categoryNode: ParsedCategory = {
          id: wNodeId,
          title,
          image,
          products: [],
          subCategories,
          workflowRank: wNode.rank !== undefined ? wNode.rank : (catObj.rank || 0)
      };

      const allProducts: ParsedProduct[] = [];
      for (const sub of subCategories) {
        allProducts.push(...sub.products);
      }
      categoryNode.products = allProducts;

      if (!categoryNode.image && categoryNode.products.length > 0) {
         const firstImgProduct = categoryNode.products.find(p => p.image);
         if (firstImgProduct) categoryNode.image = firstImgProduct.image;
      }

      tree.push(categoryNode);
  }

  // Tri final des catégories par leur rang workflow
  tree.sort((a, b) => (a.workflowRank || 0) - (b.workflowRank || 0));
  
  return tree;
}

