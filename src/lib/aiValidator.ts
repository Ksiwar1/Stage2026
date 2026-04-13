export function validateETK360Code(jsonString: string): string[] {
  const errors: string[] = [];
  let data: any;

  // 1. Validation syntaxique brute
  try {
    data = JSON.parse(jsonString);
  } catch (err: any) {
    errors.push(`JSON Invalide (Syntax Error) : ${err.message}`);
    return errors;
  }

  // 2. Validation de la racine
  if (!data || typeof data !== 'object') {
    errors.push("Le résultat n'est pas un objet JSON valide.");
    return errors;
  }

  const requiredKeys = ['workflow', 'categories', 'items'];
  for (const k of requiredKeys) {
    if (!data[k] || typeof data[k] !== 'object' || Array.isArray(data[k])) {
      errors.push(`Dictionnaire manquant ou invalide à la racine : '${k}'`);
    }
  }

  if (errors.length > 0) return errors;

  // 2.5 Validation du Workflow (Catégories et Items)
  if (data.workflow) {
    const workflowKeys = Object.keys(data.workflow);
    for (const catKey of workflowKeys) {
      const workflowNode = data.workflow[catKey];
      
      if (!data.categories || !data.categories[catKey]) {
        errors.push(`ERREUR WORKFLOW : La catégorie '${catKey}' est déclarée dans le workflow mais n'existe pas dans le dictionnaire racine 'categories'.`);
      }

      if (workflowNode.content && typeof workflowNode.content === 'object') {
         const contentKeys = Object.keys(workflowNode.content);
         if (contentKeys.length === 0) {
            errors.push(`ERREUR WORKFLOW : La catégorie '${catKey}' dans le workflow est vide (son bloc 'content' ne contient aucun item).`);
         }
         for (const itemKey of contentKeys) {
            if (!data.items || !data.items[itemKey]) {
               errors.push(`ERREUR WORKFLOW : L'item '${itemKey}' est placé dans le workflow de la catégorie '${catKey}', mais il n'existe pas dans le dictionnaire racine 'items'.`);
            }
         }
      } else {
         errors.push(`ERREUR WORKFLOW : La catégorie '${catKey}' dans le workflow est mal formée (il lui manque un dictionnaire 'content' listant ses items).`);
      }
    }
  }

  // 3. Validation des liaisons Items -> Modifiers
  const itemKeys = Object.keys(data.items || {});
  let atLeastOneModifier = false;

  for (const itemKey of itemKeys) {
    const item = data.items[itemKey];
    if (item.modifier) {
       atLeastOneModifier = true;
       // Vérifier que le modifier existe
       if (!data.modifier || !data.modifier[item.modifier]) {
         errors.push(`L'item '${itemKey}' pointe vers un modifier '${item.modifier}' qui n'existe pas dans le dictionnaire 'modifier' racine.`);
       }
    }
    
    // Règle produit "Menu" -> Si le titre indique que c'est un menu complet, on peut exiger un modifier, mais on ne bloque pas brutalement.
  }

  // 4. Validation des Modifiers -> Steps
  if (data.modifier) {
    for (const modKey of Object.keys(data.modifier)) {
      const modifierObj = data.modifier[modKey];
      if (!modifierObj.steps || typeof modifierObj.steps !== 'object' || Object.keys(modifierObj.steps).length === 0) {
        errors.push(`ERREUR ARCHITECTURE : Le modifier '${modKey}' n'a aucune étape ('steps'). Tu dois lui fournir au moins 1 step (ex: choix de boisson/viande).`);
      } else {
        // Validation des clés de Steps
        for (const stepKey of Object.keys(modifierObj.steps)) {
          if (!data.steps || !data.steps[stepKey]) {
            errors.push(`ERREUR DE LIEN : Le modifier '${modKey}' appelle le step '${stepKey}' mais il manque dans le dictionnaire racine 'steps'.`);
          }
        }
      }
    }
  }

  // 5. Validation des Steps -> Options (Min 2 options, items existent)
  if (data.steps) {
    for (const stepKey of Object.keys(data.steps)) {
      const stepObj = data.steps[stepKey];
      
      if (!stepObj.items || typeof stepObj.items !== 'object') {
        errors.push(`RÈGLE D'OPTION : Le step '${stepKey}' n'a pas d'attribut 'items' (choix possibles).`);
        continue;
      }

      const optionKeys = Object.keys(stepObj.items);
      
      // Règle demandée : Chaque step doit avoir au moins 2 options (sinon ce n'est pas un choix)
      if (optionKeys.length < 2) {
        errors.push(`RÈGLE MÉTIER : Le step ou étape '${stepKey}' n'a que ${optionKeys.length} option(s). Il FAUT STRICTEMENT au minimum 2 choix (ajoute des produits supplémentaires dans ce step et assure toi de les définir dans la racine 'items').`);
      }

      // Règle d'intégrité : Tous les ID du step DOIVENT exister dans la racine items
      for (const optKey of optionKeys) {
        if (!data.items[optKey]) {
           errors.push(`RÈGLE D'IDENTIFIANT : Le produit fantôme '${optKey}' est utilisé comme choix dans le step '${stepKey}', MAIS IL N'EXISTE PAS dans la déclaration principale 'items'. Tu dois entièrement définir ce produit avec un prix et un titre dans le dictionnaire racine "items".`);
        }
      }
    }
  }

  return errors;
}
