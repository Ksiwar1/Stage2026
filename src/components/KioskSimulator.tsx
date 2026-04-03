'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

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
  products: ParsedProduct[];
}

// Extension pour supporter notre étape virtuelle "Menu ou Seul"
export type AppStep = Omit<ParsedStep, 'semanticType'> & { semanticType: string };

function getFunnelSteps(product: ParsedProduct): AppStep[] {
   const steps: AppStep[] = [];
   
   // 1. TAILLE
   steps.push(...product.steps.filter(s => s.semanticType === 'TAILLE'));

   // 2. IS_MENU (Virtuel)
   const hasMenuElements = product.steps.some(s => s.semanticType === 'FRITES' || s.semanticType === 'BOISSON');
   if (hasMenuElements) {
       steps.push({
           id: 'is_menu', title: 'Votre produit complet ou seul ?', semanticType: 'IS_MENU', minChoices: 1, maxChoices: 1,
           options: [
               {id: 'opt_menu', name: 'En Menu (Avec Accompagnements)', priceDelta: 0, image: null},
               {id: 'opt_seul', name: 'Seul', priceDelta: 0, image: null}
           ]
       });
   }
   
   // 3. FRITES
   steps.push(...product.steps.filter(s => s.semanticType === 'FRITES'));
   // 4. SAUCES
   steps.push(...product.steps.filter(s => s.semanticType === 'SAUCES'));
   // 5. BOISSON
   steps.push(...product.steps.filter(s => s.semanticType === 'BOISSON'));
   // 6. DESSERT
   steps.push(...product.steps.filter(s => s.semanticType === 'DESSERT'));
   // 7. EXTRAS & UNKNOWN
   steps.push(...product.steps.filter(s => s.semanticType === 'EXTRAS' || s.semanticType === 'UNKNOWN'));

   return steps;
}


