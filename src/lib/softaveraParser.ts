// src/lib/softaveraParser.ts

export interface ParsedModifier {
  id: string;
  name: string;
  priceDelta: number;
  image: string | null;
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
 * Parseur Séquentiel Hybride : 
 * - Workflow ETK360 pour déterminer *seulement* l'ordre des menus principaux (exclut les catégories internes de type SANS).
 * - Algorithme Parent/Rank Strict pour l'intérieur (Produits -> Étapes -> Options).
 */
export function parseETK360Hierarchy(data: any): ParsedCategory[] {
  if (!data || !data.categories || !data.items || typeof data.items !== 'object') return [];

  const tree: ParsedCategory[] = [];

  // ÉTAPE 1 : Extraire UNIQUEMENT les catégories racines et visibles
  const catKeys = Object.keys(data.categories);
  let rawCategories = catKeys.map(k => ({ ...data.categories[k], id: k }))
    .filter(c => {
       if (!c || !c.title || (c.parent && c.parent !== "")) return false;
       if (c.visibilityInfo && c.visibilityInfo.isVisible === false) return false;
       if (c.isVisible === false) return false;
       return true;
    });
    
  // Tri exclusif selon le rang défini dans le fichier JSON (L'ordre natif)
  rawCategories.sort((a, b) => (a.rank || 0) - (b.rank || 0));

  // ÉTAPE 2 : Grouper les articles disponibles selon leur 'parent' ETK (Logique métier du user)
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

    // ➡️ Algorithme User : les produits DOIVENT être triés par rank local (item.rank).
    parentItems.sort((a, b) => (a.rank || 0) - (b.rank || 0));

    for (const item of parentItems) {
      // Ignorer les produits archivés ou explicitement invisibles globaux
      if (item.archive === true) continue;
      if (item.isVisible === false) continue;

      // Nettoyage de la description
      let desc = "";
      if (typeof item.description === 'string') desc = item.description;
      else if (item.description?.dflt?.nameDef) desc = item.description.dflt.nameDef;
      else if (item.desc) desc = item.desc;
      if (desc === "[object Object]") desc = "";

      // Nettoyage de l'image
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

      if (item.steps && Array.isArray(item.steps)) {
        // Logique User : Ne jamais trier ce tableau
        for (const stepId of item.steps) {
           const stepObj = data.opt?.[stepId] || data.steps?.[stepId];
           if (!stepObj) continue;

           const stepTitle = extractBestName(stepObj, stepObj.title || "Choix");
           
           // Déduction sémantique de l'étape
           let sType: 'TAILLE' | 'FRITES' | 'SAUCES' | 'BOISSON' | 'DESSERT' | 'EXTRAS' | 'UNKNOWN' = 'UNKNOWN';
           const t = stepTitle.toLowerCase();
           if (t.includes('taille') || t.includes('format') || t.includes('size')) sType = 'TAILLE';
           else if (t.includes('frite') || t.includes('side') || t.includes('accompagnement')) sType = 'FRITES';
           else if (t.includes('sauce') || t.includes('dip')) sType = 'SAUCES';
           else if (t.includes('boisson') || t.includes('drink')) sType = 'BOISSON';
           else if (t.includes('dessert') || t.includes('glace')) sType = 'DESSERT';
           else sType = 'EXTRAS';

           const stepNode: ParsedStep = {
              id: stepId,
              title: stepTitle,
              minChoices: stepObj.minChoices || 0,
              maxChoices: stepObj.maxChoices || 1,
              semanticType: sType,
              options: []
           };

           // Accéder à `values` (opt), `items` (steps) ou `stepItems` (steps)
           const stepValues = stepObj.values || stepObj.items || stepObj.stepItems;
           if (!stepValues || typeof stepValues !== 'object') continue;

           // ÉTAPE 5 : Parcours des Options
           const valueKeys = Object.keys(stepValues);
           const rawValues = valueKeys.map(k => ({ ...stepValues[k], id: k }));

           // Logique User : L'ordre des options/modifiers est défini par leur sous-attribut 'rank'
           rawValues.sort((a, b) => (a.rank || 0) - (b.rank || 0));

           for (const valObj of rawValues) {
              const optProductRef = data.items[valObj.id];
              const finalOptname = optProductRef ? extractBestName(optProductRef, "Option").trim() : `Item ${valObj.id}`;
              
              let optImg = optProductRef?.img?.dflt?.img || optProductRef?.img?.url || null;
              if (optImg === "https://beta-catalogue.etk360.com/no-pictures.svg") optImg = null;

              stepNode.options.push({
                 id: valObj.id,
                 name: finalOptname,
                 priceDelta: valObj.priceStep || 0,
                 image: optImg
              });
           }

           productNode.steps.push(stepNode);
        }
      }

      // L'ÉTAPE 5B (basicComp) a été supprimée au profit de l'upsell global (Étape 8)

      // ÉTAPE 6 : Résolution de l'affichage à 0€ des Menus Composables
      // Si le prix de base est à 0€ mais que le produit nécessite des étapes obligatoires avec surcoût (ex: Taille)
      if (productNode.priceTTC === 0 && productNode.steps.length > 0) {
         let startingPrice = 0;
         for (const step of productNode.steps) {
            // Si l'étape est obligatoire et contient des options payantes
            if (step.minChoices > 0 && step.options.length > 0) {
               // On cherche l'option la moins chère pour le "À partir de"
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

    // Fallback: si la catégorie n'a pas d'image, on utilise l'image de son premier produit
    if (!categoryNode.image && categoryNode.products.length > 0) {
      const firstImgProduct = categoryNode.products.find(p => p.image);
      if (firstImgProduct) {
        categoryNode.image = firstImgProduct.image;
      }
    }

    if (categoryNode.products.length > 0) {
      tree.push(categoryNode);
    }
  }

  // L'ÉTAPE 7 (Tri sémantique) a été retirée pour respecter le "rank" (rang) natif de la catégorie


  // ÉTAPE 8 : UPSELL GLOBAL SÉLECTIF (Tunnel en 7 étapes intelligent)
  // Collecte des articles disponibles dans la base globale
  let allFrites: ParsedModifier[] = [];
  let allSauces: ParsedModifier[] = [];
  let allBoissons: ParsedModifier[] = [];
  let allDesserts: ParsedModifier[] = [];
  let allExtras: ParsedModifier[] = [];

  for (const cat of tree) {
      const t = cat.title.toLowerCase();
      const mods: ParsedModifier[] = cat.products.map(p => ({
         id: p.id, name: p.name, priceDelta: p.priceTTC, image: p.image
      }));
      
      if (t.includes('frite') || t.includes('accompagnement') || t.includes('side')) allFrites.push(...mods);
      else if (t.includes('sauce') || t.includes('dip')) allSauces.push(...mods);
      else if (t.includes('boisson') || t.includes('drink')) allBoissons.push(...mods);
      else if (t.includes('dessert') || t.includes('glace')) allDesserts.push(...mods);
      else if (t.includes('nugget') || t.includes('snack') || t.includes('tapas') || t.includes('extra') || t.includes('supplément')) allExtras.push(...mods);
  }

  // Injection dans les Plats Principaux (Burgers, Menus, Salades)
  tree.forEach(cat => {
     const ct = cat.title.toLowerCase();
     // On n'injecte pas le tunnel dans les boissons ou les sauces elles-mêmes
     if (ct.includes('boisson') || ct.includes('dessert') || ct.includes('snack') || ct.includes('sauce') || ct.includes('frite') || ct.includes('enfant')) return;

     cat.products.forEach(p => {
        const isMenuCard = p.name.toLowerCase().includes('menu') || p.name.toLowerCase().includes('formule') || ct.includes('menu') || ct.includes('formule');
        const isSalade = p.name.toLowerCase().includes('salad') || ct.includes('salad');
        
        const attachStep = (sType: string, title: string, mods: ParsedModifier[], maxCh: number) => {
           if (mods.length === 0) return;
           if (p.steps.some(s => s.semanticType === sType)) return;
           
           p.steps.push({
               id: `upsell_${sType}`,
               title: title,
               minChoices: 0, 
               maxChoices: maxCh,
               semanticType: sType as any,
               options: mods.map(m => ({
                   ...m,
                   priceDelta: (isMenuCard && (sType === 'FRITES' || sType === 'BOISSON')) ? 0 : m.priceDelta
               }))
           });
        };

        // Si ce n'est PAS une salade, on lui propose des frites et sauces pour frites.
        if (!isSalade) {
            attachStep('FRITES', 'Choisissez vos Frites', allFrites, 1);
            attachStep('SAUCES', 'Des sauces avec ça ?', allSauces, 10);
        }

        // On propose une boisson quoiqu'il arrive (notamment pour la formule salade !)
        attachStep('BOISSON', 'Quelle est votre Boisson ?', allBoissons, 1);
        attachStep('DESSERT', 'Une petite douceur ? (Facultatif)', allDesserts, 1);
        attachStep('EXTRAS', 'Des Extras ? (Facultatif)', allExtras, 10);
     });
  });

  return tree;
}
