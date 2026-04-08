export interface ProductTreeNode {
  productId: string;
  name: string;
  price: number;
  image: string | null;
  modifierId: string | null;
  steps: StepTreeNode[];
  isObligatory?: boolean;
}

export interface StepTreeNode {
  stepId: string;
  title: string;
  rank: number;
  minChoices: number;
  maxChoices: number;
  children: ProductTreeNode[];
  image?: string | null;
}

/**
 * Fonction générique et pure pour extraire l'arbre de produit de façon récursive à partir du JSON brut
 */
export function buildProductTree(
  productId: string, 
  data: any, 
  modifierIdContext?: string | null,
  visitedModifierIds: Set<string> = new Set()
): ProductTreeNode {
  
  // 1. Informations générales du produit
  const productRef = data.items?.[productId];
  let name = `Item ${productId}`;
  let price = 0;
  let image = null;

  if (productRef) {
      name = productRef.displayName?.dflt?.nameDef || productRef.trads?.fr || productRef.title || productRef.name || name;
      
      if (typeof productRef.price?.ttc === 'number' && productRef.price.ttc > 0) {
         price = productRef.price.ttc;
      } else if (typeof productRef.price?.dflt === 'number' && productRef.price.dflt > 0) {
         price = productRef.price.dflt;
      } else if (productRef.price?.advanced && typeof productRef.price.advanced === 'object') {
         const advKeys = Object.keys(productRef.price.advanced);
         for (const ak of advKeys) {
            if (productRef.price.advanced[ak]?.ttc > 0) {
               price = productRef.price.advanced[ak].ttc;
               break;
            }
         }
      }

      if (productRef.img?.dflt?.img) {
         image = productRef.img.dflt.img;
         if (image === "https://beta-catalogue.etk360.com/no-pictures.svg") image = null;
      } else if (productRef.img?.url) {
         image = productRef.img.url;
      }
  }

  // 2. Identification du modifier
  let activeModifierId = modifierIdContext || null;
  
  // Si aucun modifierId n'est fourni par le contexte parent, on cherche dans la base
  // si un modifier annonce explicitement être rattaché à ce produit via son "uuid-item"
  if (!activeModifierId && data.modifier) {
     for (const [mId, modDef] of Object.entries(data.modifier)) {
        if ((modDef as any)['uuid-item'] === productId) {
           activeModifierId = mId;
           break;
        }
     }
  }
  
  // Rétrocompatibilité (si écrit directement sur l'item)
  if (!activeModifierId && productRef?.modifier) {
     activeModifierId = productRef.modifier;
  }

  const node: ProductTreeNode = {
    productId,
    name,
    price,
    image,
    modifierId: activeModifierId,
    steps: []
  };

  // 2b. Étape Composition de base via basicComp (ingrédients retirables)
  const basicComp = productRef?.basicComp;
  if (basicComp && typeof basicComp === 'object') {
    const ingEntries = Object.entries(basicComp)
      .filter(([, v]: [string, any]) => v?.isVisible !== false)
      .sort(([, a]: [string, any], [, b]: [string, any]) => (a?.rank || 0) - (b?.rank || 0));

    if (ingEntries.length > 0) {
      const compositionStep: StepTreeNode = {
        stepId: `composition_${productId}`,
        title: 'Composition',
        rank: -1,
        minChoices: 0,
        maxChoices: ingEntries.length,
        children: []
      };

      for (const [ingId, ingMeta] of ingEntries as [string, any][]) {
        const ingRef = data.items?.[ingId];
        const ingName = ingRef
          ? (ingRef.displayName?.dflt?.nameDef || ingRef.trads?.fr || ingRef.title || ingRef.name || `Item ${ingId}`)
          : `Item ${ingId}`;

        let ingImage: string | null = null;
        if (ingRef?.img?.dflt?.img && ingRef.img.dflt.img !== 'https://beta-catalogue.etk360.com/no-pictures.svg') {
          ingImage = ingRef.img.dflt.img;
        } else if (ingRef?.img?.url) {
          ingImage = ingRef.img.url;
        }

        compositionStep.children.push({
          productId: ingId,
          name: ingName,
          price: 0,
          image: ingImage,
          modifierId: null,
          steps: [],
          isObligatory: ingMeta?.isObligatory === true
        });
      }

      if (compositionStep.children.length > 0) {
        node.steps.unshift(compositionStep);
      }
    }
  }

  // 3 & 4. Déploiement Anti-boucle
  if (activeModifierId && !visitedModifierIds.has(activeModifierId)) {
      visitedModifierIds.add(activeModifierId);
      const modObj = data.modifier?.[activeModifierId];
      
      if (modObj && modObj.steps) {
         const stepKeys = Object.keys(modObj.steps);
         if (stepKeys.length > 0) {
            const stepsToProcess = stepKeys.map(k => ({ stepId: k, ...modObj.steps[k] }));
            stepsToProcess.sort((a, b) => (a.rank || 0) - (b.rank || 0));

            for (const sNode of stepsToProcess) {
               const stepId = sNode.stepId;
               const stepInfos = data.opt?.[stepId] || data.steps?.[stepId] || {};
               let title = stepInfos.displayName?.dflt?.nameDef || stepInfos.title || "Choix";
               
               let minChoices = stepInfos.minChoices || 0;
               let maxChoices = stepInfos.maxChoices || 1;
               if (sNode.ovr) {
                  if (sNode.ovr.minChoices !== undefined) minChoices = sNode.ovr.minChoices;
                  if (sNode.ovr.maxChoices !== undefined) maxChoices = sNode.ovr.maxChoices;
               }

               let stepImage: string | null = null;
               if (stepInfos.img?.dflt?.img && stepInfos.img.dflt.img !== 'https://beta-catalogue.etk360.com/no-pictures.svg') {
                  stepImage = stepInfos.img.dflt.img;
               } else if (stepInfos.img?.url) {
                  stepImage = stepInfos.img.url;
               }

               const stepNode: StepTreeNode = {
                  stepId,
                  title,
                  rank: sNode.rank || 0,
                  minChoices,
                  maxChoices,
                  children: [],
                  image: stepImage
               };

               // Les items peuvent être dans la surcharge du `modifier` ou dans la définition globale de la `step`
               let itemsMap = sNode.items;
               if (!itemsMap || Object.keys(itemsMap).length === 0) {
                  itemsMap = stepInfos.stepItems || stepInfos.values || stepInfos.items || {};
               }

               if (itemsMap && typeof itemsMap === 'object') {
                  const itemKeys = Object.keys(itemsMap);
                  for (const childProdId of itemKeys) {
                     const itemVal = itemsMap[childProdId];
                     const childModId = typeof itemVal === 'string' ? itemVal : (itemVal && (itemVal as any).modifier ? (itemVal as any).modifier : null);
                     
                     // 5. Récursion avec le branchement du Set pour ne pas bloquer les enfants parallèles
                     const newVisited = new Set(visitedModifierIds);
                     
                     const childObj = buildProductTree(childProdId, data, childModId, newVisited);
                     
                     // Gestion de la surcharge de prix (ovr.priceStep) si applicable
                     // Si le produit ne définit pas directement un prix complet, mais un surcoût dans stepInfos.values
                     const legacyPrice = stepInfos.values?.[childProdId]?.priceStep;
                     if (legacyPrice !== undefined) {
                         childObj.price = Number(legacyPrice) || 0;
                     }

                     stepNode.children.push(childObj);
                  }
               }
               
               // Ne lier l'étape au produit que si elle contient réellement des enfants (options)
               // Cela empêche l'apparition d'étapes vides ("fantômes") provenant de la config brute
               if (stepNode.children.length > 0) {
                  node.steps.push(stepNode);
               }
            }
         }
      }
  }

  return node;
}
