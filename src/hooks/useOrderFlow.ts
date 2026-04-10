import { useState, useCallback } from 'react';
import { ParsedProduct, ParsedModifier, ParsedStep } from '../lib/softaveraParser';

export interface WorkflowNode {
  productOrModifier: ParsedProduct | ParsedModifier;
  stepIndex: number;
}

export function useOrderFlow(product: ParsedProduct) {
  const [flowStack, setFlowStack] = useState<WorkflowNode[]>([{ productOrModifier: product, stepIndex: 0 }]);
  
  // sélections indexées par ID d'étape: stepId -> optionIds[]
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  // helpers
  const currentLevel = flowStack[flowStack.length - 1];
  const currentNode = currentLevel.productOrModifier;
  const currentSteps = ('steps' in currentNode ? currentNode.steps : currentNode.subSteps) || [];
  const currentStep = currentSteps[currentLevel.stepIndex] as ParsedStep | undefined;

  // Calcul du Breadcrumb (Fil d'Ariane)
  const breadcrumb = flowStack.flatMap((level, index) => {
    const nodeName = level.productOrModifier.name;
    const steps = ('steps' in level.productOrModifier ? level.productOrModifier.steps : level.productOrModifier.subSteps) || [];
    const stepName = steps[level.stepIndex]?.title || '';
    
    // Le dernier élément n'affiche son étape que si l'on est pas à la fin
    if (index === flowStack.length - 1) {
       return stepName ? [nodeName, stepName] : [nodeName];
    }
    return [nodeName, stepName];
  }).filter(Boolean); // Retire les chaînes vides

  // Est-ce qu'on est sur la dernière étape de toute la hiérarchie ?
  const isFinished = currentStep === undefined && flowStack.length === 1;

  // Initialisation automatique des ingrédients inclus de base (composition)
  const initComposition = useCallback((step: ParsedStep) => {
    if (step.title.toLowerCase() !== 'composition') return;
    if (selections[step.id]) return; // déjà fait

    const defaultSelected = step.options.map(opt => opt.id);
    setSelections(prev => ({ ...prev, [step.id]: defaultSelected }));
  }, [selections]);

  const toggleOption = (stepId: string, option: ParsedModifier, stepMaxChoices: number, isObligatory: boolean = false) => {
    if (isObligatory) return; // Impossible de modifier un choix obligatoire

    let willAdd = false;

    setSelections(prev => {
      const currentSelected = prev[stepId] || [];
      const isAlreadySelected = currentSelected.includes(option.id);

      let newSelected;
      if (isAlreadySelected) {
         newSelected = currentSelected.filter(id => id !== option.id);
         willAdd = false;
      } else {
         if (currentSelected.length >= stepMaxChoices) {
             return prev; // bloqué par le maxChoices
         }
         newSelected = [...currentSelected, option.id];
         willAdd = true;
      }

      return { ...prev, [stepId]: newSelected };
    });

    // Si on vient de cocher et qu'il y a un sous-parcours
    if (willAdd && option.subSteps && option.subSteps.length > 0) {
       // On empile le sous-parcours !
       setTimeout(() => { // timeout local pour laisser React synchroniser le state
         setFlowStack(prev => [...prev, { productOrModifier: option, stepIndex: 0 }]);
       }, 0);
    }
  };

  const nextStep = () => {
    if (!currentStep) return;
    
    const currentSelectedCount = (selections[currentStep.id] || []).length;
    let minReq = currentStep.minChoices;
    
    // Exception pour la composition où tous les choix sont optionnels (0 min de base, maxChoices = nb Ingrédients possibles)
    if (currentStep.title.toLowerCase() === 'composition') minReq = 0;

    const valid = currentSelectedCount >= minReq;
    if (!valid) return; // bloqué

    setFlowStack(prev => {
       const newStack = [...prev];
       const top = newStack[newStack.length - 1];
       const steps = ('steps' in top.productOrModifier ? top.productOrModifier.steps : top.productOrModifier.subSteps) || [];
       
       if (top.stepIndex + 1 < steps.length) {
          // Étape suivante dans le même noeud
          newStack[newStack.length - 1] = { ...top, stepIndex: top.stepIndex + 1 };
       } else {
          // Fin du noeud en cours !
          if (newStack.length === 1) {
             // On passe sur un index qui out-of-bound -> signalera la fin pure (isFinished = true)
             newStack[newStack.length - 1] = { ...top, stepIndex: top.stepIndex + 1 };
          } else {
             // On dépile (retour au parent)
             newStack.pop(); 
          }
       }
       return newStack;
    });
  };

  const prevStep = () => {
    setFlowStack(prev => {
       const newStack = [...prev];
       const top = newStack[newStack.length - 1];
       
       if (top.stepIndex > 0) {
          // Retourner en arrière dans le menu actuel
          newStack[newStack.length - 1] = { ...top, stepIndex: top.stepIndex - 1 };
       } else {
          if (newStack.length > 1) {
             // Dépiler et revenir au menu parent (le retour en arrière annule virtuellement ce qu'on était en train de consulter dans le tiroir)
             newStack.pop();
          }
       }
       return newStack;
    });
  };

  return {
    flowStack,
    currentStep,
    isFinished,
    selections,
    breadcrumb,
    initComposition,
    toggleOption,
    nextStep,
    prevStep
  };
}
