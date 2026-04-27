import re

file_path = "src/app/generer-carte/page.tsx"
with open(file_path, "r") as f:
    original_code = f.read()

new_form = """        <form onSubmit={handleSubmit} encType="multipart/form-data" style={{ width: '100%', maxWidth: '900px', margin: '0 auto', position: 'relative', overflow: 'hidden', paddingBottom: '2rem' }}>
          <input type="hidden" name="ai_type" value={selectedAI} />
          <input type="hidden" name="sauvegarder" value="on" />

          {/* --- PROGRESS BAR 5 STEPS --- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', position: 'relative', padding: '0 1rem' }}>
            <div style={{ position: 'absolute', top: '50%', left: '1rem', right: '1rem', height: '6px', background: '#e2e8f0', borderRadius: '3px', zIndex: 0, transform: 'translateY(-50%)' }}></div>
            <div style={{ position: 'absolute', top: '50%', left: '1rem', width: `calc(${((wizardStep - 1) / 4) * 100}% - 2rem)`, height: '6px', background: 'linear-gradient(90deg, #4f46e5, #0ea5e9)', borderRadius: '3px', zIndex: 0, transform: 'translateY(-50%)', transition: 'width 0.4s ease' }}></div>
            
            {[{ n: 1, label: "Concept" }, { n: 2, label: "Composition" }, { n: 3, label: "Structure" }, { n: 4, label: "Technique" }, { n: 5, label: "Finalisation" }].map(step => (
              <div key={step.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                <div 
                  onClick={() => step.n <= wizardStep && setWizardStep(step.n)} 
                  style={{ width: '45px', height: '45px', borderRadius: '50%', background: wizardStep >= step.n ? 'linear-gradient(135deg, #4f46e5, #0ea5e9)' : '#f1f5f9', color: wizardStep >= step.n ? 'white' : '#94a3b8', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', cursor: step.n <= wizardStep ? 'pointer' : 'default', transition: 'all 0.3s', boxShadow: wizardStep === step.n ? '0 0 0 5px rgba(79, 70, 229, 0.2)' : 'none', border: wizardStep >= step.n ? 'none' : '2px solid #e2e8f0' }}
                >
                  {wizardStep > step.n ? <span style={{fontSize:'1.2rem'}}>✓</span> : step.n}
                </div>
                <span style={{ position: 'absolute', top: '55px', fontSize: '0.8rem', fontWeight: wizardStep === step.n ? 700 : 500, color: wizardStep === step.n ? '#1e293b' : '#64748b', whiteSpace: 'nowrap' }}>{step.label}</span>
              </div>
            ))}
          </div>

          {/* DRAGGABLE CONTAINER (5 STEPS = 500% width, 20% each) */}
          <div style={{ display: 'flex', width: '500%', transform: `translateX(-${(wizardStep - 1) * 20}%)`, transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' }}>
            
            {/* ETAPE 1 : CONCEPT DU RESTAURANT */}
            <div style={{ width: '20%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: wizardStep === 1 ? 1 : 0.4, transition: 'opacity 0.5s' }}>
               <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
                   <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', color: '#1e293b', fontSize: '1.2rem' }}>Nom de l'enseigne <span style={{color: '#ef4444'}}>*</span></label>
                   <input type="text" name="restaurantName" required value={wizardData.restaurantName} onChange={(e) => setWizardData({...wizardData, restaurantName: e.target.value})} placeholder="Ex: L'Atelier du Burger..." style={{ width: '100%', padding: '1.2rem', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '1.2rem', fontWeight: 600, color: '#0f172a', outline: 'none', transition: 'border 0.2s', marginBottom: '1.5rem' }} />
                   
                   <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', color: '#1e293b', fontSize: '1.2rem' }}>Langue(s) du catalogue</label>
                   <select value={wizardData.language} onChange={(e) => setWizardData({...wizardData, language: e.target.value})} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', marginBottom: '1.5rem', color: '#334155', background: '#f8fafc' }}>
                       <option>Français</option>
                       <option>English</option>
                       <option>Español</option>
                       <option>Arabe</option>
                       <option>Bilingue FR/EN</option>
                   </select>

                   <label style={{ display: 'block', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1.2rem' }}>Type de Restaurant <span style={{color: '#ef4444'}}>*</span></label>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                      {[
                        { label: 'Fast-Food / Burger', icon: '🍔', c: 'fastfood' },
                        { label: 'Pizzeria / Grill', icon: '🍕', c: 'pizzeria' },
                        { label: 'Tacos / Kebab', icon: '🌯', c: 'tacos' },
                        { label: 'Gastronomique', icon: '🍷', c: 'gastronomique' },
                        { label: 'Standard ETK360', icon: '📱', c: 'standard' }
                      ].map(t => (
                        <div key={t.c} onClick={() => setWizardData({...wizardData, typeLabel: t.label, theme: t.c})} style={{ padding: '1rem', background: wizardData.theme === t.c ? '#eef2ff' : '#f8fafc', border: wizardData.theme === t.c ? '2px solid #4f46e5' : '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', transform: wizardData.theme === t.c ? 'translateY(-2px)' : 'none', boxShadow: wizardData.theme === t.c ? '0 8px 15px -3px rgba(79, 70, 229, 0.1)' : 'none' }}>
                           <div style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>{t.icon}</div>
                           <div style={{ fontWeight: 600, fontSize: '0.85rem', color: wizardData.theme === t.c ? '#4f46e5' : '#475569' }}>{t.label}</div>
                        </div>
                      ))}
                   </div>
               </div>
               <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                   <button type="button" onClick={() => setWizardStep(2)} disabled={!wizardData.restaurantName || !wizardData.theme} style={{ padding: '1rem 2rem', background: '#4f46e5', color: 'white', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', opacity: (!wizardData.restaurantName || !wizardData.theme) ? 0.5 : 1, transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>Continuer →</button>
               </div>
            </div>

            {/* ETAPE 2 : LOGIQUE DE VENTE */}
            <div style={{ width: '20%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: wizardStep === 2 ? 1 : 0.4, transition: 'opacity 0.5s' }}>
                <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
                   <label style={{ display: 'block', fontWeight: 800, marginBottom: '1rem', color: '#1e293b', fontSize: '1.2rem' }}>Formules Automatiques</label>
                   <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.8rem 1.2rem', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', flex: 1 }}>
                          <input type="checkbox" checked={wizardData.formulas.isMenu} onChange={e => setWizardData({...wizardData, formulas: {...wizardData.formulas, isMenu: e.target.checked}})} style={{ width: '20px', height: '20px', accentColor: '#4f46e5' }} />
                          <span style={{ fontWeight: 600 }}>Taille Standard (+{wizardData.formulas.menuPrice}€)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.8rem 1.2rem', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', flex: 1 }}>
                          <input type="checkbox" checked={wizardData.formulas.isMaxi} onChange={e => setWizardData({...wizardData, formulas: {...wizardData.formulas, isMaxi: e.target.checked}})} style={{ width: '20px', height: '20px', accentColor: '#4f46e5' }} />
                          <span style={{ fontWeight: 600 }}>Taille Maxi (+{wizardData.formulas.maxiPrice}€)</span>
                      </label>
                   </div>

                   <label style={{ display: 'block', fontWeight: 800, margin: '2rem 0 1rem 0', color: '#1e293b', fontSize: '1.2rem' }}>Accompagnements (Pour les formules)</label>
                   <input type="text" value={wizardData.accompaniments.list} onChange={e => setWizardData({...wizardData, accompaniments: {...wizardData.accompaniments, list: e.target.value}})} placeholder="Ex: Frites, Potatoes, Salade (séparés par virgule)" style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }} />
                   
                   <label style={{ display: 'block', fontWeight: 800, margin: '2rem 0 1rem 0', color: '#1e293b', fontSize: '1.2rem' }}>Boissons</label>
                   <input type="text" value={wizardData.drinks.list} onChange={e => setWizardData({...wizardData, drinks: {...wizardData.drinks, list: e.target.value}})} placeholder="Coca-Cola, Fanta, Eau Sprite..." style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }} />

                   <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '2rem', background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                        <input type="checkbox" checked={wizardData.compositions.cookingOptions} onChange={e => setWizardData({...wizardData, compositions: {...wizardData.compositions, cookingOptions: e.target.checked}})} style={{ width: '20px', height: '20px', accentColor: '#4f46e5' }} />
                        <span style={{ fontWeight: 600, color: '#334155' }}>Forcer les choix de cuisson si applicable</span>
                   </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                   <button type="button" onClick={() => setWizardStep(1)} style={{ padding: '1rem 2rem', background: '#e2e8f0', color: '#475569', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>← Retour</button>
                   <button type="button" onClick={() => setWizardStep(3)} style={{ padding: '1rem 2rem', background: '#4f46e5', color: 'white', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>Continuer →</button>
               </div>
            </div>

            {/* ETAPE 3 : STRUCTURE */}
            <div style={{ width: '20%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: wizardStep === 3 ? 1 : 0.4, transition: 'opacity 0.5s' }}>
                <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
                   <label style={{ display: 'block', fontWeight: 800, marginBottom: '1rem', color: '#1e293b', fontSize: '1.2rem' }}>Que vendez-vous ? <span style={{color: '#ef4444'}}>*</span></label>
                   
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.5rem' }}>
                      {['Entrées', 'Burgers', 'Pizzas', 'Tacos', 'Kebabs', 'Sandwichs', 'Salades', 'Boissons', 'Desserts', 'Extras', 'Menus Enfants'].map(c => {
                          const isSelected = wizardData.categories.includes(c);
                          return (
                             <button type="button" key={c} onClick={() => {
                                 let newCats = [...wizardData.categories];
                                 if (isSelected) newCats = newCats.filter(x => x !== c);
                                 else newCats.push(c);
                                 setWizardData({...wizardData, categories: newCats});
                             }} style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1', background: isSelected ? '#4f46e5' : '#f8fafc', color: isSelected ? 'white' : '#475569', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}>
                                {c}
                             </button>
                          );
                      })}
                   </div>

                   <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', color: '#1e293b', fontSize: '1.2rem' }}>Taille (par catégorie)</label>
                   <select value={wizardData.productCountLimit} onChange={(e) => setWizardData({...wizardData, productCountLimit: e.target.value})} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', marginBottom: '1.5rem', color: '#334155' }}>
                       <option>3-5 produits</option>
                       <option>6-10 produits</option>
                       <option>10+ produits (Long format)</option>
                   </select>

                   <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', color: '#1e293b', fontSize: '1.2rem' }}>Règles strictes (Optionnel)</label>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                      {wizardData.categories.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>Sélectionnez des catégories d'abord.</div> : wizardData.categories.map((c) => (
                          <div key={c} style={{ display: 'flex', flexDirection: 'column', background: 'white', padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c} :</span>
                                <input type="text" placeholder="Produits exacts imposés..." value={wizardData.forcedItems[c] || ""} onChange={e => setWizardData({...wizardData, forcedItems: {...wizardData.forcedItems, [c]: e.target.value}})} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: 'none', borderBottom: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }} />
                          </div>
                      ))}
                   </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                   <button type="button" onClick={() => setWizardStep(2)} style={{ padding: '1rem 2rem', background: '#e2e8f0', color: '#475569', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>← Retour</button>
                   <button type="button" onClick={() => setWizardStep(4)} disabled={wizardData.categories.length === 0} style={{ padding: '1rem 2rem', background: '#4f46e5', color: 'white', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', opacity: wizardData.categories.length === 0 ? 0.5 : 1 }}>Continuer →</button>
               </div>
            </div>

            {/* ETAPE 4 : TECHNIQUE & DESIGN */}
            <div style={{ width: '20%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: wizardStep === 4 ? 1 : 0.4, transition: 'opacity 0.5s' }}>
                <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
                   
                   {/* Format */}
                   <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', color: '#1e293b', fontSize: '1.2rem' }}>Format d'affichage cible</label>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      {['Écran kiosque', 'Tablette', 'Impression A4', 'QR Code menu'].map(f => (
                        <button type="button" key={f} onClick={() => setWizardData({...wizardData, outputFormat: f})} style={{ padding: '0.8rem', borderRadius: '8px', border: wizardData.outputFormat === f ? '2px solid #4f46e5' : '1px solid #cbd5e1', background: wizardData.outputFormat === f ? '#eef2ff' : '#f8fafc', cursor: 'pointer', fontWeight: 600, color: wizardData.outputFormat === f ? '#4f46e5' : '#334155' }}>
                          {f}
                        </button>
                      ))}
                   </div>

                   <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', color: '#1e293b', fontSize: '1.2rem' }}>Style global de l'app</label>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                       {[
                         { name: 'Moderne', p: '#4f46e5', s: '#10b981' },
                         { name: 'Gourmand (Viande/Pizza)', p: '#dc2626', s: '#ea580c' },
                         { name: 'Healthy (Salade)', p: '#16a34a', s: '#84cc16' },
                         { name: 'Élégant', p: '#1e293b', s: '#94a3b8' }
                       ].map(th => (
                          <div key={th.name} onClick={() => setWizardData({...wizardData, primaryColor: th.p, secondaryColor: th.s})} style={{ padding: '0.8rem', border: wizardData.primaryColor === th.p ? '2px solid '+th.p : '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                             <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: th.p }}></div>
                             <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{th.name}</span>
                          </div>
                       ))}
                   </div>

                   <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', marginBottom: '0.5rem' }}>
                        <input type="checkbox" checked={wizardData.showAllergens} onChange={e => setWizardData({...wizardData, showAllergens: e.target.checked})} style={{ width: '20px', height: '20px', accentColor: '#4f46e5' }} />
                        <span style={{ fontWeight: 600, color: '#334155' }}>Placer des pastilles allergènes automatiquement</span>
                   </label>
                   
                   <label style={{ display: 'block', fontWeight: 800, margin: '1rem 0 0.5rem 0', color: '#1e293b', fontSize: '1rem' }}>Sémantique Promotionnelle (Badges)</label>
                   <input type="text" value={wizardData.productBadges.join(', ')} onChange={e => setWizardData({...wizardData, productBadges: e.target.value.split(',').map(s=>s.trim())})} placeholder="Ex: NOUVEAU, OFFRE SPECIALE, BEST-SELLER" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />

                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                   <button type="button" onClick={() => setWizardStep(3)} style={{ padding: '1rem 2rem', background: '#e2e8f0', color: '#475569', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>← Retour</button>
                   <button type="button" onClick={() => setWizardStep(5)} style={{ padding: '1rem 2rem', background: '#4f46e5', color: 'white', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>Continuer →</button>
               </div>
            </div>

            {/* ETAPE 5 : GENERATION (Recap) */}
            <div style={{ width: '20%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: wizardStep === 5 ? 1 : 0.4, transition: 'opacity 0.5s' }}>
               <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9', textAlign: 'center' }}>
                   <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚀</div>
                   <h2 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.8rem' }}>Prêt à générer</h2>
                   <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '2rem' }}>L'IA va composer une carte intelligente ETK360 respectant les {wizardData.categories.length} contraintes de catégories configurées.</p>
                   
                   <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'#64748b'}}>Restaurant :</span> <span style={{fontWeight:800}}>{wizardData.restaurantName} ({wizardData.language})</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'#64748b'}}>Concept :</span> <span style={{fontWeight:800}}>{wizardData.typeLabel}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'#64748b'}}>Catégories :</span> <span style={{fontWeight:800}}>{wizardData.categories.length}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'#64748b'}}>Formules :</span> <span style={{fontWeight:800}}>{wizardData.formulas.isMenu ? "Menu/Maxi actifs" : "Seul"}</span></div>
                   </div>

                   <button disabled={isGenerating} type="submit" style={{ width: '100%', padding: '1.2rem', background: isGenerating ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #0ea5e9)', color: 'white', borderRadius: '12px', border: 'none', fontSize: '1.3rem', fontWeight: 900, cursor: isGenerating ? 'not-allowed' : 'pointer', transition: 'all 0.3s', boxShadow: isGenerating ? 'none' : '0 10px 25px -5px rgba(79, 70, 229, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                      {isGenerating ? (
                        <><span>⏳</span> {generationStepText || "Génération..."}</>
                      ) : (
                        <>Générer la carte <span style={{fontSize:'1.5rem'}}>⚡</span></>
                      )}
                   </button>
               </div>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                   <button type="button" disabled={isGenerating} onClick={() => setWizardStep(4)} style={{ padding: '1rem 2rem', background: '#e2e8f0', color: '#475569', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', opacity: isGenerating ? 0.5 : 1 }}>← Modifier les paramètres</button>
               </div>
            </div>

          </div>
        </form>
"""

form_pattern = re.compile(r'<form onSubmit=\{handleSubmit\}.*?</form>', re.DOTALL)
if form_pattern.search(original_code):
    new_code = form_pattern.sub(new_form.replace('\\', '\\\\'), original_code)
    with open(file_path, "w") as f:
        f.write(new_code)
    print("Wizard Refactored back to full precise 5-step.")
else:
    print("Could not locate the form block in page.tsx")
