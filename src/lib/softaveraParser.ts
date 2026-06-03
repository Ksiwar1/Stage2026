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
function extractBestPrice(rawItem: any): number | null {
  const price = rawItem?.price;
  if (!price) return null;
  // Prix faisant autorité sur la borne = canal KIOSK dans price.advanced.
  // Indispensable pour les menus/offres dont price.dflt vaut 0 alors que le TTC
  // réel (ex. MENU DOUBLE 16,90 €) n'existe que dans advanced.
  const adv = price.advanced ? Object.values<any>(price.advanced) : [];
  const kiosk = adv.find((a) => a?.orgKeys?.includes('KIOSK')) || adv[0];
  if (kiosk && typeof kiosk.ttc === 'number') return kiosk.ttc;
  // Replis (cartes sans advanced) : price.dflt nombre, puis price.dflt.ttc.
  if (typeof price.dflt === 'number') return price.dflt;
  if (price.dflt && typeof price.dflt.ttc === 'number') return price.dflt.ttc;
  return null;
}

/**
 * Extrait le nom formel destiné au public
 */
function extractBestName(obj: any, fallback: string = "Inconnu"): string {
  // Nom public prioritaire (ce que la borne affiche réellement) :
  // displayName.dflt.nameDef. Le `title` ETK360 est souvent un code écran
  // tronqué (ex. "ENTRESS" pour "NOS ENTREES", "BURG SIG S" pour
  // "BURGERS SIGNATURES"). On ne retombe sur `title` que faute de displayName.
  const nameDef = obj?.displayName?.dflt?.nameDef;
  if (typeof nameDef === 'string' && nameDef.trim() !== '') return nameDef;
  if (typeof obj?.displayName === 'string' && obj.displayName.trim() !== '') return obj.displayName;
  if (obj?.title) return obj.title;
  if (obj?.name) return obj.name;
  return fallback;
}

/** Une étape « Composition de base » (ingrédients pré-cochés et retirables). */
function isCompositionStep(step: ParsedStep): boolean {
  return step.title.trim().toLowerCase() === 'composition';
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

   for (const category of rawCategories) {
      const collectLegacyItems = (catId: string): any[] => {
         let items = [...(itemsByParent[catId] || [])];
         const subCats = Object.keys(data.categories).filter(k => data.categories[k].parent === catId);
         for (const subCatId of subCats) {
            items = items.concat(collectLegacyItems(subCatId));
         }
         return items;
      };
      const parentItems = collectLegacyItems(category.id);
      if (parentItems.length === 0) continue;

      parentItems.sort((a, b) => (a.rank || 0) - (b.rank || 0));

      let catImg = category.img?.dflt?.img || category.img?.url || null;
      if (catImg === "https://beta-catalogue.etk360.com/no-pictures.svg") catImg = null;

      const categoryNode: ParsedCategory = {
         id: category.id,
         title: extractBestName(category, "Catégorie"),
         image: catImg,
         products: []
      };

      for (const item of parentItems) {
         if (item.archive === true || item.isVisible === false) continue;
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

         // Produit « Composition seule » : voir explication dans parseETK360Hierarchy.
         if (productNode.steps.some(isCompositionStep)) {
            productNode.steps = productNode.steps.filter(s => isCompositionStep(s) || s.semanticType === 'OPTION_GLOBALE');
         }

         categoryNode.products.push(productNode);
      }

      if (!categoryNode.image && categoryNode.products.length > 0) {
         const firstImg = categoryNode.products.find(p => p.image);
         if (firstImg) categoryNode.image = firstImg.image;
      }
      // Laisse la catégorie même si 0 produit pour permettre l'affichage du fallback UI
      tree.push(categoryNode);
   }
   return tree;
}

/**
 * Parseur Séquentiel Pur basé exclusivement sur l'Arbre de Syntaxe Abstrait (data.workflow) !
 */
function getDeepItemNodes(contentObj: any): { id: string; rank: number; type?: string; content?: any }[] {
  if (!contentObj || typeof contentObj !== 'object') return [];
  let itemNodes: { id: string; rank: number; type?: string; content?: any }[] = [];
  
  for (const [key, node] of Object.entries<any>(contentObj)) {
    if (node.type === 'items' || !node.type) {
      itemNodes.push({ id: key, rank: node.rank || 0, type: node.type, content: node.content });
    } else if (node.type === 'categories') {
      if (node.content) {
        itemNodes = itemNodes.concat(getDeepItemNodes(node.content));
      }
    }
  }
  return itemNodes;
}

/**
 * Détermine le nom du restaurant affiché sur la borne à partir du JSON ETK360.
 * Ordre de priorité identique à l'affichage borne :
 *   shoplist[].Company > shoplist[].name > opt.restaurantName > data.title
 *   > nom de franchise déduit des anciennes URL d'images > id de carte « titré ».
 */
