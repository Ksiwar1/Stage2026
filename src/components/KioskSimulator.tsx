'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { buildProductTree, ProductTreeNode, StepTreeNode } from '../lib/treeUtils';

export interface ParsedModifier {
  id: string;
  name: string;
  priceDelta: number;
  image: string | null;
  subSteps?: ParsedStep[];
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

export type AppStep = Omit<ParsedStep, 'semanticType'> & { semanticType: string };

function getDynamicFunnelStepsFromTree(node: ProductTreeNode | null, selections: Record<string, string[]>): StepTreeNode[] {
   if (!node) return [];
   const flatSteps: StepTreeNode[] = [];

   const traverseTree = (currentNode: ProductTreeNode) => {
      if (!currentNode.steps) return;
      for (const step of currentNode.steps) {
         flatSteps.push(step);
         
         const selIds = selections[step.stepId] || [];
         for (const selId of selIds) {
            const childNode = step.children.find(c => c.productId === selId);
            if (childNode) {
               traverseTree(childNode);
            }
         }
      }
   };

   traverseTree(node);
   return flatSteps;
}

export default function KioskSimulator({ restaurantName, tree, themeColor = '#F39C12', catalogData }: { restaurantName: string, tree: ParsedCategory[], themeColor?: string, catalogData?: any }) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>(tree[0]?.id || "");
  const activeCategory = tree.find(c => c.id === activeCategoryId);

