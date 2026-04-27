'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { buildProductTree, ProductTreeNode, StepTreeNode } from '../lib/treeUtils';
import { useLanguage } from '../lib/LanguageContext';

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

const CategoryButton = React.memo(({ cat, isActive, onClick }: { cat: ParsedCategory, isActive: boolean, onClick: (id: string) => void }) => {
  let finalImgUrl = cat.image;
  if (finalImgUrl && !finalImgUrl.startsWith('http')) {
     if (finalImgUrl.toLowerCase() === 'no-pictures.svg') finalImgUrl = null;
     else finalImgUrl = `https://beta-catalogue-api.etk360.com/images/${finalImgUrl}`;
  }
  if (!finalImgUrl) finalImgUrl = 'https://recette-setting.softavera.com/nopicture.png';

  return (
    <button onClick={() => onClick(cat.id)}
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
        <img loading="lazy" decoding="async" src={finalImgUrl} alt={cat.title} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://recette-setting.softavera.com/nopicture.png'; }} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
      </div>
      <strong style={{ fontSize: '1.05rem', textTransform: 'uppercase', textAlign: 'left', lineHeight: '1.2', fontWeight: isActive ? 800 : 600 }}>
        {cat.title}
      </strong>
    </button>
  );
});
CategoryButton.displayName = 'CategoryButton';

const ProductGridCard = React.memo(({ p, startOrder }: { p: ParsedProduct, startOrder: (p: ParsedProduct) => void }) => {
  const isDataFault = !p.name || p.name.trim() === "";
  return (
    <div onClick={() => !isDataFault && startOrder(p)}
      style={{ 
        background: 'var(--color-surface)', borderRadius: '16px', position: 'relative', overflow: 'hidden', 
        boxShadow: '0 8px 20px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', 
        padding: '1.5rem', cursor: isDataFault ? 'not-allowed' : 'pointer', transition: 'transform 0.2s', zIndex: 10,
        opacity: isDataFault ? 0.6 : 1
      }}
    >
      <div style={{ width: '100%', height: '220px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem', padding: '1rem' }}>
         {/* eslint-disable-next-line @next/next/no-img-element */}
         <img loading="lazy" decoding="async" src={p.image || 'https://recette-setting.softavera.com/nopicture.png'} alt={p.name} 
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://recette-setting.softavera.com/nopicture.png'; }}
              style={{ width: '100%', height: '100%', objectFit: 'contain', filter: p.image && !isDataFault ? 'drop-shadow(0 15px 15px rgba(0,0,0,0.15))' : 'none' }} />
      </div>

      <div style={{ textAlign: 'center', marginTop: '1.5rem', flexGrow: 1, display: 'flex', flexDirection: 'column', paddingBottom: '0.5rem' }}>
        <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)', textTransform: 'uppercase', minHeight: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           {isDataFault ? <span style={{ color: '#ef4444', border: '1px solid #ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.9rem' }}>INDISPONIBLE</span> : p.name}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
           <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-text)' }}>
              {p.priceTTC !== null && p.priceTTC !== undefined ? `${p.priceTTC.toFixed(2)} €` : '—'}
           </div>
           {(!p.steps || p.steps.length === 0) && !isDataFault && (
               <div style={{ background: '#10b981', color: 'white', padding: '4px 10px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 800, boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }}>+ AJOUTER</div>
           )}
        </div>
        {p.description && !isDataFault && <p style={{ margin: '0.8rem 0 0 0', fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.4, opacity: 0.8 }}>{p.description}</p>}
      </div>
    </div>
  );
});
ProductGridCard.displayName = 'ProductGridCard';