export default function KioskSimulator({ restaurantName, tree }: { restaurantName: string, tree: ParsedCategory[] }) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>(tree[0]?.id || "");
  const activeCategory = tree.find(c => c.id === activeCategoryId);

  // -- PANIER --
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);

  // -- TUNNEL DE COMMANDE --
  const [selectedProduct, setSelectedProduct] = useState<ParsedProduct | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepSelections, setStepSelections] = useState<Record<string, string[]>>({});

  const funnelSteps = useMemo(() => selectedProduct ? getFunnelSteps(selectedProduct) : [], [selectedProduct]);

  // État actuel "En Menu" (si opt_menu a été cliqué dans l'étape IS_MENU)
  // S'il n'y a pas d'étape IS_MENU, on assume 'true' pour que les étapes requises gardent leur minChoices.
  const isMenuSelected = stepSelections['is_menu']?.includes('opt_menu') !== false;

  const startOrder = (product: ParsedProduct) => {
    setSelectedProduct(product);
    setCurrentStepIndex(0);
    // Pré-selection du Menu par défaut si dispo
    const hasMenu = product.steps.some(s => s.semanticType === 'FRITES' || s.semanticType === 'BOISSON');
    setStepSelections(hasMenu ? { 'is_menu': ['opt_menu'] } : {});
  };

  const currentStep = funnelSteps[currentStepIndex];

  // Calcul du minChoices contextuel (Optionnel si "Seul")
  const getContextualMinChoices = (step: AppStep) => {
      if (step.semanticType === 'FRITES' || step.semanticType === 'BOISSON') {
          return isMenuSelected ? Math.max(1, step.minChoices) : 0;
      }
      return step.minChoices;
  };

  const handleOptionClick = (step: AppStep, optId: string) => {
    setStepSelections(prev => {
      const current = prev[step.id] || [];
      if (current.includes(optId)) {
        return { ...prev, [step.id]: current.filter(id => id !== optId) };
      } else {
        if (step.maxChoices === 1) return { ...prev, [step.id]: [optId] };
        else if (current.length < step.maxChoices) return { ...prev, [step.id]: [...current, optId] };
        return prev;
      }
    });
  };

  const calculateCurrentProductTotal = () => {
     if (!selectedProduct) return 0;
     let total = selectedProduct.priceTTC;
     for (const step of funnelSteps) {
        const selIds = stepSelections[step.id] || [];
        for (const optId of selIds) {
           const opt = step.options.find(o => o.id === optId);
           if (opt) total += opt.priceDelta;
        }
     }
     return total;
  };

  const goNextStep = () => {
    const valid = currentStep ? ((stepSelections[currentStep.id] || []).length >= getContextualMinChoices(currentStep)) : true;
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
              
              {/* Stepper visuel abstrait */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                 {funnelSteps.map((_, i) => (
                    <div key={i} style={{ width: '40px', height: '6px', borderRadius: '10px', background: i === currentStepIndex ? '#1A237E' : i < currentStepIndex ? '#10b981' : '#e5e7eb' }}></div>
                 ))}
                 <div style={{ width: '40px', height: '6px', borderRadius: '10px', background: currentStepIndex === funnelSteps.length ? '#1A237E' : '#e5e7eb' }}></div>
              </div>

              {currentStepIndex < funnelSteps.length ? (
                // ---------------- AFFICHAGE DE L'ÉTAPE COURANTE ---------------- 
                <div style={{ animation: 'fadeIn 0.3s' }}>
                  <h3 style={{ fontSize: '1.8rem', color: '#1A237E', marginTop: 0, textTransform: 'uppercase', textAlign: 'center' }}>{currentStep.title}</h3>
                  <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: '2rem', fontSize: '1.1rem' }}>
                    {getContextualMinChoices(currentStep) > 0 ? "Choix obligatoire" : "Optionnel - Vous pouvez passer cette étape"}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', justifyContent: 'center' }}>
                    {currentStep.options.map(opt => {
                      const isSelected = (stepSelections[currentStep.id] || []).includes(opt.id);
                      return (
                        <button key={opt.id} onClick={() => handleOptionClick(currentStep, opt.id)}
                          style={{
                            background: isSelected ? '#ecfdf5' : 'white', border: isSelected ? '3px solid #10b981' : '1px solid #d1d5db',
                            borderRadius: '16px', padding: '1.5rem 1rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center'
                          }}
                        >
                          {opt.image && <img src={opt.image} alt={opt.name} style={{ width: '100px', height: '100px', objectFit: 'contain', marginBottom: '1rem' }} />}
                          <strong style={{ fontSize: '1.2rem', color: '#111827', textTransform: 'uppercase', marginBottom: '0.5rem', textAlign: 'center' }}>{opt.name}</strong>
                          {opt.priceDelta > 0 && <span style={{ background: '#fef3c7', color: '#d97706', padding: '0.3rem 0.8rem', borderRadius: '99px', fontWeight: 'bold' }}>+{opt.priceDelta.toFixed(2)} €</span>}
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
                           const sels = stepSelections[step.id] || [];
                           if (sels.length === 0) return null;
                           return sels.map(sid => {
                               const opt = step.options.find(o => o.id === sid);
                               if (!opt) return null;
                               return <li key={sid} style={{ marginBottom: '0.5rem' }}>{opt.name} {opt.priceDelta > 0 ? `(+${opt.priceDelta.toFixed(2)}€)` : ''}</li>
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
                  {getContextualMinChoices(currentStep) === 0 && (stepSelections[currentStep.id] || []).length === 0 ? "Passer cette étape" : "Suivant →"}
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

      {/* RESTE DE LA PAGE KIOSK (Menu de gauche, Liste, Footer...) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* COLONNE GAUCHE */}
        <div style={{ width: '22%', minWidth: '220px', background: 'white', boxShadow: '2px 0 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {tree.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategoryId(cat.id)}
                style={{
                  width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '1.5rem 1rem', border: 'none', borderBottom: '1px solid #f3f4f6',
                  borderLeft: activeCategoryId === cat.id ? '6px solid #1A237E' : '6px solid transparent',
                  background: activeCategoryId === cat.id ? '#f8f9fa' : 'white',
                  color: activeCategoryId === cat.id ? '#1A237E' : '#4b5563', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <div style={{ width: '60px', height: '60px', marginBottom: '0.8rem', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(cat.title)}&backgroundColor=F39C12&textColor=ffffff&bold=true`} alt={cat.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <strong style={{ fontSize: '1rem', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.5px' }}>{cat.title}</strong>
              </button>
            ))}
          </div>
        </div>

        {/* ZONE PRINCIPALE (Grid produits) */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative' }}>
          
          <div style={{ height: '140px', background: 'linear-gradient(135deg, #F39C12, #E67E22)', padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h1 style={{ color: 'white', margin: 0, fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              {restaurantName}
            </h1>
          </div>

          <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', alignContent: 'start', marginTop: '-40px' }}>
            {activeCategory?.products.map((p, pIndex) => (
              <div key={`${p.id}-${pIndex}`} onClick={() => startOrder(p)}
                style={{ 
                  background: 'white', borderRadius: '16px', position: 'relative', overflow: 'hidden', 
                  boxShadow: '0 8px 20px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', 
                  padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s'
                }}
              >
                <div style={{ width: '100%', height: '220px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem' }}>
                  {p.image ? (
                     // eslint-disable-next-line @next/next/no-img-element
                     <img src={p.image} alt={p.name} style={{ width: '95%', height: '95%', objectFit: 'contain', filter: 'drop-shadow(0 15px 15px rgba(0,0,0,0.15))' }} />
                  ) : <div style={{ width: '100%', height: '100%', background: '#f9fafb', borderRadius: '8px' }}></div>}
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
