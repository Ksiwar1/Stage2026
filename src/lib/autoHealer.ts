export function patchETK360Structure(data: any): any {
  if (!data || typeof data !== "object") return data;

  // Assurer la présence des dictionnaires de base
  if (!data.items) data.items = {};
  if (!data.modifier) data.modifier = {};
  if (!data.steps) data.steps = {};
  if (!data.theme) data.theme = { palette: ["#4F46E5", "#10B981", "#F59E0B"] };

  // Fonction utilitaire pour générer des IDs uniques robustes
  const generateId = (prefix: string) => `${prefix}_patched_${Math.floor(Math.random() * 1000000)}`;

  // 0. FIX IA HALLUCINATION "NESTED WORKFLOW" (Llama 8B place "categories" et "items" dans "workflow")
  if (data.workflow) {
      const topLevelKeysToUnpack = ['categories', 'items', 'modifier', 'steps', 'theme'];
      topLevelKeysToUnpack.forEach(key => {
          if (data.workflow[key] && typeof data.workflow[key] === 'object') {
              if (!data[key]) data[key] = {};
              Object.assign(data[key], data.workflow[key]);
              
              // Move nested nodes back up if they are workflow category nodes
              if (key === 'categories') {
                  const actualWorkflow: any = {};
                  Object.keys(data.workflow[key]).forEach(catKey => {
                      actualWorkflow[catKey] = data.workflow[key][catKey];
                  });
                  Object.assign(data.workflow, actualWorkflow);
              }
              delete data.workflow[key];
          }
      });
  }

  // 0.B RECONSTRUCTION DES CATÉGORIES MANQUANTES
  if (!data.categories) data.categories = {};
  if (data.workflow) {
      Object.keys(data.workflow).forEach(wKey => {
          if (data.workflow[wKey] && data.workflow[wKey].type === 'categories') {
              if (!data.categories[wKey]) {
                  data.categories[wKey] = {
                      title: data.workflow[wKey].title || wKey,
                      isVisible: true
                  };
              }
          }
      });
  }

  // 1. CHASSE AUX FANTÔMES DANS LE WORKFLOW (Eviter Crash Parseur)
  if (data.workflow) {
    Object.keys(data.workflow).forEach(wKey => {
       const wNode = data.workflow[wKey];
       
       // SÉCURITÉ : L'IA met parfois les items dans un tableau au lieu du dico 'content'
       if (wNode && Array.isArray(wNode.items)) {
          if (!wNode.content) wNode.content = {};
          wNode.items.forEach((itemTitle: string, idx: number) => {
             if (typeof itemTitle === 'string') {
                const safeKey = `item_gen_${itemTitle.replace(/[^a-zA-Z]/g, '').toLowerCase()}`;
                wNode.content[safeKey] = { type: 'items', rank: idx + 1 };
             }
          });
          delete wNode.items;
       }
    });

    Object.keys(data.workflow).forEach(catKey => {
       const wNode = data.workflow[catKey];
       
       if (wNode && wNode.type === 'categories') {
           if (!wNode.content) wNode.content = {};
       }

       if (wNode && wNode.content) {
          Object.keys(wNode.content).forEach(itemKey => {
             // RÈGLE MÉTIER : Suppression des pointeurs fantômes. Pas d'injection artificielle.
             if (!data.items[itemKey]) {
                delete wNode.content[itemKey];
             }
          });
       }
    });

    Object.keys(data.workflow).forEach(wKey => {
      if (data.workflow[wKey].type === "workflow" && Array.isArray(data.workflow[wKey].steps)) {
        // Supprimer manuellement les tentatives d'imbrication désespérées de l'IA (Bug Groq Llama)
        delete data.workflow[wKey].steps;
      }
    });
  }

  // 2. NETTOYAGE DES STEPS : On nettoie les options fantômes
  const stepKeys = Object.keys(data.steps);
  for (const stepKey of stepKeys) {
    const step = data.steps[stepKey];
    
    if (!step.items || typeof step.items !== 'object') {
       step.items = {};
    }

    // Sécuriser l'existence : suppression stricte des pointeurs sans données
    for (const optId of Object.keys(step.items)) {
       if (!data.items[optId]) {
          delete step.items[optId];
       }
    }
  }

  // 3. FAILSAFE ABSOLU : AUCUN PARCOURS GÉNÉRÉ PAR L'IA (Le pire cas)
  // Si l'IA n'a généré aucun step, on force la création d'un parcours générique.
  if (Object.keys(data.steps || {}).length === 0 && Object.keys(data.items || {}).length > 0) {
     // Création des options de secours
     data.items['item_fallback_sans'] = { title: "Sans boisson", price: { dflt: { ttc: 0 } }, img: { dflt: { img: "https://beta-catalogue.etk360.com/no-pictures.svg" } } };
     data.items['item_fallback_coca'] = { title: "Coca-Cola", price: { dflt: { ttc: 2.5 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/coca_cola_glass" } } };
     data.items['item_fallback_eau'] = { title: "Eau Minérale", price: { dflt: { ttc: 2.0 } }, img: { dflt: { img: "https://image.pollinations.ai/prompt/mineral_water_bottle" } } };

     // Création de l'étape de secours
     data.steps['step_fallback_1'] = {
        title: "Souhaitez-vous une boisson ?",
        minChoices: 0,
        maxChoices: 1,
        items: {
           'item_fallback_sans': { rank: 1 },
           'item_fallback_coca': { rank: 2 },
           'item_fallback_eau': { rank: 3 }
        }
     };

     // Création du modifier de secours
     data.modifier['mod_fallback_1'] = {
        steps: {
           'step_fallback_1': { rank: 1 }
        }
     };

     // Parcours du workflow pour dupliquer les items en version "Menu"
     const newItems: any = {};
     if (data.workflow) {
        Object.keys(data.workflow).forEach(wKey => {
           const wNode = data.workflow[wKey];
           if (wNode && wNode.content) {
              const originalItemKeys = Object.keys(wNode.content);
              originalItemKeys.forEach(itemKey => {
                 const originalItem = data.items[itemKey];
                 // Si c'est un produit classique, on crée sa version Menu
                 if (originalItem && !originalItem.title?.toLowerCase().includes('menu') && !originalItem.title?.toLowerCase().includes('boisson')) {
                    const menuKey = `menu_${itemKey}`;
                    
                    // Ajustement du prix du menu (+3€ par rapport au produit seul)
                    let basePrice = 0;
                    if (originalItem.price?.dflt?.ttc) basePrice = originalItem.price.dflt.ttc;
                    else if (typeof originalItem.price === 'number') basePrice = originalItem.price;

                    newItems[menuKey] = {
                       ...originalItem,
                       title: `Menu ${originalItem.title || 'Spécial'}`,
                       price: { dflt: { ttc: basePrice + 3 } },
                       modifier: 'mod_fallback_1'
                    };
                    // Insertion dans le workflow
                    wNode.content[menuKey] = { type: 'items', rank: (wNode.content[itemKey].rank || 0) - 0.5 };
                 }
              });
           }
        });
     }
     Object.assign(data.items, newItems);
  }

  // 4. UPGRADE FORCE: TRANSFORMER LES PLATS SEULS EN MENUS
  // L'utilisateur veut que tous ses Burgers/Pizzas (sans menu explicite) 
  // proposent quand même des accompagnements et des boissons dans leur parcours.
  if (data.workflow && data.steps) {
      let drinkStepId: string | null = null;
      let sideStepId: string | null = null;
      
      // Chercher des steps globaux dans la base
      Object.keys(data.steps).forEach(sId => {
          const sTitle = (data.steps[sId].title || "").toLowerCase();
          if (sTitle.includes("boisson")) drinkStepId = sId;
          else if (sTitle.includes("accompagnement") || sTitle.includes("frite") || sTitle.includes("side")) sideStepId = sId;
      });

      // Si aucun step n'a été trouvé, on les fabrique à partir des produits de la base !
      if (!drinkStepId && data.items) {
          const drinkItems: Record<string, any> = {};
          let rank = 1;
          Object.keys(data.items).forEach(iId => {
              const iTitle = (data.items[iId].title || data.items[iId].displayName?.dflt?.nameDef || "").toLowerCase();
              if (iTitle.includes("coca") || iTitle.includes("fanta") || iTitle.includes("sprite") || iTitle.includes("eau") || iTitle.includes("boisson") || iTitle.includes("jus") || iTitle.includes("oasis") || iTitle.includes("pepsi")) {
                  drinkItems[iId] = { rank: rank++ };
              }
          });
          if (Object.keys(drinkItems).length > 0) {
              drinkStepId = `step_auto_drink_${Math.floor(Math.random() * 1000000)}`;
              data.steps[drinkStepId] = {
                  title: "Choisissez votre boisson",
                  minChoices: 1,
                  maxChoices: 1,
                  stepItems: drinkItems
              };
          }
      }

      if (!sideStepId && data.items) {
          const sideItems: Record<string, any> = {};
          let rank = 1;
          Object.keys(data.items).forEach(iId => {
              const iTitle = (data.items[iId].title || data.items[iId].displayName?.dflt?.nameDef || "").toLowerCase();
              if (iTitle.includes("frite") || iTitle.includes("potatoes") || iTitle.includes("onion") || iTitle.includes("accompagnement") || iTitle.includes("nuggets")) {
                  sideItems[iId] = { rank: rank++ };
              }
          });
          if (Object.keys(sideItems).length > 0) {
              sideStepId = `step_auto_side_${Math.floor(Math.random() * 1000000)}`;
              data.steps[sideStepId] = {
                  title: "Choisissez votre accompagnement",
                  minChoices: 1,
                  maxChoices: 1,
                  stepItems: sideItems
              };
          }
      }

      // Maintenant qu'on a la certitude d'avoir (ou pas) les steps, on les injecte
      if (drinkStepId || sideStepId) {
          Object.keys(data.workflow).forEach(wCatId => {
              const wNode = data.workflow[wCatId];
              if (wNode && wNode.type === 'categories' && wNode.content) {
                  const categoryTitle = (wNode.title || wCatId).toLowerCase();
                  
                  // On cible uniquement les plats principaux (Burgers, Pizzas, Tacos...)
                  if (!categoryTitle.includes("boisson") && !categoryTitle.includes("dessert") && !categoryTitle.includes("accompagnement") && !categoryTitle.includes("sauce") && !categoryTitle.includes("salade")) {
                      Object.keys(wNode.content).forEach(itemId => {
                          const item = data.items[itemId];
                          if (item) {
                              if (!item.modifier) {
                                  const newModId = `mod_auto_${Math.floor(Math.random() * 1000000)}`;
                                  item.modifier = newModId;
                                  data.modifier[newModId] = { steps: {} };
                              }
                              const mod = data.modifier[item.modifier];
                              if (mod) {
                                  if (!mod.steps) mod.steps = {};
                                  
                                  let hasDrink = false;
                                  let hasSide = false;
                                  
                                  Object.keys(mod.steps).forEach(sId => {
                                      const sTitle = (data.steps[sId]?.title || "").toLowerCase();
                                      if (sTitle.includes("boisson")) hasDrink = true;
                                      if (sTitle.includes("accompagnement") || sTitle.includes("frite")) hasSide = true;
                                  });

                                  // Injection silencieuse des steps manquants
                                  if (!hasSide && sideStepId) {
                                      mod.steps[sideStepId] = { rank: 98, items: {} };
                                  }
                                  if (!hasDrink && drinkStepId) {
                                      mod.steps[drinkStepId] = { rank: 99, items: {} };
                                  }
                              }
                          }
                      });
                  }
              }
          });
      }
  }

  return data;
}