const ModifierOptionCard = React.memo(({ opt, isComp, isIncluded, isSelected, isLocked, currentStep, handleOptionClick }: any) => {
  const borderColor = isComp ? (isIncluded ? 'var(--color-primary)' : '#ef4444') : (isSelected ? 'var(--color-primary)' : '#e5e7eb');
  return (
    <div
      onClick={() => !isLocked && handleOptionClick(currentStep, opt.productId)}
      style={{
        position: 'relative',
        background: isComp && !isIncluded ? 'rgba(254, 242, 242, 0.1)' : 'var(--color-surface)',
        border: `${isComp || isSelected ? '3px' : '1px'} solid ${borderColor}`,
        borderRadius: '16px', padding: '1rem',
        cursor: isLocked ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isSelected || (isComp && isIncluded) ? '0 10px 25px rgba(0,0,0,0.1)' : '0 4px 15px rgba(0,0,0,0.05)',
        transform: isSelected || (isComp && isIncluded) ? 'translateY(-4px)' : 'none',
        opacity: isComp && !isIncluded ? 0.6 : 1,
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.transform = 'none' }}
    >
       <div style={{ position: 'absolute', top: '15px', left: '15px', width: '28px', height: '28px', borderRadius: (currentStep.maxChoices === 1 && !isComp) ? '50%' : '8px', color: 'var(--color-on-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1rem', fontWeight: 'bold',
         background: isComp
           ? (isLocked ? '#9ca3af' : isIncluded ? 'var(--color-primary)' : '#ef4444')
           : (isSelected ? 'var(--color-primary)' : 'var(--color-background)'),
         border: isSelected ? 'none' : '2px solid #cbd5e1'
       }}>
         {isComp ? (isLocked ? '🔒' : isIncluded ? '✓' : '') : (isSelected ? '✓' : '')}
       </div>

       <div style={{ position: 'absolute', top: '15px', right: '15px', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(243, 244, 246, 0.8)', color: '#9ca3af', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>
         i
       </div>

       {opt.image && (
         <div style={{ height: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
           {/* eslint-disable-next-line @next/next/no-img-element */}
           <img loading="lazy" decoding="async" src={opt.image} alt={opt.name} onError={(e) => { e.currentTarget.style.display = 'none'; }}
             style={{ width: '100%', height: '100%', objectFit: 'contain', filter: isComp && !isIncluded ? 'grayscale(1)' : 'none' }} />
         </div>
       )}
       <div style={{ textAlign: 'center' }}>
         <strong style={{ fontSize: '1.1rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem',
           color: isComp && !isIncluded ? '#9ca3af' : 'var(--color-text)',
           textDecoration: isComp && !isIncluded ? 'line-through' : 'none'
         }}>{opt.name}</strong>
         {!isComp && opt.price ? <span style={{ color: 'var(--color-text)', fontWeight: 'bold', fontSize: '1.2rem' }}>+{(opt.price || 0).toFixed(2)} €</span> : null}
       </div>
    </div>
  );
});
ModifierOptionCard.displayName = 'ModifierOptionCard';
export default function KioskSimulator({ restaurantName, tree, themePalette = { primary: '#F39C12', secondary: '#1A237E', background: '#F8FAFC', surface: '#FFFFFF', text: '#111827', onPrimary: 'white' }, catalogData }: { restaurantName: string, tree: ParsedCategory[], themePalette?: { primary: string, secondary: string, background?: string, surface?: string, text: string, onPrimary: string }, catalogData?: any }) {
  const { t, lang } = useLanguage();
  const [diningOption, setDiningOption] = useState<'sur_place' | 'emporter' | null>(null);
  const activeCategories = useMemo(() => tree.filter(c => c.products && c.products.length > 0), [tree]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(activeCategories[0]?.id || "");
  const activeCategory = activeCategories.find(c => c.id === activeCategoryId) || activeCategories[0];

  // -- PANIER --
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [showToast, setShowToast] = useState<{name: string, visible: boolean} | null>(null);

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

  const startOrder = React.useCallback((product: ParsedProduct) => {
    
    const rootTree = mapParsedProductToNode(product);

    // FIX UX 1: Achat direct si pas d'options
    if ((!rootTree.steps || rootTree.steps.length === 0) && product.priceTTC !== null) {
      setCartCount(prev => prev + 1);
      setCartTotal(prev => prev + product.priceTTC!);
      setShowToast({ name: product.name, visible: true });
      setTimeout(() => setShowToast(t => t ? { ...t, visible: false } : null), 2500);
      return;
    }

    // Ouverture normale du modal
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
  }, [mapParsedProductToNode]);

  const getContextualMinChoices = (step: StepTreeNode) => {
      return step.minChoices;
  };

  const handleOptionClick = React.useCallback((step: StepTreeNode, optId: string) => {
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
  }, []);

  const calculateCurrentProductTotal = () => {
     if (!selectedProduct) return 0;
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
     if (selectedProduct.priceTTC !== null && selectedProduct.priceTTC !== undefined) {
         total += selectedProduct.priceTTC;
     }
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
          // Suppression du récapitulatif factice pour les sous-composants : on dépile immédiatement !
          setWorkflowStack(prev => prev.slice(0, -1));
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%', 
        width: '100%', 
        background: `radial-gradient(circle at top left, ${themePalette.secondary} 0%, ${themePalette.primary} 100%)`, 
        fontFamily: 'sans-serif',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '40vw', height: '40vw', background: 'white', opacity: 0.1, borderRadius: '50%', filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', bottom: '-15%', left: '-10%', width: '50vw', height: '50vw', background: themePalette.secondary, opacity: 0.4, borderRadius: '50%', filter: 'blur(120px)' }} />

        <div style={{ 
          width: '90%', 
          maxWidth: '550px', 
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: '24px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          padding: '4rem 2.5rem', 
          position: 'relative', 
          boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.3), border: 1px solid rgba(255,255,255,0.5)',
          zIndex: 10
        }}>
          
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h1 style={{ fontWeight: 900, fontSize: '2.4rem', margin: '0 0 0.5rem 0', color: themePalette.secondary, letterSpacing: '-0.5px' }}>{restaurantName.toUpperCase()}</h1>
            <p style={{ margin: 0, fontSize: '1.2rem', color: '#64748b', fontWeight: 500 }}>{t('kiosk_make_choice')}</p>
          </div>

          <div style={{ display: 'flex', gap: '2rem', width: '100%', justifyContent: 'center', marginBottom: '3rem' }}>
            <div 
              onClick={() => setDiningOption('sur_place')}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              style={{ 
                flex: 1, 
                height: '180px', 
                background: '#ffffff', 
                borderRadius: '20px', 
                cursor: 'pointer', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                transition: 'all 0.2s', 
                padding: '1rem', 
                color: themePalette.secondary,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
              }}>
                <span style={{ fontSize: '4rem', marginBottom: '1rem' }}>🍽️</span> 
                <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{t('kiosk_sur_place')}</span>
            </div>
            <div 
              onClick={() => setDiningOption('emporter')}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              style={{ 
                flex: 1, 
                height: '180px', 
                background: '#ffffff', 
                borderRadius: '20px', 
                cursor: 'pointer', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                transition: 'all 0.2s', 
                padding: '1rem', 
                color: themePalette.secondary,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
              }}>
                <span style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛍️</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{t('kiosk_emporter')}</span>
            </div>
          </div>
          
          {/* Language selector moved to main Menu global */}
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      '--color-primary': themePalette.primary, 
      '--color-secondary': themePalette.secondary, 
      '--color-background': themePalette.background, 
      '--color-surface': themePalette.surface, 
      '--color-text': themePalette.text, 
      '--color-on-primary': themePalette.onPrimary 
    } as React.CSSProperties}>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: 'var(--color-background)', fontFamily: catalogData?.themeMetadata?.typeLabel?.toLowerCase().includes('pizza') ? "'Playfair Display', serif" : catalogData?.themeMetadata?.typeLabel?.toLowerCase().includes('gastronomique') ? "'Cinzel', serif" : "'Inter', sans-serif", overflow: 'hidden' }}>
      
      {/* TUNNEL MODAL */}
      {selectedProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', 
          zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'var(--color-surface)', width: '90%', maxWidth: '1000px', height: '90vh', borderRadius: '24px',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            position: 'relative'
          }}>
            
            {/* Top Slim Header */}
            <div style={{ 
                height: '140px', width: '100%', 
                backgroundImage: `url(${selectedProduct?.image})`, 
                backgroundSize: 'cover', backgroundPosition: 'center', 
                position: 'relative', flexShrink: 0 
            }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 100%)', padding: '1.5rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h2 style={{ color: 'white', margin: 0, fontSize: '2.2rem', fontWeight: 900, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{selectedProduct?.name}</h2>
                    <p style={{ color: 'var(--color-primary)', margin: '0.2rem 0 0', fontSize: '1.4rem', fontWeight: 800 }}>{selectedProduct?.priceTTC.toFixed(2)} €</p>
                </div>
               <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
                  <button onClick={() => setSelectedProduct(null)} style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: 'white', border: 'none', borderRadius: '50%', width: '45px', height: '45px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>✕</button>
               </div>
            </div>
            
            <div style={{ padding: '2rem 1.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

               {!isGlobalOptionPhase && (
                 <>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '400px', marginBottom: '2rem' }}>
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
                  
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                     <h3 style={{ fontSize: '1.4rem', color: '#111827', margin: '0 0 0.5rem 0' }}>
                        {currentStep.title.toLowerCase().includes('composition') ? t('modal_composition_remove') : `${t('modal_composition_choose')} ${currentStep.title}`}
                     </h3>
                     { !currentStep.title.toLowerCase().includes('composition') && (
                       <p style={{ color: '#4b5563', margin: 0, fontWeight: 600 }}>
                          {(stepSelections[currentStep.stepId] || []).length}/{currentStep.maxChoices} { (stepSelections[currentStep.stepId] || []).length > 1 ? t('modal_selected_plural') : t('modal_selected') }
                       </p>
                     )}
                  </div>

                  {currentStep.children.length === 0 ? (
                    <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                       <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                         <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                       </svg>
                       <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Aucune option disponible</h3>
                       <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.8 }}>Veuillez passer à l'étape suivante.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '2rem', justifyContent: 'center', padding: '0 1rem' }}>
                      {currentStep.children.map(opt => {
                        const isComp = currentStep.title.toLowerCase() === 'composition';
                      const isIncluded = (stepSelections[currentStep.stepId] || []).includes(opt.productId);
                      const isSelected = !isComp && isIncluded;
                      const isLocked = isComp && opt.isObligatory;

                      return (
                        <ModifierOptionCard 
                           key={opt.productId}
                           opt={opt}
                           isComp={isComp}
                           isIncluded={isIncluded}
                           isSelected={isSelected}
                           isLocked={isLocked}
                           currentStep={currentStep}
                           handleOptionClick={handleOptionClick}
                        />
                      );
                    })}
                  </div>
                  )}
                </div>
              ) : (
                // ---------------- RÉCAPITULATIF ---------------- 
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <h2 style={{ fontSize: '2.5rem', color: 'var(--color-text)', marginTop: '1rem' }}>✨ RÉCAPITULATIF</h2>
                  <div style={{ display: 'inline-block', textAlign: 'left', background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minWidth: '400px' }}>
                     <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.4rem' }}>{selectedProduct.name} - {selectedProduct.priceTTC !== null ? `${selectedProduct.priceTTC.toFixed(2)}€` : '—'}</h3>
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
                  {t('modal_prev')}
                </button>
              </div>

              {currentStepIndex < funnelSteps.length ? (
                <button onClick={goNextStep} style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', padding: '1rem 3rem', borderRadius: '8px', border: 'none', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
                  {getContextualMinChoices(currentStep) === 0 && (stepSelections[currentStep.stepId] || []).length === 0 ? t('modal_skip') : t('modal_next')}
                </button>
              ) : (
                <button onClick={(e) => {
                   const btn = e.currentTarget;
                   btn.style.transform = 'scale(0.95)';
                   setTimeout(() => { btn.style.transform = 'scale(1)'; confirmProduct(); }, 150);
                }} style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', padding: '1rem 3rem', borderRadius: '12px', border: 'none', fontSize: '1.4rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)', transition: 'all 0.15s ease-out', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  {workflowStack.length > 1 ? t('modal_finish') : t('modal_validate')}
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
        {tree.every(cat => !cat.products || cat.products.length === 0) ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', background: '#f8fafc' }}>
            <span style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>⚠️</span>
            <h2 style={{ fontSize: '2.5rem', color: '#1e293b', marginBottom: '1rem', fontWeight: 900 }}>Hors-Sujet</h2>
            <p style={{ fontSize: '1.3rem', color: '#64748b', maxWidth: '700px', lineHeight: '1.6' }}>
                Votre demande ne correspond à aucun produit de la base locale <b>{restaurantName}</b>. Le moteur RAG a bloqué la requête par sécurité pour éviter les hallucinations.
            </p>
          </div>
        ) : (
          <>
        {/* COLONNE GAUCHE (Catégories) */}
        <div style={{ width: '25%', minWidth: '250px', maxWidth: '300px', background: 'var(--color-surface)', boxShadow: '4px 0 15px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeCategories.map(cat => {
              const isActive = activeCategory?.id === cat.id;
              
              return (
                <CategoryButton 
                   key={cat.id} 
                   cat={cat} 
                   isActive={isActive} 
                   onClick={setActiveCategoryId} 
                />
              );
            })}
          </div>
        </div>

        {/* ZONE PRINCIPALE (Grid produits) */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative' }}>
          
          {(!activeCategory?.products || activeCategory.products.length === 0) ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.8 }}>
               <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                 <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                 <line x1="9" y1="3" x2="9" y2="21" />
                 <line x1="3" y1="9" x2="9" y2="9" />
                 <line x1="3" y1="15" x2="9" y2="15" />
               </svg>
               <h3 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Aucun produit disponible</h3>
               <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.8 }}>Cette catégorie ne contient actuellement aucun article.</p>
            </div>
          ) : (
            <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', alignContent: 'start', marginTop: '20px' }}>
              {activeCategory?.products.map((p, pIndex) => {
                const isDataFault = !p.name || p.name.trim() === "";
                
                return (
                  <ProductGridCard 
                     key={`${p.id}-${pIndex}`} 
                     p={p} 
                     startOrder={startOrder} 
                  />
                );
              })}
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {/* PIED DE PAGE */}
      {/* Footer supprimé à la demande de l'utilisateur */}
      {/* Floating Cart Bar (Panier dynamique) */}
      {cartCount > 0 && !selectedProduct && (
         <div style={{ position: 'absolute', bottom: '25px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '800px', background: 'var(--color-secondary)', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', padding: '15px 30px', alignItems: 'center', boxShadow: '0 15px 35px rgba(0,0,0,0.3)', zIndex: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
               <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.8rem' }}>🛒</div>
               <div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>{t('cart_your_order')}</div>
                  <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: 900 }}>{cartCount} {cartCount > 1 ? t('cart_items') : t('cart_item')}</div>
               </div>
            </div>
            <button style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', padding: '12px 28px', borderRadius: '12px', border: 'none', fontSize: '1.3rem', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 8px 15px rgba(0,0,0,0.2)' }}>
               {t('cart_pay')} {cartTotal.toFixed(2)} €
            </button>
         </div>
      )}

      {/* Toast Animé pour feedback d'ajout */}
      <div style={{
         position: 'absolute', top: showToast?.visible ? '30px' : '-100px', left: '50%', transform: 'translateX(-50%)',
         background: '#10b981', color: 'white', padding: '12px 24px', borderRadius: '50px', fontWeight: 800, fontSize: '1rem',
         boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)', transition: 'top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', zIndex: 1000,
         display: 'flex', alignItems: 'center', gap: '10px'
      }}>
         <span style={{ fontSize: '1.3rem' }}>✅</span> {showToast?.name} {t('toast_added')}
      </div>

    </div>
    </div>
  );
}
