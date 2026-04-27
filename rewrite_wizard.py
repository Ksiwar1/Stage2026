import re

file_path = "src/app/generer-carte/page.tsx"
with open(file_path, "r") as f:
    original_code = f.read()

# Define the new Form Block
new_form = """        <form onSubmit={handleSubmit} encType="multipart/form-data" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', position: 'relative', overflow: 'hidden', paddingBottom: '2rem' }}>
          <input type="hidden" name="ai_type" value={selectedAI} />
          <input type="hidden" name="sauvegarder" value="on" />

          {/* --- PROGRESS BAR --- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', position: 'relative', padding: '0 1rem' }}>
            <div style={{ position: 'absolute', top: '50%', left: '1rem', right: '1rem', height: '6px', background: '#e2e8f0', borderRadius: '3px', zIndex: 0, transform: 'translateY(-50%)' }}></div>
            <div style={{ position: 'absolute', top: '50%', left: '1rem', width: `calc(${((wizardStep - 1) / 3) * 100}% - 2rem)`, height: '6px', background: 'linear-gradient(90deg, #4f46e5, #0ea5e9)', borderRadius: '3px', zIndex: 0, transform: 'translateY(-50%)', transition: 'width 0.4s ease' }}></div>
            
            {[{ n: 1, label: "Concept" }, { n: 2, label: "Structure" }, { n: 3, label: "Design" }, { n: 4, label: "Préparation" }].map(step => (
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

          <div style={{ display: 'flex', width: '400%', transform: `translateX(-${(wizardStep - 1) * 25}%)`, transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' }}>
            
            {/* ETAPE 1 : CONCEPT DU RESTAURANT */}
            <div style={{ width: '25%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: wizardStep === 1 ? 1 : 0.4, transition: 'opacity 0.5s' }}>
               <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
                   <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', color: '#1e293b', fontSize: '1.2rem' }}>Nom du Restaurant <span style={{color: '#ef4444'}}>*</span></label>
                   <input type="text" name="restaurantName" required value={wizardData.restaurantName} onChange={(e) => setWizardData({...wizardData, restaurantName: e.target.value})} placeholder="Ex: L'Atelier du Burger..." style={{ width: '100%', padding: '1.2rem', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '1.2rem', fontWeight: 600, color: '#0f172a', outline: 'none', transition: 'border 0.2s' }} />
                   
                   <label style={{ display: 'block', fontWeight: 800, margin: '1.5rem 0 0.5rem 0', color: '#1e293b', fontSize: '1.2rem' }}>Type de Restaurant <span style={{color: '#ef4444'}}>*</span></label>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                      {[
                        { label: 'Fast-Food / Burger', icon: '🍔', c: 'fastfood' },
                        { label: 'Pizzeria / Grill', icon: '🍕', c: 'pizzeria' },
                        { label: 'Tacos / Kebab', icon: '🌯', c: 'tacos' },
                        { label: 'Gastronomique', icon: '🍷', c: 'gastronomique' },
                        { label: 'Standard ETK360', icon: '📱', c: 'standard' }
                      ].map(t => (
                        <div key={t.c} onClick={() => setWizardData({...wizardData, typeLabel: t.label, theme: t.c})} style={{ padding: '1rem', background: wizardData.theme === t.c ? '#eef2ff' : '#f8fafc', border: wizardData.theme === t.c ? '2px solid #4f46e5' : '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', transform: wizardData.theme === t.c ? 'translateY(-2px)' : 'none', boxShadow: wizardData.theme === t.c ? '0 10px 15px -3px rgba(79, 70, 229, 0.1)' : 'none' }}>
                           <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{t.icon}</div>
                           <div style={{ fontWeight: 600, fontSize: '0.85rem', color: wizardData.theme === t.c ? '#4f46e5' : '#475569' }}>{t.label}</div>
                        </div>
                      ))}
                   </div>

                   {/* OCR HIDDEN FOR NOW */}
                   <div style={{ marginTop: '2rem', padding: '1.5rem', border: '2px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', background: '#f8fafc', cursor: 'pointer', position: 'relative' }}>
                     <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                       <span style={{ fontSize: '2rem' }}>📸</span>
                       <span style={{ fontWeight: 600, color: '#475569' }}>Scanner une carte papier (OCR)</span>
                       <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Optionnel : L'IA lira votre photo</span>
                       <input type="file" name="menuImage" accept="image/*" onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) { const url = URL.createObjectURL(file); const previewImg = document.getElementById('image-preview') as HTMLImageElement; if (previewImg) { previewImg.src = url; previewImg.style.display = 'block'; } }
                         }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                       />
                     </label>
                     <img id="image-preview" style={{ display: 'none', width: '100%', maxHeight: '150px', objectFit: 'contain', marginTop: '1rem', borderRadius: '8px' }} alt="Aperçu du menu" />
                   </div>
               </div>
               <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                   <button type="button" onClick={() => setWizardStep(2)} disabled={!wizardData.restaurantName || !wizardData.theme} style={{ padding: '1rem 2rem', background: '#4f46e5', color: 'white', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', opacity: (!wizardData.restaurantName || !wizardData.theme) ? 0.5 : 1, transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>Continuer →</button>
               </div>
            </div>

            {/* ETAPE 2 : STRUCTURE METIER */}
            <div style={{ width: '25%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: wizardStep === 2 ? 1 : 0.4, transition: 'opacity 0.5s' }}>
                <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
                   <label style={{ display: 'block', fontWeight: 800, marginBottom: '1rem', color: '#1e293b', fontSize: '1.2rem' }}>Que vendez-vous ? <span style={{color: '#ef4444'}}>*</span></label>
                   
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '2rem' }}>
                      {['Entrées', 'Burgers', 'Pizzas', 'Tacos', 'Kebabs', 'Sandwichs', 'Salades', 'Boissons', 'Desserts', 'Extras'].map(c => {
                          const isSelected = wizardData.categories.includes(c);
                          return (
                             <button type="button" key={c} onClick={() => {
                                 let newCats = [...wizardData.categories];
                                 if (isSelected) newCats = newCats.filter(x => x !== c);
                                 else newCats.push(c);
                                 setWizardData({...wizardData, categories: newCats});
                             }} style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1', background: isSelected ? '#4f46e5' : '#f8fafc', color: isSelected ? 'white' : '#475569', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', boxShadow: isSelected ? '0 4px 10px rgba(79, 70, 229, 0.2)' : 'none' }}>
                                {c}
                             </button>
                          );
                      })}
                   </div>

                   <label style={{ display: 'block', fontWeight: 800, marginBottom: '1rem', color: '#1e293b', fontSize: '1.2rem' }}>Taille du Catalogue (par catégorie)</label>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                       {['3-5', '6-10', '10+'].map(q => (
                         <div key={q} onClick={() => setWizardData({...wizardData, productCountLimit: q})} style={{ padding: '1rem', borderRadius: '12px', border: wizardData.productCountLimit === q ? '2px solid #4f46e5' : '1px solid #cbd5e1', background: wizardData.productCountLimit === q ? '#eef2ff' : '#f8fafc', textAlign: 'center', cursor: 'pointer', fontWeight: 'bold', color: wizardData.productCountLimit === q ? '#4f46e5' : '#64748b' }}>
                            {q} produits
                         </div>
                       ))}
                   </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                   <button type="button" onClick={() => setWizardStep(1)} style={{ padding: '1rem 2rem', background: '#e2e8f0', color: '#475569', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>← Retour</button>
                   <button type="button" onClick={() => setWizardStep(3)} disabled={wizardData.categories.length === 0} style={{ padding: '1rem 2rem', background: '#4f46e5', color: 'white', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', opacity: wizardData.categories.length === 0 ? 0.5 : 1, transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>Continuer →</button>
               </div>
            </div>

            {/* ETAPE 3 : DESIGN & ALLERGENS */}
            <div style={{ width: '25%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: wizardStep === 3 ? 1 : 0.4, transition: 'opacity 0.5s' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                 <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
                    <label style={{ display: 'block', fontWeight: 800, marginBottom: '1rem', color: '#1e293b', fontSize: '1.2rem' }}>Thème Couleurs</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                       {[
                         { name: 'Moderne (Defaut)', p: '#4f46e5', s: '#10b981' },
                         { name: 'Gourmand (Viande/Pizza)', p: '#dc2626', s: '#ea580c' },
                         { name: 'Healthy (Salade)', p: '#16a34a', s: '#84cc16' },
                         { name: 'Élégant (Gastro)', p: '#1e293b', s: '#94a3b8' }
                       ].map(th => (
                          <div key={th.name} onClick={() => setWizardData({...wizardData, primaryColor: th.p, secondaryColor: th.s})} style={{ padding: '1rem', border: wizardData.primaryColor === th.p ? '2px solid '+th.p : '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                             <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: th.p }}></div>
                             <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{th.name}</span>
                          </div>
                       ))}
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                        <input type="checkbox" checked={wizardData.showAllergens} onChange={e => setWizardData({...wizardData, showAllergens: e.target.checked})} style={{ width: '20px', height: '20px', accentColor: '#4f46e5' }} />
                        <span style={{ fontWeight: 600, color: '#334155', fontSize: '1.1rem' }}>Ajouter les allergènes (IA)</span>
                    </label>
                 </div>

                 {/* LIVE PREVIEW BOX */}
                 <div style={{ background: wizardData.primaryColor, borderRadius: '16px', padding: '1.5rem', color: 'white', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: `0 10px 25px -5px ${wizardData.primaryColor}80`, transition: 'background 0.3s' }}>
                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 800, opacity: 0.8 }}>Live Preview</div>
                    <div style={{ height: '120px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'flex-end', padding: '1rem' }}>
                       <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>Bouton Kiosk</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                       <div style={{ height: '40px', flex: 1, background: wizardData.secondaryColor, borderRadius: '8px' }}></div>
                       <div style={{ height: '40px', width: '40px', background: 'white', borderRadius: '8px', opacity: 0.2 }}></div>
                    </div>
                 </div>
               </div>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                   <button type="button" onClick={() => setWizardStep(2)} style={{ padding: '1rem 2rem', background: '#e2e8f0', color: '#475569', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>← Retour</button>
                   <button type="button" onClick={() => setWizardStep(4)} style={{ padding: '1rem 2rem', background: '#4f46e5', color: 'white', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>Continuer →</button>
               </div>
            </div>

            {/* ETAPE 4 : GENERATION (Recap) */}
            <div style={{ width: '25%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: wizardStep === 4 ? 1 : 0.4, transition: 'opacity 0.5s' }}>
               <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9', textAlign: 'center' }}>
                   <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚀</div>
                   <h2 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.8rem' }}>Prêt à générer</h2>
                   <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '2rem' }}>L'IA va composer une carte intelligente ETK360 avec des vrais visuels Unsplash et les algorithmes sémantiques.</p>
                   
                   <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'#64748b'}}>Nom :</span> <span style={{fontWeight:800}}>{wizardData.restaurantName}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'#64748b'}}>Concept :</span> <span style={{fontWeight:800}}>{wizardData.typeLabel}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'#64748b'}}>Catégories :</span> <span style={{fontWeight:800}}>{wizardData.categories.length}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'#64748b'}}>Taille :</span> <span style={{fontWeight:800}}>{wizardData.productCountLimit} prod/cat</span></div>
                   </div>

                   <button disabled={isGenerating} type="submit" style={{ width: '100%', padding: '1.2rem', background: isGenerating ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #0ea5e9)', color: 'white', borderRadius: '12px', border: 'none', fontSize: '1.3rem', fontWeight: 900, cursor: isGenerating ? 'not-allowed' : 'pointer', transition: 'all 0.3s', boxShadow: isGenerating ? 'none' : '0 10px 25px -5px rgba(79, 70, 229, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                      {isGenerating ? (
                        <><span>⏳</span> {generationStepText}</>
                      ) : (
                        <>Générer la borne <span style={{fontSize:'1.5rem'}}>⚡</span></>
                      )}
                   </button>
               </div>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                   <button type="button" disabled={isGenerating} onClick={() => setWizardStep(3)} style={{ padding: '1rem 2rem', background: '#e2e8f0', color: '#475569', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', opacity: isGenerating ? 0.5 : 1 }}>← Retour</button>
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
    print("Wizard Refactoring Successful.")
else:
    print("Could not locate the form block in page.tsx")
