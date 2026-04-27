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
  semanticType?: string;
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
      name = productRef.displayName?.dflt?.nameDef;
      
      const p = productRef.price?.dflt;
      if (typeof p === 'number') price = p;
      else if (p && p.ttc) price = p.ttc;

      image = productRef.img?.dflt?.img;
      if (image === "https://dev-catalogue.softavera.com/no-pictures.svg" || image === "no-pictures.svg") image = null;
  }

  let activeModifierId = productRef?.modifier || modifierIdContext || null;

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
        const ingName = ingRef?.displayName?.dflt?.nameDef || `Ingrédient ${ingId}`;

        let ingImage: string | null = ingRef?.img?.dflt?.img || null;
        if (ingImage === 'https://dev-catalogue.softavera.com/no-pictures.svg' || ingImage === "no-pictures.svg") ingImage = null;

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
            const stepsToProcess = stepKeys.map(k => {
               const stepInfos = data.opt?.[k] || data.steps?.[k] || {};
               const localRank = modObj.steps[k]?.rank;
               const extractedRank = localRank !== undefined ? localRank : (stepInfos.rank || 0);
               return { stepId: k, computedRank: extractedRank, ...modObj.steps[k] };
            });
            // On rétablit le tri basé sur le "rank" (le rang configuré dans le catalogue) qui dicte le véritable ordre d'affichage (Exemple : TEST10 avant E1)
            stepsToProcess.sort((a, b) => a.computedRank - b.computedRank);
            for (const sNode of stepsToProcess) {
               const stepId = sNode.stepId;
               const stepInfos = data.opt?.[stepId] || data.steps?.[stepId] || {};
               let title = stepInfos.displayName?.dflt?.nameDef || "Choix";
               
               let minChoices = stepInfos.minChoices || 0;
               let maxChoices = stepInfos.maxChoices || 1;
               if (sNode.ovr) {
                  if (sNode.ovr.minChoices !== undefined) minChoices = sNode.ovr.minChoices;
                  if (sNode.ovr.maxChoices !== undefined) maxChoices = sNode.ovr.maxChoices;
               }

               let stepImage: string | null = stepInfos.img?.dflt?.img || null;
               if (stepImage === 'https://dev-catalogue.softavera.com/no-pictures.svg' || stepImage === "no-pictures.svg") stepImage = null;

               const stepNode: StepTreeNode = {
                  stepId,
                  title,
                  rank: sNode.rank || 0,
                  minChoices,
                  maxChoices,
                  children: [],
                  image: stepImage
               };

               // Les items proviennent nativement et uniquement de `stepItems`
               let itemsMap = stepInfos.stepItems || {};

               if (itemsMap && typeof itemsMap === 'object') {
                  const itemKeys = Object.keys(itemsMap);
                  for (const childProdId of itemKeys) {
                     const itemVal = itemsMap[childProdId];
                     const childModId = typeof itemVal === 'string' ? itemVal : (itemVal && (itemVal as any).modifier ? (itemVal as any).modifier : null);
                     
                     // 5. Récursion avec le branchement du Set pour ne pas bloquer les enfants parallèles
                     const newVisited = new Set(visitedModifierIds);
                     
                     const childObj = buildProductTree(childProdId, data, childModId, newVisited);
                     
                     const itemLegacyPrice = itemsMap[childProdId]?.priceStep;
                     if (itemLegacyPrice !== undefined && itemLegacyPrice > 0) {
                         childObj.price = Number(itemLegacyPrice);
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
