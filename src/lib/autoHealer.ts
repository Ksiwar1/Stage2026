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

  return data;
}
