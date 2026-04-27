import re

file_path = "src/app/generer-carte/page.tsx"
with open(file_path, "r") as f:
    content = f.read()

start_marker = "{wizardStep === 3 && ("
# We find the 2nd instance of '{wizardStep === 6 && (' which is now step 8, wait, no, the original file has wizardStep === 6.
end_marker = ")}            </div>"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx) + len(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find step markers")
    import sys
    sys.exit(1)

new_steps = """{wizardStep === 3 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Composition & Cuisson</h3>
                   
                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Ingrédients de base retirables (ex: Laitue, Tomate, Oignon)</label>
                   <input type="text" value={wizardData.compositions.defaultIngredients} onChange={e => setWizardData({...wizardData, compositions: {...wizardData.compositions, defaultIngredients: e.target.value}})} placeholder="Séparés par des virgules" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1.5rem' }} />

                   <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 600, color: '#475569' }}>
                       <input type="checkbox" checked={wizardData.compositions.cookingOptions} onChange={e => setWizardData({...wizardData, compositions: {...wizardData.compositions, cookingOptions: e.target.checked}})} style={{ width: '1.2rem', height: '1.2rem' }} />
                       Proposer des cuissons (Saignant, À point, Bien cuit)
                   </label>

                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Suppléments payants</label>
                   <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                       {wizardData.compositions.customSupplements.map((s, idx) => (
                           <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', background: 'white', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                               <span>{s.name} (+{s.price}€)</span>
                               <button type="button" onClick={() => {
                                   const arr = [...wizardData.compositions.customSupplements];
                                   arr.splice(idx, 1);
                                   setWizardData({...wizardData, compositions: {...wizardData.compositions, customSupplements: arr}});
                               }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                           </div>
                       ))}
                       <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                           <input type="text" placeholder="Ex: Fromage" value={wizardData.compositions.fastSupplementName} onChange={e => setWizardData({...wizardData, compositions: {...wizardData.compositions, fastSupplementName: e.target.value}})} style={{ flex: 2, padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                           <input type="number" step="0.1" placeholder="Prix" value={wizardData.compositions.fastSupplementPrice} onChange={e => setWizardData({...wizardData, compositions: {...wizardData.compositions, fastSupplementPrice: e.target.value}})} style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                           <button type="button" onClick={() => {
                               if (wizardData.compositions.fastSupplementName && wizardData.compositions.fastSupplementPrice) {
                                  setWizardData({...wizardData, compositions: {
                                     ...wizardData.compositions,
                                     customSupplements: [...wizardData.compositions.customSupplements, { name: wizardData.compositions.fastSupplementName, price: parseFloat(wizardData.compositions.fastSupplementPrice) }],
                                     fastSupplementName: "", fastSupplementPrice: ""
                                  }});
                               }
                           }} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '0.5rem 1rem', cursor: 'pointer' }}>Ajouter</button>
                       </div>
                   </div>

                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Badges visuels</label>
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      {['Nouveau 🆕', 'Bestseller ⭐', 'Épicé 🌶️', 'Végétarien 🌱'].map(b => {
                          const isSelected = wizardData.productBadges.includes(b);
                          return (
                             <button type="button" key={b} onClick={() => {
                                 let newB = [...wizardData.productBadges];
                                 if (isSelected) newB = newB.filter(x => x !== b);
                                 else newB.push(b);
                                 setWizardData({...wizardData, productBadges: newB});
                             }} style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: isSelected ? '1px solid #10b981' : '1px solid #cbd5e1', background: isSelected ? '#dcfce7' : '#f8fafc', color: isSelected ? '#065f46' : '#475569', cursor: 'pointer', fontWeight: 500 }}>
                                {b}
                             </button>
                          );
                      })}
                   </div>

                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button type="button" onClick={() => setWizardStep(2)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1', background: 'white' }}>⬅️ Retour</button>
                      <button type="button" onClick={() => setWizardStep(4)} style={{ padding: '0.6rem 1.2rem', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Suivant ➡️</button>
                   </div>
                 </div>
               )}

               {wizardStep === 4 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Formules & Menus</h3>
                   
                   <div style={{ marginBottom: '1.5rem' }}>
                       <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#475569', padding: '1rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                           <input type="checkbox" checked={wizardData.formulas.isSeul} onChange={e => setWizardData({...wizardData, formulas: {...wizardData.formulas, isSeul: e.target.checked}})} style={{ width: '1.2rem', height: '1.2rem' }} />
                           Proposer "Produit Seul" (Prix de base)
                       </label>
                   </div>

                   <div style={{ marginBottom: '1.5rem', padding: '1rem', background: wizardData.formulas.isMenu ? '#eef2ff' : '#f8fafc', border: wizardData.formulas.isMenu ? '2px solid #4f46e5' : '1px solid #cbd5e1', borderRadius: '8px' }}>
                       <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#475569', marginBottom: wizardData.formulas.isMenu ? '1rem' : '0' }}>
                           <input type="checkbox" checked={wizardData.formulas.isMenu} onChange={e => setWizardData({...wizardData, formulas: {...wizardData.formulas, isMenu: e.target.checked}})} style={{ width: '1.2rem', height: '1.2rem' }} />
                           Proposer en "Menu" (+ Boisson & Accompagnement)
                       </label>
                       {wizardData.formulas.isMenu && (
                           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '2rem' }}>
                               <span>Surcoût du menu :</span>
                               <input type="number" step="0.1" value={wizardData.formulas.menuPrice} onChange={e => setWizardData({...wizardData, formulas: {...wizardData.formulas, menuPrice: parseFloat(e.target.value)}})} style={{ width: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                               <span>€</span>
                           </div>
                       )}
                   </div>

                   <div style={{ marginBottom: '1.5rem', padding: '1rem', background: wizardData.formulas.isMaxi ? '#fffbeb' : '#f8fafc', border: wizardData.formulas.isMaxi ? '2px solid #d97706' : '1px solid #cbd5e1', borderRadius: '8px' }}>
                       <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#475569', marginBottom: wizardData.formulas.isMaxi ? '1rem' : '0' }}>
                           <input type="checkbox" checked={wizardData.formulas.isMaxi} onChange={e => setWizardData({...wizardData, formulas: {...wizardData.formulas, isMaxi: e.target.checked}})} style={{ width: '1.2rem', height: '1.2rem' }} />
                           Proposer en "Maxi Menu"
                       </label>
                       {wizardData.formulas.isMaxi && (
                           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '2rem' }}>
                               <span>Surcoût du maxi menu :</span>
                               <input type="number" step="0.1" value={wizardData.formulas.maxiPrice} onChange={e => setWizardData({...wizardData, formulas: {...wizardData.formulas, maxiPrice: parseFloat(e.target.value)}})} style={{ width: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                               <span>€</span>
                           </div>
                       )}
                   </div>

                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button type="button" onClick={() => setWizardStep(3)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1', background: 'white' }}>⬅️ Retour</button>
                      <button type="button" onClick={() => setWizardStep(5)} style={{ padding: '0.6rem 1.2rem', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Suivant ➡️</button>
                   </div>
                 </div>
               )}

               {wizardStep === 5 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Accompagnements Disponibles</h3>
                   
                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Liste globale des accompagnements (pour les menus)</label>
                   <input type="text" value={wizardData.accompaniments.list} onChange={e => setWizardData({...wizardData, accompaniments: {...wizardData.accompaniments, list: e.target.value}})} placeholder="Frites, Potatoes, Salade, Onion Rings..." style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1.5rem' }} />

                   <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 600, color: '#475569' }}>
                       <input type="checkbox" checked={wizardData.accompaniments.hasSizes} onChange={e => setWizardData({...wizardData, accompaniments: {...wizardData.accompaniments, hasSizes: e.target.checked}})} style={{ width: '1.2rem', height: '1.2rem' }} />
                       Proposer des tailles pour les accompagnements
                   </label>

                   {wizardData.accompaniments.hasSizes && (
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                           <div>
                               <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Taille S (+€)</label>
                               <input type="number" step="0.1" value={wizardData.accompaniments.sizeS} onChange={e => setWizardData({...wizardData, accompaniments: {...wizardData.accompaniments, sizeS: parseFloat(e.target.value)}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                           </div>
                           <div>
                               <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Taille M (+€)</label>
                               <input type="number" step="0.1" value={wizardData.accompaniments.sizeM} onChange={e => setWizardData({...wizardData, accompaniments: {...wizardData.accompaniments, sizeM: parseFloat(e.target.value)}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                           </div>
                           <div>
                               <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Taille L (+€)</label>
                               <input type="number" step="0.1" value={wizardData.accompaniments.sizeL} onChange={e => setWizardData({...wizardData, accompaniments: {...wizardData.accompaniments, sizeL: parseFloat(e.target.value)}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                           </div>
                       </div>
                   )}

                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button type="button" onClick={() => setWizardStep(4)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1', background: 'white' }}>⬅️ Retour</button>
                      <button type="button" onClick={() => setWizardStep(6)} style={{ padding: '0.6rem 1.2rem', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Suivant ➡️</button>
                   </div>
                 </div>
               )}

               {wizardStep === 6 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Style Visuel & Couleurs</h3>
                   
                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Thème / Ambiance</label>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      {['Clair', 'Sombre', 'Coloré', 'Épuré'].map(t => (
                        <button type="button" key={t} onClick={() => setWizardData({...wizardData, visualTheme: t})} style={{ padding: '0.8rem', borderRadius: '8px', border: wizardData.visualTheme === t ? '2px solid #4f46e5' : '1px solid #cbd5e1', background: wizardData.visualTheme === t ? '#e0e7ff' : '#f8fafc', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
                          {t}
                        </button>
                      ))}
                   </div>

                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Couleurs Exactes (Optionnel)</label>
                   <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <input type="color" value={wizardData.primaryColor} onChange={e => setWizardData({...wizardData, primaryColor: e.target.value})} style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }} />
                         <span style={{ fontSize: '0.9rem' }}>Primaire</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <input type="color" value={wizardData.secondaryColor} onChange={e => setWizardData({...wizardData, secondaryColor: e.target.value})} style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }} />
                         <span style={{ fontSize: '0.9rem' }}>Secondaire</span>
                      </div>
                   </div>

                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Style de Carte</label>
                   <select value={wizardData.visualStyle} onChange={(e) => setWizardData({...wizardData, visualStyle: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1.5rem' }}>
                       <option>Moderne</option>
                       <option>Classique</option>
                       <option>Minimaliste</option>
                       <option>Bold</option>
                   </select>

                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button type="button" onClick={() => setWizardStep(5)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1', background: 'white' }}>⬅️ Retour</button>
                      <button type="button" onClick={() => setWizardStep(7)} style={{ padding: '0.6rem 1.2rem', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Suivant ➡️</button>
                   </div>
                 </div>
               )}

               {wizardStep === 7 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Format de Sortie & Affichage</h3>
                   
                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Format d'affichage</label>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      {['Écran kiosque', 'Tablette', 'Impression A4', 'QR Code menu'].map(f => (
                        <button type="button" key={f} onClick={() => setWizardData({...wizardData, outputFormat: f})} style={{ padding: '0.8rem', borderRadius: '8px', border: wizardData.outputFormat === f ? '2px solid #4f46e5' : '1px solid #cbd5e1', background: wizardData.outputFormat === f ? '#e0e7ff' : '#f8fafc', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
                          {f}
                        </button>
                      ))}
                   </div>

                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Type de navigation temporelle</label>
                   <select value={wizardData.navigationType} onChange={(e) => setWizardData({...wizardData, navigationType: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1.5rem' }}>
                       <option>Parcours guidé (étapes obligatoires)</option>
                       <option>Menu classique (tout visible catégorisé)</option>
                       <option>Carrousel interactif</option>
                   </select>

                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button type="button" onClick={() => setWizardStep(6)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1', background: 'white' }}>⬅️ Retour</button>
                      <button type="button" onClick={() => setWizardStep(8)} style={{ padding: '0.6rem 1.2rem', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Voir le Récapitulatif ➡️</button>
                   </div>
                 </div>
               )}

               {wizardStep === 8 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b', textAlign: 'center' }}>✨ Récapitulatif & Génération</h3>
                   
                   <div style={{ background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                         <span style={{ color: '#64748b' }}>Restaurant :</span>
                         <span style={{ fontWeight: 600 }}>{wizardData.restaurantName} ({wizardData.language})</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                         <span style={{ color: '#64748b' }}>Type :</span>
                         <span style={{ fontWeight: 600 }}>{wizardData.typeLabel}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                         <span style={{ color: '#64748b' }}>Catégories :</span>
                         <span style={{ fontWeight: 600 }}>{wizardData.categories.length} sections ({wizardData.productCountLimit} prod.)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                         <span style={{ color: '#64748b' }}>Formules :</span>
                         <span style={{ fontWeight: 600 }}>{wizardData.formulas.isMenu ? "Menu OK" : "Seul"}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                         <span style={{ color: '#64748b' }}>Design :</span>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 600 }}>{wizardData.visualTheme} / {wizardData.visualStyle}</span>
                            <div style={{ width: '15px', height: '15px', background: wizardData.primaryColor, borderRadius: '50%' }}></div>
                            <div style={{ width: '15px', height: '15px', background: wizardData.secondaryColor, borderRadius: '50%' }}></div>
                         </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                          <button type="button" onClick={() => setWizardStep(1)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#475569' }}>✏️ Tout Revoir (Modifier)</button>
                      </div>
                   </div>

                   <button type="submit" disabled={isGenerating} className={styles.button_primary} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', opacity: isGenerating ? 0.5 : 1 }}>
                     {isGenerating ? "⏳ L'IA construit votre carte..." : "🚀 Lancer la Génération IA"}
                   </button>
                 </div>
               )}            </div>"""

content = content[:start_idx] + new_steps + content[end_idx:]

with open(file_path, "w") as f:
    f.write(content)

print("Wizard React Steps Replaced successfully.")
