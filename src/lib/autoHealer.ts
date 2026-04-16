export function patchETK360Structure(data: any): any {
  if (!data || typeof data !== "object") return data;

  // Assurer la présence des dictionnaires de base
  if (!data.items) data.items = {};
  if (!data.modifier) data.modifier = {};
  if (!data.steps) data.steps = {};
  if (!data.theme) data.theme = { palette: ["#4F46E5", "#10B981", "#F59E0B"] };

  if (!data.categories) {
    data.categories = {};
    if (data.workflow) {
        Object.keys(data.workflow).forEach(wKey => {
            if (data.workflow[wKey] && data.workflow[wKey].type === 'categories') {
                data.categories[wKey] = {
                    title: data.workflow[wKey].title || wKey,
                    isVisible: true
                };
            }
        });
    }
  }

  // Fonction utilitaire pour générer des IDs uniques robustes
  const generateId = (prefix: string) => `${prefix}_patched_${Math.floor(Math.random() * 1000000)}`;

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
       if (wNode && wNode.content) {
          Object.keys(wNode.content).forEach(itemKey => {
             if (!data.items[itemKey]) {
                let catTitle = "Plate";
                if (data.categories && data.categories[catKey] && data.categories[catKey].content && data.categories[catKey].content.title) {
                   catTitle = data.categories[catKey].content.title;
                }
                const encodedImg = encodeURIComponent(catTitle.trim().replace(/\s+/g, '_'));

                data.items[itemKey] = {
                   id: Math.floor(Math.random() * 900),
                   type: "items",
                   title: `Produit (${catTitle})`,
                   price: { dflt: { ttc: 0 } },
                   img: { dflt: { img: `https://image.pollinations.ai/prompt/${encodedImg}` } }
                };
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

  // 2. REGLE DES ITEMS : Chaque Item a au moins un Modifier
  const itemKeys = Object.keys(data.items);
  for (const itemKey of itemKeys) {
    const item = data.items[itemKey];
    
    if (!item.modifier) {
      // Brancher vers un nouveau modifier
      item.modifier = generateId('mod');
    }

    // Assurer que le modifier pointé EXISTE BIEN
    if (!data.modifier[item.modifier]) {
      data.modifier[item.modifier] = {
        title: "Options pour " + (item.title || "Produit"),
        steps: {}
      };
    }
  }

  // 3. REGLE DES MODIFIERS : Chaque Modifier a au moins un Step
  const modKeys = Object.keys(data.modifier);
  for (const modKey of modKeys) {
    const modifier = data.modifier[modKey];
    
    if (!modifier.steps || typeof modifier.steps !== 'object') {
       modifier.steps = {};
    }

    if (Object.keys(modifier.steps).length === 0) {
      const newStepId = generateId('step');
      modifier.steps[newStepId] = { rank: 1 };
    }

    // Assurer que le step pointé EXISTE BIEN
    for (const stepKey of Object.keys(modifier.steps)) {
       if (!data.steps[stepKey]) {
          data.steps[stepKey] = {
             title: "Étape de Choix",
             minChoices: 1,
             maxChoices: 1,
             items: {}
          };
       }
    }
  }

  // 4. REGLE DES STEPS : Chaque Step a au moins 2 options
  const stepKeys = Object.keys(data.steps);
  for (const stepKey of stepKeys) {
    const step = data.steps[stepKey];
    
    if (!step.items || typeof step.items !== 'object') {
       step.items = {};
    }

    // Sécuriser l'existence des the ghost pointers d'abord
    for (const optId of Object.keys(step.items)) {
       if (!data.items[optId]) {
          data.items[optId] = {
             id: Math.floor(Math.random() * 900) + 1000,
             type: "items",
             title: "Option " + optId.slice(0, 4),
             price: { dflt: { ttc: 0 } }
          };
       }
    }

    // Insérer des options "Patch" si on a moins de 2 options
    let currentOptionsCount = Object.keys(step.items).length;
    let fallbackCounter = 1;
    
    while (currentOptionsCount < 2) {
       const fallbackId = `${stepKey}_opt_${fallbackCounter}`;
       step.items[fallbackId] = {}; // Le pointer
       
       if (!data.items[fallbackId]) {
          data.items[fallbackId] = {
             id: Math.floor(Math.random() * 900) + 5000,
             type: "items",
             title: `Option Standard ${fallbackCounter}`,
             price: { dflt: { ttc: 0 } },
             img: { dflt: { img: "https://image.pollinations.ai/prompt/option" } }
          };
       }
       
       currentOptionsCount++;
       fallbackCounter++;
    }
  }

  return data;
}
