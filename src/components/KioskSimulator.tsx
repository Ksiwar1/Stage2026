'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { buildProductTree, ProductTreeNode, StepTreeNode } from '../lib/treeUtils';

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
  modifierId?: string | null;
}

export interface ParsedCategory {
  id: string;
  title: string;
  image?: string | null;
  products: ParsedProduct[];
}

export type AppStep = Omit<ParsedStep, 'semanticType'> & { semanticType: string };


export default function KioskSimulator({ restaurantName, tree, themePalette = { primary: '#F39C12', secondary: '#1A237E', text: '#111827', onPrimary: 'white' }, catalogData }: { restaurantName: string, tree: ParsedCategory[], themePalette?: { primary: string, secondary: string, text: string, onPrimary: string }, catalogData?: any }) {
  const [diningOption, setDiningOption] = useState<'sur_place' | 'emporter' | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(tree[0]?.id || "");
  const activeCategory = tree.find(c => c.id === activeCategoryId);

  // -- PANIER --
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);

  // -- TUNNEL DE COMMANDE (chaque produit a son propre parcours) --
  const [selectedProduct, setSelectedProduct] = useState<ParsedProduct | null>(null);
  const [workflowStack, setWorkflowStack] = useState<{ node: ProductTreeNode; stepIndex: number }[]>([]);
  const [stepSelections, setStepSelections] = useState<Record<string, string[]>>({});

  const activeWorkflow = workflowStack.length > 0 ? workflowStack[workflowStack.length - 1] : null;
  const currentStepIndex = activeWorkflow ? activeWorkflow.stepIndex : 0;
  const funnelSteps = activeWorkflow ? activeWorkflow.node.steps : [];
  const currentStep = funnelSteps[currentStepIndex];
  const isGlobalOptionPhase = currentStep?.semanticType === 'OPTION_GLOBALE';

  // Derive breadcrumb array from workflowStack
  const breadcrumb = workflowStack.flatMap((level, index) => {
    const steps = level.node.steps || [];
    const elements: string[] = [];

    // On affiche le produit de base uniquement à la racine
    if (index === 0) {
       elements.push(level.node.name);
    }

    // On affiche toutes les étapes traversées dans ce niveau, jusqu'à l'étape actuelle
    for (let i = 0; i <= level.stepIndex; i++) {
       if (steps[i] && steps[i].title) {
          elements.push(steps[i].title);
       }
    }

    return elements;
  }).filter(Boolean);

  const setCurrentStepIndex = (newIndex: number | ((prev: number) => number)) => {
     setWorkflowStack(prev => {
        const newStack = [...prev];
        const last = { ...newStack[newStack.length - 1] };
        last.stepIndex = typeof newIndex === 'function' ? newIndex(last.stepIndex) : newIndex;
        newStack[newStack.length - 1] = last;
        return newStack;
     });
  };

  // Pré-sélectionner les ingrédients de composition à chaque nouveau niveau
  useEffect(() => {
    if (workflowStack.length === 0) return;
    const topNode = workflowStack[workflowStack.length - 1].node;
    const compSteps = topNode.steps.filter(s => s.title.toLowerCase() === 'composition');
    if (compSteps.length === 0) return;

    setStepSelections(prev => {
      const updates: Record<string, string[]> = {};
      for (const step of compSteps) {
        if (!prev[step.stepId]) {
          updates[step.stepId] = step.children.map(c => c.productId);
        }
      }
      if (Object.keys(updates).length === 0) return prev;
      return { ...prev, ...updates };
    });
  }, [workflowStack.length]);

  // Fin du retour automatique (laissé à la discrétion de l'utilisateur)

  // Helpers pour convertir les entités abstraites (ParsedProduct) issues de l'AST en ProductTreeNode consu par l'UI
  const mapParsedStepToNode = (step: ParsedStep): StepTreeNode => {
    return {
      stepId: step.id,
      title: step.title,
      rank: 0,
      minChoices: step.minChoices,
      maxChoices: step.maxChoices,
      semanticType: step.semanticType,
      children: step.options.map(mapParsedProductToNode)
    };
  };

  const mapParsedProductToNode = (item: ParsedProduct | ParsedModifier): ProductTreeNode => {
    return {
      productId: item.id,
      name: item.name,
      price: 'priceTTC' in item ? item.priceTTC : item.priceDelta,
      image: item.image,
      modifierId: 'modifierId' in item ? item.modifierId : null,
      steps: ('steps' in item ? item.steps : item.subSteps || []).map(mapParsedStepToNode),
      isObligatory: 'isObligatory' in item ? item.isObligatory : false
    };
  };

  const startOrder = (product: ParsedProduct) => {
    const rootTree = mapParsedProductToNode(product);
    console.log(`\n=== 🌳 PARSED PRODUCT TREE POUR : ${product.name} ===`);
    console.dir(rootTree, { depth: null });

    // Produit simple (pas de parcours) → ajout direct au panier
    if (!rootTree || rootTree.steps.length === 0) {
      setCartCount(prev => prev + 1);
      setCartTotal(prev => prev + product.priceTTC);
      return;
    }

    setSelectedProduct(product);
    setWorkflowStack([{ node: rootTree, stepIndex: 0 }]);

    // Pré-sélectionner les compositions du niveau racine
    const initialSelections: Record<string, string[]> = {};
    for (const step of rootTree.steps) {
      if (step.title.toLowerCase() === 'composition') {
        initialSelections[step.stepId] = step.children.map(c => c.productId);
      }
    }
    setStepSelections(initialSelections);
  };

  const getContextualMinChoices = (step: StepTreeNode) => {
      return step.minChoices;
  };

  const handleOptionClick = (step: StepTreeNode, optId: string) => {
    const optNode = step.children.find(c => c.productId === optId);
    if (!optNode) return;

    setStepSelections(prev => {
      const current = prev[step.stepId] || [];
      const isSelected = current.includes(optId);

      const isComp = step.title.toLowerCase() === 'composition';

      if (isSelected) {
        if (isComp && optNode.isObligatory) return prev;
        return { ...prev, [step.stepId]: current.filter(id => id !== optId) };
      } else {
        if (isComp) {
          return { ...prev, [step.stepId]: [...current, optId] };
        }
        if (current.length >= step.maxChoices && step.maxChoices !== 1) {
           return prev;
        }

        const newSelections = step.maxChoices === 1 ? [optId] : [...current, optId];

        // Si l'option a des sous-étapes, ouvrir son parcours
        if (optNode.steps && optNode.steps.length > 0) {
           Promise.resolve().then(() => {
               setWorkflowStack(oldStack => {
                  const currentTop = oldStack[oldStack.length - 1];
                  // Anti-redondance (double-click ou React Strict mode anomaly)
                  if (currentTop && currentTop.node.productId === optNode.productId) {
                     return oldStack;
                  }
                  return [...oldStack, { node: optNode, stepIndex: 0 }];
               });
           });
        }

        return { ...prev, [step.stepId]: newSelections };
      }
    });
  };

  const calculateCurrentProductTotal = () => {
     if (!selectedProduct) return 0;
     let total = selectedProduct.priceTTC;
     const computePrice = (node: ProductTreeNode) => {
        let nodeTotal = 0;
        for (const step of node.steps) {
           const selIds = stepSelections[step.stepId] || [];
           for (const oId of selIds) {
              const opt = step.children.find(o => o.productId === oId);
              if (opt) {
                 nodeTotal += opt.price || 0;
                 nodeTotal += computePrice(opt);
              }
           }
        }
        return nodeTotal;
     };
     if (workflowStack.length > 0) {
        total += computePrice(workflowStack[0].node);
     }
     return total;
  };

  const goNextStep = () => {
    const valid = currentStep ? ((stepSelections[currentStep.stepId] || []).length >= getContextualMinChoices(currentStep)) : true;
    if (valid) {
       const nextIndex = currentStepIndex + 1;
       if (nextIndex >= funnelSteps.length && workflowStack.length > 1) {
          // Suppression du récapitulatif pour les sous-produits : on remonte directement au parent
          setWorkflowStack(prev => {
             const newStack = prev.slice(0, -1);
             const last = { ...newStack[newStack.length - 1] };
             // On s'assure qu'on n'avance que si le parent n'est pas déjà à la fin
             // Mais si le retour automatique doit avancer le parent ? 
             // Un sous-parcours fait partie d'une étape du parent, valider le sous-parcours ne signifie pas forcément valider l'étape du parent (qui peut nécessiter d'autres choix).
             // On laisse l'utilisateur valider l'étape parente quand il le souhaite.
             // On revient simplement à l'index actuel du parent !
             return newStack;
          });
       } else {
          setCurrentStepIndex(nextIndex);
       }
    } else {
       alert("Veuillez faire les choix obligatoires pour continuer.");
    }
  };

  const confirmProduct = () => {
     if (workflowStack.length > 1) {
        setWorkflowStack(prev => {
           const newStack = prev.slice(0, -1);
           const last = { ...newStack[newStack.length - 1] };
           last.stepIndex = last.stepIndex + 1;
           newStack[newStack.length - 1] = last;
           return newStack;
        });
     } else {
        setCartCount(prev => prev + 1);
        setCartTotal(prev => prev + calculateCurrentProductTotal());
        setSelectedProduct(null);
     }
  };

  if (!diningOption) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%', background: themePalette.primary, fontFamily: 'sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '420px', height: '90%', maxHeight: '700px', background: 'white', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 2rem', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h1 style={{ fontWeight: 900, fontSize: '1.8rem', margin: '0 0 0.2rem 0', color: themePalette.primary, letterSpacing: '0.5px' }}>{restaurantName.toUpperCase()}</h1>
            <p style={{ margin: 0, fontStyle: 'italic', fontSize: '1.1rem', color: themePalette.text, fontFamily: 'cursive' }}>Bienvenue</p>
          </div>

          <h2 style={{ fontSize: '1.3rem', fontWeight: 500, color: themePalette.text, marginBottom: '3rem' }}>Commander ici</h2>

          <div style={{ display: 'flex', gap: '1.5rem', width: '100%', justifyContent: 'center' }}>
            <button 
              onClick={() => setDiningOption('sur_place')}
              style={{ flex: 1, height: '140px', background: '#fafafa', border: `2px solid ${themePalette.primary}`, borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s', padding: '1rem', color: themePalette.primary }}>
                <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍽️</span> 
                <span style={{ fontSize: '1rem', fontWeight: 700 }}>Sur place</span>
            </button>
            <button 
              onClick={() => setDiningOption('emporter')}
              style={{ flex: 1, height: '140px', background: '#fafafa', border: `2px solid ${themePalette.primary}`, borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s', padding: '1rem', color: themePalette.primary }}>
                <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛍️</span>
                <span style={{ fontSize: '1rem', fontWeight: 700 }}>Emporter</span>
            </button>
          </div>

          <div style={{ margin: 'auto 0 2rem 0', width: '100%' }}>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
              <button style={{ flex: 1, padding: '0.6rem', background: 'white', color: themePalette.text, border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>Abandonner</button>
              <button style={{ flex: 1, padding: '0.6rem', background: '#f3f4f6', color: themePalette.text, border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>Retour</button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.65rem', fontWeight: 700, color: themePalette.text }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}><span style={{ fontSize: '1.2rem'}}>🇬🇧</span> English</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}><span style={{ fontSize: '1.2rem'}}>🇫🇷</span> French</div>
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', color: themePalette.text, cursor: 'pointer', fontSize: '1.2rem', opacity: 0.5 }}>
             💡
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ '--color-primary': themePalette.primary, '--color-secondary': themePalette.secondary, '--color-text': themePalette.text, '--color-on-primary': themePalette.onPrimary } as React.CSSProperties}>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#F5F5F0', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* TUNNEL MODAL */}
      {selectedProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', 
          zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'white', width: '90%', maxWidth: '1000px', height: '90vh', borderRadius: '24px',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            position: 'relative'
          }}>
            
            {/* Top Cyan Section */}
            <div style={{ 
                background: 'linear-gradient(to bottom, #defaf1, #9cf1d8)', 
                padding: '2rem 1rem', 
                position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}>
               {/* Controls */}
               <div style={{ position: 'absolute', top: '1rem', right: '1.5rem', display: 'flex', gap: '8px' }}>
                  <button style={{ background: '#d1d5db', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>i</button>
                  <button onClick={() => setSelectedProduct(null)} style={{ background: '#d1d5db', color: '#4b5563', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>✕</button>
               </div>
               
               <h2 style={{ margin: 0, fontSize: '1.6rem', textTransform: 'uppercase', fontWeight: 900, color: '#111827', marginBottom: '2.5rem', textAlign: 'center' }}>{activeWorkflow ? activeWorkflow.node.name : selectedProduct.name}</h2>

               {!isGlobalOptionPhase && (
                 <>
                   {/* Step Icons Row */}
                   <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
                 {funnelSteps.map((s, i) => {
                    const isComp = s.title.toLowerCase().includes('composition');
                    const stepImg = s.image || s.children[0]?.image || null;
                    return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                           <div style={{ width: '80px', height: '60px', background: 'transparent', border: isComp ? 'none' : '2px solid #4b5563', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '8px', position: 'relative', overflow: 'hidden' }}>
                              {isComp ? (
                                 <div style={{ width: '56px', height: '56px', background: '#4b5563', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <line x1="4" y1="6" x2="20" y2="6"></line>
                                      <line x1="4" y1="12" x2="20" y2="12"></line>
                                      <line x1="4" y1="18" x2="20" y2="18"></line>
                                    </svg>
                                 </div>
                              ) : stepImg ? (
                                 <img src={stepImg} alt={s.title}
                                   onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://recette-setting.softavera.com/nopicture.png'; }}
                                   style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
                              ) : (
                                 <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                              )}
                              {!isComp && (
                                 <div style={{ position: 'absolute', bottom: '-10px', right: '-10px', background: '#d1d5db', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                   <span style={{ transform: 'rotate(45deg)', color: '#4b5563', fontWeight: 'bold' }}>+</span>
                                 </div>
                              )}
                           </div>
                           <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#111827', textTransform: 'uppercase' }}>{s.title}</span>
                        </div>
                    );
                 })}
               </div>

               {/* Numeric Stepper Row */}
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '400px' }}>
                 {funnelSteps.map((s, i) => {
                    const isActive = i === currentStepIndex;
                    const isPast = i < currentStepIndex;
                    const isComp = s.title.toLowerCase().includes('composition');
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < funnelSteps.length - 1 ? 1 : 0 }}>
                        {/* Circle */}
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%', 
                          background: (isActive || isPast) ? '#111827' : 'white', 
                          color: (isActive || isPast) ? 'white' : '#9ca3af',
                          border: (isActive || isPast) ? '2px solid #111827' : '2px solid #d1d5db',
                          display: 'flex', justifyContent: 'center', alignItems: 'center',
                          fontWeight: 'bold', fontSize: '1.2rem', zIndex: 2,
                          boxShadow: isActive ? '0 0 0 4px white, 0 0 0 8px rgba(79, 209, 197, 0.5)' : 'none'
                        }}>
                          {isPast ? (
                             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          ) : (
                             i + 1
                          )}
                        </div>
                        {/* Line */}
                        {i < funnelSteps.length - 1 && (
                          <div style={{
                            flex: 1, height: '4px', background: isPast ? '#111827' : 'white',
                            marginLeft: '-4px', marginRight: '-4px', zIndex: 1
                          }} />
                        )}
                      </div>
                    )
                 })}
               </div>
                 </>
               )}
            </div>

            {/* Breadcrumb Section */}
            {!isGlobalOptionPhase && currentStepIndex < funnelSteps.length && (
              <div style={{ padding: '0.5rem 2rem', background: 'white', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', flexWrap: 'wrap', borderBottom: '1px solid #f3f4f6' }}>
                 {breadcrumb.map((bcItem, idx) => {
                    const isLast = idx === breadcrumb.length - 1;
                    return (
                       <React.Fragment key={idx}>
                         {idx > 0 && <span style={{ opacity: 0.5 }}>/</span>}
                         <span style={{
                           background: isLast ? 'var(--color-primary)' : '#f3f4f6',
                           color: isLast ? 'var(--color-on-primary)' : '#374151',
                           padding: '4px 8px',
                           borderRadius: '6px',
                           textTransform: 'uppercase',
                           letterSpacing: '0.5px'
                         }}>{bcItem}</span>
                       </React.Fragment>
                    );
                 })}
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 2rem', background: '#fff', position: 'relative' }}>
              

              {currentStepIndex < funnelSteps.length ? (
                <div style={{ animation: 'fadeIn 0.3s', marginTop: '2.5rem' }}>
                  
                  {/* Instructions */}
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                     <h3 style={{ fontSize: '1.4rem', color: '#111827', margin: '0 0 0.5rem 0' }}>
                        {currentStep.title.toLowerCase().includes('composition') ? "Souhaitez-vous retirer un ingrédient ?" : `Veuillez choisir votre ${currentStep.title}`}
                     </h3>
                     { !currentStep.title.toLowerCase().includes('composition') && (
                       <p style={{ color: '#4b5563', margin: 0, fontWeight: 600 }}>
                          {(stepSelections[currentStep.stepId] || []).length}/{currentStep.maxChoices} sélectionné{(stepSelections[currentStep.stepId] || []).length > 1 ? 's' : ''}
                       </p>
                     )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '2rem', justifyContent: 'center', padding: '0 1rem' }}>
                    {currentStep.children.map(opt => {
                      const isComp = currentStep.title.toLowerCase() === 'composition';
                      const isIncluded = (stepSelections[currentStep.stepId] || []).includes(opt.productId);
                      const isSelected = !isComp && isIncluded;
                      const isLocked = isComp && opt.isObligatory;

                      // Composition : inclus = vert (défaut), retiré = rouge
                      const borderColor = isComp
                        ? (isIncluded ? 'var(--color-primary)' : '#ef4444')
                        : (isSelected ? 'var(--color-primary)' : '#e5e7eb');

                      return (
                        <div key={opt.productId}
                          onClick={() => !isLocked && handleOptionClick(currentStep, opt.productId)}
                          style={{
                            position: 'relative',
                            background: isComp && !isIncluded ? '#fef2f2' : 'white',
                            border: `${isComp || isSelected ? '3px' : '1px'} solid ${borderColor}`,
                            borderRadius: '16px', padding: '1rem',
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                            opacity: isComp && !isIncluded ? 0.6 : 1
                          }}
                        >
                           {/* Badge état top right */}
                           <div style={{ position: 'absolute', top: '10px', right: '10px', width: '30px', height: '30px', borderRadius: '50%', color: 'var(--color-on-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.1rem', fontWeight: 'bold',
                             background: isComp
                               ? (isLocked ? '#9ca3af' : isIncluded ? 'var(--color-primary)' : '#ef4444')
                               : (isSelected ? 'var(--color-primary)' : 'var(--color-secondary)')
                           }}>
                             {isComp ? (isLocked ? '🔒' : isIncluded ? '✓' : '✕') : (isSelected ? '✓' : '+')}
                           </div>

                           {/* Info Icon top left */}
                           <div style={{ position: 'absolute', top: '10px', left: '10px', width: '24px', height: '24px', borderRadius: '50%', background: '#f3f4f6', color: '#9ca3af', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>
                             i
                           </div>



                           <div style={{ height: '140px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
                             {opt.image ? (
                               <img src={opt.image} alt={opt.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://recette-setting.softavera.com/nopicture.png'; }}
                                 style={{ width: '100%', height: '100%', objectFit: 'contain', filter: isComp && !isIncluded ? 'grayscale(1)' : 'none' }} />
                             ) : (
                               <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                             )}
                           </div>
                           <div style={{ textAlign: 'center' }}>
                             <strong style={{ fontSize: '1.1rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem',
                               color: isComp && !isIncluded ? '#9ca3af' : '#111827',
                               textDecoration: isComp && !isIncluded ? 'line-through' : 'none'
                             }}>{opt.name}</strong>
                             {!isComp && opt.price ? <span style={{ color: 'var(--color-text)', fontWeight: 'bold', fontSize: '1.2rem' }}>+{(opt.price || 0).toFixed(2)} €</span> : null}
                           </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // ---------------- RÉCAPITULATIF ---------------- 
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <h2 style={{ fontSize: '2.5rem', color: 'var(--color-text)', marginTop: '1rem' }}>✨ RÉCAPITULATIF</h2>
                  <div style={{ display: 'inline-block', textAlign: 'left', background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minWidth: '400px' }}>
                     <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.4rem' }}>{selectedProduct.name} - {selectedProduct.priceTTC.toFixed(2)}€</h3>
                     <ul style={{ paddingLeft: '1.5rem', color: '#4b5563', fontSize: '1.1rem' }}>
                        {(() => {
                           const renderRecapNode = (node: ProductTreeNode, depth = 0, visited = new Set<string>()): React.ReactElement[] => {
                              if (visited.has(node.productId)) return [];
                              visited.add(node.productId);
                              let elements: React.ReactElement[] = [];
                              for (const step of node.steps) {
                                 if (step.title.toLowerCase() === 'composition') continue; // skip composition in recap
                                 const sels = stepSelections[step.stepId] || [];
                                 for (const sid of sels) {
                                    const opt = step.children.find(o => o.productId === sid);
                                    if (opt) {
                                       const keyStr = `${depth}-${step.stepId}-${sid}-${node.productId}`;
                                       elements.push(<li key={keyStr} style={{ marginBottom: '0.8rem', marginLeft: depth > 0 ? `${depth * 15}px` : '0', listStyleType: depth > 0 ? 'circle' : 'disc' }}>{opt.name} {opt.price > 0 ? `(+${opt.price.toFixed(2)}€)` : ''}</li>);
                                       elements = elements.concat(renderRecapNode(opt, depth + 1, new Set(visited)));
                                    }
                                 }
                              }
                              return elements;
                           };
                           return workflowStack.length > 0 ? renderRecapNode(workflowStack[0].node) : null;
                        })()}
                     </ul>
                     <hr style={{ border: 'none', borderTop: '2px dashed #e5e7eb', margin: '2rem 0' }}/>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-text)' }}>
                        <span>TOTAL</span>
                        <span>{calculateCurrentProductTotal().toFixed(2)} €</span>
                     </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div style={{ padding: '1.5rem 2rem', background: 'white', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button
                  onClick={() => { 
                     if (currentStepIndex > 0) {
                        setCurrentStepIndex(c => (c as number) - 1);
                     } else if (workflowStack.length > 1) {
                        setWorkflowStack(prev => prev.slice(0, -1));
                     }
                  }}
                  style={{ visibility: (currentStepIndex > 0 || workflowStack.length > 1) ? 'visible' : 'hidden', background: '#f3f4f6', padding: '1rem 2rem', borderRadius: '8px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', color: '#4b5563' }}
                >
                  ← Précédent
                </button>
              </div>

              {currentStepIndex < funnelSteps.length ? (
                <button onClick={goNextStep} style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', padding: '1rem 3rem', borderRadius: '8px', border: 'none', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
                  {getContextualMinChoices(currentStep) === 0 && (stepSelections[currentStep.stepId] || []).length === 0 ? "Passer cette étape" : "Suivant →"}
                </button>
              ) : (
                <button onClick={confirmProduct} style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', padding: '1rem 3rem', borderRadius: '8px', border: 'none', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
                  {workflowStack.length > 1 ? "Terminer" : "Valider mon menu"}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
      {/* FIN TUNNEL */}

      {/* HEADER GLOBAL UNIFIÉ (Un seul rectangle sans démarcation) */}
      <div style={{ height: '105px', display: 'flex', flexShrink: 0, background: 'var(--color-primary)', width: '100%', zIndex: 20 }}>
        {/* Partie Gauche alignée avec la colonne Menu */}
        <div style={{ width: '25%', minWidth: '250px', maxWidth: '300px', display: 'flex', alignItems: 'center', padding: '0 2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', textShadow: '0 2px 8px rgba(0,0,0,0.4)', color: 'var(--color-on-primary)' }}>Menu</h2>
        </div>
        {/* Partie Droite alignée avec les articles */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 3rem' }}>
           <h1 style={{ color: 'white', margin: 0, fontSize: '2.2rem', fontWeight: 900, textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              {restaurantName}
           </h1>
        </div>
      </div>

      {/* RESTE DE LA PAGE KIOSK (Menu de gauche, Liste, Footer...) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* COLONNE GAUCHE (Catégories) */}
        <div style={{ width: '25%', minWidth: '250px', maxWidth: '300px', background: '#ffffff', boxShadow: '4px 0 15px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {tree.map(cat => {
              const isActive = activeCategoryId === cat.id;
              
              // Gestion intelligente de l'URL image
              let finalImgUrl = cat.image;
              if (finalImgUrl && !finalImgUrl.startsWith('http')) {
                 if (finalImgUrl.toLowerCase() === 'no-pictures.svg') finalImgUrl = null;
                 else finalImgUrl = `https://beta-catalogue-api.etk360.com/images/${finalImgUrl}`; // Tentative par défaut
              }
              if (!finalImgUrl) finalImgUrl = 'https://recette-setting.softavera.com/nopicture.png';

              return (
                <button key={cat.id} onClick={() => setActiveCategoryId(cat.id)}
                  style={{
                    width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
                    padding: '1.2rem 1.5rem', border: 'none', borderBottom: '1px solid #f1f5f9',
                    borderLeft: isActive ? '6px solid var(--color-primary)' : '6px solid transparent',
                    background: isActive ? '#fffbeb' : 'white',
                    color: isActive ? '#111827' : '#475569', cursor: 'pointer', transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <div style={{ width: '55px', height: '55px', flexShrink: 0, marginRight: '1.2rem', borderRadius: '14px', overflow: 'hidden', background: '#f8fafc', boxShadow: isActive ? '0 4px 10px rgba(230,126,34,0.2)' : 'none', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                       src={finalImgUrl} 
                       alt={cat.title} 
                       onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://recette-setting.softavera.com/nopicture.png'; }}
                       style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} 
                    />
                  </div>
                  <strong style={{ fontSize: '1.05rem', textTransform: 'uppercase', textAlign: 'left', lineHeight: '1.2', fontWeight: isActive ? 800 : 600 }}>
                    {cat.title}
                  </strong>
                </button>
              );
            })}
          </div>
        </div>

        {/* ZONE PRINCIPALE (Grid produits) */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative' }}>
          
          <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', alignContent: 'start', marginTop: '20px' }}>
            {activeCategory?.products.map((p, pIndex) => (
              <div key={`${p.id}-${pIndex}`} onClick={() => startOrder(p)}
                style={{ 
                  background: 'white', borderRadius: '16px', position: 'relative', overflow: 'hidden', 
                  boxShadow: '0 8px 20px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', 
                  padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s'
                }}
              >
                <div style={{ width: '100%', height: '220px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem', padding: '1rem' }}>
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={p.image || 'https://recette-setting.softavera.com/nopicture.png'} alt={p.name} 
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://recette-setting.softavera.com/nopicture.png'; }}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', filter: p.image ? 'drop-shadow(0 15px 15px rgba(0,0,0,0.15))' : 'none' }} />
                </div>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', flexGrow: 1, display: 'flex', flexDirection: 'column', paddingBottom: '0.5rem' }}>
                  <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)', textTransform: 'uppercase', minHeight: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     {p.name || 'Produit inconnu'}
                  </h3>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-text)' }}>{(p.priceTTC || 0).toFixed(2)} €</div>
                  {p.description && <p style={{ margin: '0.8rem 0 0 0', fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.4, opacity: 0.8 }}>{p.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PIED DE PAGE */}
      {/* Footer supprimé à la demande de l'utilisateur */}
    </div>
    </div>
  );
}