  // -- PANIER --
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);

  // -- TUNNEL DE COMMANDE --
  const [selectedProduct, setSelectedProduct] = useState<ParsedProduct | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepSelections, setStepSelections] = useState<Record<string, string[]>>({});

  const pureTree = useMemo(() => {
     return selectedProduct && catalogData ? buildProductTree(selectedProduct.id, catalogData) : null;
  }, [selectedProduct, catalogData]);

  // Le tableau `funnelSteps` est mis à jour DYNAMIQUEMENT chaque fois que `stepSelections` change !
  const funnelSteps = useMemo(() => pureTree ? getDynamicFunnelStepsFromTree(pureTree, stepSelections) : [], [pureTree, stepSelections]);

  const startOrder = (product: ParsedProduct) => {
    // Audit console du nouvel arbre utilitaire brut !
    const rootTree = catalogData ? buildProductTree(product.id, catalogData) : null;
    console.log(`\n=== 🌳 BUILD PRODUCT TREE POUR : ${product.name} ===`);
    console.dir(rootTree, { depth: null });
    
    setSelectedProduct(product);
    setCurrentStepIndex(0);
    setStepSelections({});
  };

  const currentStep = funnelSteps[currentStepIndex];

  const getContextualMinChoices = (step: StepTreeNode) => {
      return step.minChoices;
  };

  const handleOptionClick = (step: StepTreeNode, optId: string) => {
    setStepSelections(prev => {
      const current = prev[step.stepId] || [];
      if (current.includes(optId)) {
        return { ...prev, [step.stepId]: current.filter(id => id !== optId) };
      } else {
        if (step.maxChoices === 1) return { ...prev, [step.stepId]: [optId] };
        else if (current.length < step.maxChoices) return { ...prev, [step.stepId]: [...current, optId] };
        return prev;
      }
    });
  };

  const calculateCurrentProductTotal = () => {
     if (!selectedProduct) return 0;
     let total = selectedProduct.priceTTC;
     for (const step of funnelSteps) {
        const selIds = stepSelections[step.stepId] || [];
        for (const optId of selIds) {
           const opt = step.children.find(o => o.productId === optId);
           if (opt) total += opt.price || 0;
        }
     }
     return total;
  };

  const goNextStep = () => {
    const valid = currentStep ? ((stepSelections[currentStep.stepId] || []).length >= getContextualMinChoices(currentStep)) : true;
    if (valid) setCurrentStepIndex(c => c + 1);
    else alert("Veuillez faire les choix obligatoires pour continuer.");
  };

  const confirmProduct = () => {
     setCartCount(prev => prev + 1);
     setCartTotal(prev => prev + calculateCurrentProductTotal());
     setSelectedProduct(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#F5F5F0', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* TUNNEL MODAL */}
      {selectedProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', 
          zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'white', width: '90%', maxWidth: '1000px', height: '85vh', borderRadius: '24px',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            
            <div style={{ background: 'linear-gradient(135deg, #1A237E, #283593)', color: 'white', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.8rem', textTransform: 'uppercase', fontWeight: 900 }}>{selectedProduct.name}</h2>
              </div>
              <button onClick={() => setSelectedProduct(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '1.5rem', width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', background: '#f9fafb', position: 'relative' }}>
              
              {/* Stepper visuel textuel */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                 {funnelSteps.map((s, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                       <div style={{ width: '50px', height: '6px', borderRadius: '10px', background: i === currentStepIndex ? '#1A237E' : i < currentStepIndex ? '#10b981' : '#e5e7eb' }}></div>
                       <span style={{ fontSize: '0.8rem', marginTop: '0.5rem', textTransform: 'uppercase', fontWeight: i === currentStepIndex ? 800 : 500, color: i === currentStepIndex ? '#1A237E' : i < currentStepIndex ? '#10b981' : '#9ca3af' }}>{s.title}</span>
                    </div>
                 ))}
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '50px', height: '6px', borderRadius: '10px', background: currentStepIndex === funnelSteps.length ? '#1A237E' : '#e5e7eb' }}></div>
                    <span style={{ fontSize: '0.8rem', marginTop: '0.5rem', textTransform: 'uppercase', fontWeight: currentStepIndex === funnelSteps.length ? 800 : 500, color: currentStepIndex === funnelSteps.length ? '#1A237E' : '#9ca3af' }}>Récapitulatif</span>
                 </div>
              </div>

              {currentStepIndex < funnelSteps.length ? (
                // ---------------- AFFICHAGE DE L'ÉTAPE COURANTE ---------------- 
                <div style={{ animation: 'fadeIn 0.3s' }}>
                  <h3 style={{ fontSize: '1.8rem', color: '#1A237E', marginTop: 0, textTransform: 'uppercase', textAlign: 'center' }}>{currentStep.title}</h3>
                  <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: '2rem', fontSize: '1.1rem' }}>
                    {getContextualMinChoices(currentStep) > 0 ? "Choix obligatoire" : "Optionnel - Vous pouvez passer cette étape"}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', justifyContent: 'center' }}>
                    {currentStep.children.map(opt => {
                      const isSelected = (stepSelections[currentStep.stepId] || []).includes(opt.productId);
                      return (
                        <button key={opt.productId} onClick={() => handleOptionClick(currentStep, opt.productId)}
                          style={{
                            background: isSelected ? '#ecfdf5' : 'white', border: isSelected ? '3px solid #10b981' : '1px solid #d1d5db',
                            borderRadius: '16px', padding: '1.5rem 1rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center'
                          }}
                        >
                          {opt.image && <img src={opt.image} alt={opt.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://recette-setting.softavera.com/nopicture.png'; }} style={{ width: '100px', height: '100px', objectFit: 'contain', marginBottom: '1rem' }} />}
                          <strong style={{ fontSize: '1.2rem', color: '#111827', textTransform: 'uppercase', marginBottom: '0.5rem', textAlign: 'center' }}>{opt.name}</strong>
                          {opt.price ? <span style={{ background: '#fef3c7', color: '#d97706', padding: '0.3rem 0.8rem', borderRadius: '99px', fontWeight: 'bold' }}>+{(opt.price || 0).toFixed(2)} €</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // ---------------- RÉCAPITULATIF ---------------- 
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ fontSize: '2.5rem', color: '#1A237E', marginTop: '1rem' }}>✨ RÉCAPITULATIF</h2>
                  <div style={{ display: 'inline-block', textAlign: 'left', background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minWidth: '300px' }}>
                     <h3 style={{ margin: '0 0 1rem 0' }}>{selectedProduct.name} - {selectedProduct.priceTTC.toFixed(2)}€</h3>
                     <ul style={{ paddingLeft: '1.5rem', color: '#4b5563' }}>
                        {funnelSteps.map(step => {
                           const sels = stepSelections[step.stepId] || [];
                           if (sels.length === 0) return null;
                           return sels.map(sid => {
                               const opt = step.children.find(o => o.productId === sid);
                               if (!opt) return null;
                               return <li key={sid} style={{ marginBottom: '0.5rem' }}>{opt.name} {opt.price > 0 ? `(+${opt.price.toFixed(2)}€)` : ''}</li>
                           });
                        })}
                     </ul>
                     <hr style={{ border: 'none', borderTop: '2px dashed #e5e7eb', margin: '1.5rem 0' }}/>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>
                        <span>TOTAL</span>
                        <span>{calculateCurrentProductTotal().toFixed(2)} €</span>
                     </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '1.5rem 2rem', background: 'white', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
              <button 
                onClick={() => { if (currentStepIndex > 0) setCurrentStepIndex(c => c - 1); }}
                style={{ visibility: currentStepIndex > 0 ? 'visible' : 'hidden', background: '#f3f4f6', padding: '1rem 2rem', borderRadius: '50px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', color: '#4b5563' }}
              >
                ← Précédent
              </button>

              {currentStepIndex < funnelSteps.length ? (
                <button onClick={goNextStep} style={{ background: '#1A237E', color: 'white', padding: '1rem 3rem', borderRadius: '50px', border: 'none', fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer' }}>
                  {getContextualMinChoices(currentStep) === 0 && (stepSelections[currentStep.stepId] || []).length === 0 ? "Passer cette étape" : "Suivant →"}
                </button>
              ) : (
                <button onClick={confirmProduct} style={{ background: '#10b981', color: 'white', padding: '1rem 3rem', borderRadius: '50px', border: 'none', fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer' }}>
                  Valider mon menu
                </button>
              )}
            </div>

          </div>
        </div>
      )}
      {/* FIN TUNNEL */}

      {/* HEADER GLOBAL UNIFIÉ (Un seul rectangle sans démarcation) */}
      <div style={{ height: '105px', display: 'flex', flexShrink: 0, background: themeColor, width: '100%', zIndex: 20 }}>
        {/* Partie Gauche alignée avec la colonne Menu */}
        <div style={{ width: '25%', minWidth: '250px', maxWidth: '300px', display: 'flex', alignItems: 'center', padding: '0 2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', textShadow: '0 2px 8px rgba(0,0,0,0.4)', color: 'white' }}>Menu</h2>
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
                    borderLeft: isActive ? `6px solid ${themeColor}` : '6px solid transparent',
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
                  <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '1.25rem', fontWeight: 900, color: '#1A237E', textTransform: 'uppercase', minHeight: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     {p.name || 'Produit inconnu'}
                  </h3>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1A237E' }}>{(p.priceTTC || 0).toFixed(2)} €</div>
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
  );
}