export function extractRestaurantName(data: any, cardId: string): string {
  let jsonRestaurantName: string | null = null;

  if (data?.shoplist && typeof data.shoplist === 'object') {
    const firstShop = Object.values(data.shoplist)[0] as any;
    if (firstShop && firstShop.name) jsonRestaurantName = firstShop.name;
    if (firstShop && firstShop.Company) jsonRestaurantName = firstShop.Company;
  }
  if (!jsonRestaurantName && data?.opt && data.opt.restaurantName) {
    jsonRestaurantName = data.opt.restaurantName;
  }
  if (!jsonRestaurantName && data?.title) {
    jsonRestaurantName = data.title;
  }

  // Extraire le nom de la franchise depuis les vieilles URL d'images ETK360
  if (!jsonRestaurantName && data?.items) {
    const firstItem = Object.values(data.items).find(
      (item: any) => item?.img?.dflt?.img?.includes('franchise_')
    ) as any;
    if (firstItem) {
      const match = firstItem.img.dflt.img.match(/franchise_\d+_([a-zA-Z0-9_]+)/);
      if (match && match[1]) {
        jsonRestaurantName = match[1].replace(/_/g, ' ');
      }
    }
  }

  if (jsonRestaurantName) return jsonRestaurantName;

  let rawTitle = cardId.replace(/^ia_*/, '').replace(/_/g, ' ').trim();
  if (rawTitle === '' || rawTitle.startsWith('INSTRUCTIONS STRUCT')) {
    rawTitle = 'Restaurant IA';
  }
  return rawTitle
    .split(' ')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

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

      let title = extractBestName(catObj, catObj.title || "");
      let image = catObj.img?.dflt?.img;
      if (image === "https://dev-catalogue.softavera.com/no-pictures.svg" || image === "no-pictures.svg") image = null;

      const categoryNode: ParsedCategory = {
          id: wNodeId,
          title,
          image,
          products: [],
          workflowRank: wNode.rank !== undefined ? wNode.rank : (catObj.rank || 0)
      };

      // Étape 2 : Explorer le content pour trouver les Articles inclus (Tolérance IA if type missing)
      const itemNodes = getDeepItemNodes(wNode.content);
      
      // Tri par le rank du workflow AST
      itemNodes.sort((a, b) => (a.rank || 0) - (b.rank || 0));

      for (const iNode of itemNodes) {
          const itemObj = data.items[iNode.id];
          if (!itemObj) continue;
          if (itemObj.archive === true || itemObj.isVisible === false) continue;

          let desc = typeof itemObj.description === 'string' ? itemObj.description : (itemObj.description?.dflt?.nameDef || itemObj.desc || "");
          if (desc === "[object Object]") desc = "";

          let imgUrl = itemObj.img?.dflt?.img;
          if (imgUrl === "https://dev-catalogue.softavera.com/no-pictures.svg" || imgUrl === "no-pictures.svg") imgUrl = null;

          // Étape 3 : S'enfoncer dans le content de l'Article pour extraire le sous-parcours (Le Modifier) !
          const itemContentKeys = Object.keys(iNode.content || {});
          const modNodes = itemContentKeys.map(k => ({ id: k, ...iNode.content[k] })).filter(n => n.type === 'modifier');
          
          let startModifierId = modNodes.length > 0 ? modNodes[0].id : itemObj.modifier;

          const productNode: ParsedProduct = {
              id: iNode.id,
              name: extractBestName(itemObj, "Produit").trim(),
              priceTTC: extractBestPrice(itemObj),
              image: imgUrl,
              description: desc,
              steps: [],
              modifierId: startModifierId || null,
          };

          // Lancement récursif pour les options 
          if (startModifierId) {
             productNode.steps = buildRecursiveSteps(startModifierId, data);
          } else if (itemObj.steps && Array.isArray(itemObj.steps) && itemObj.steps.length > 0) {
             productNode.steps = parseLegacySteps(itemObj, data);
          }

          const compStep = extractBasicCompStep(iNode.id, itemObj, data);
          if (compStep) {
             productNode.steps.unshift(compStep);
          }

          // Options globales isolées AVANT tout (Taille de la pizza, etc.)
          const globalOptSteps = extractGlobalOptionsStep(iNode.id, itemObj, data);
          if (globalOptSteps.length > 0) {
             productNode.steps.unshift(...globalOptSteps);
          }

          // Produit « Composition seule » : un article doté d'une Composition de
          // base (ingrédients retirables, ex. HOT DOGS) n'est PAS un menu à étapes.
          // On retire les étapes héritées d'un modifier partagé (ex. l'upsell
          // « PETIT FAIM ? » dont les options sont d'autres produits vendables),
          // pour ne conserver que la Composition (et les éventuelles options
          // globales obligatoires comme la Taille). Le tunnel se résume alors au
          // retrait d'ingrédients puis à l'ajout au panier.
          if (productNode.steps.some(isCompositionStep)) {
             productNode.steps = productNode.steps.filter(s => isCompositionStep(s) || s.semanticType === 'OPTION_GLOBALE');
          }

          // Strict Read-Only: Aucun raccommodage de prix par le front-end
          // Si le prix est à 0€ sur le backend, il reste à 0€ visuellement.

          categoryNode.products.push(productNode);
      }

      if (!categoryNode.image && categoryNode.products.length > 0) {
         const firstImgProduct = categoryNode.products.find(p => p.image);
         if (firstImgProduct) categoryNode.image = firstImgProduct.image;
      }

      // On autorise désormais les catégories vides à exister dans l'arbre final
      // pour que l'interface (KioskSimulator) puisse afficher le Empty State "Aucun produit disponible".
      tree.push(categoryNode);
  }

  // Tri final des catégories par leur rang workflow
  tree.sort((a, b) => (a.workflowRank || 0) - (b.workflowRank || 0));
  
  return tree;
}

