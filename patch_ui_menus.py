import re

file_path = "src/app/generer-carte/page.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Update State
old_state = 'accompaniments: { list: "Frites, Potatoes", hasSizes: false, sizeS: 0, sizeM: 1.0, sizeL: 1.50 }\n  });'
new_state = """accompaniments: { list: "Frites, Potatoes", hasSizes: false, sizeS: 0, sizeM: 1.0, sizeL: 1.50 },
    drinks: { list: "Coca-Cola, Eau Plate", hasSizes: false, sizeS: 0, sizeM: 0.5, sizeL: 1.0 },
    desserts: { list: "", hasSizes: false, sizeS: 0, sizeM: 0.5, sizeL: 1.0 }
  });"""
content = content.replace(old_state, new_state)

# 2. Update formData
old_form = """      formData.set("systemConfigJSON", JSON.stringify({
          compositions: wizardData.compositions,
          formulas: wizardData.formulas,
          accompaniments: wizardData.accompaniments,
          badges: wizardData.productBadges
      }));"""
new_form = """      formData.set("systemConfigJSON", JSON.stringify({
          compositions: wizardData.compositions,
          formulas: wizardData.formulas,
          accompaniments: wizardData.accompaniments,
          drinks: wizardData.drinks,
          desserts: wizardData.desserts,
          badges: wizardData.productBadges
      }));"""
content = content.replace(old_form, new_form)

# 3. Update Step 5 UI to include Drinks and Desserts
step5_old = """{wizardStep === 5 && (
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
               )}"""

step5_new = """{wizardStep === 5 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Composition des Menus (Accomp. / Boissons / Desserts)</h3>
                   
                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>🍔 Accompagnements (Séparés par des virgules)</label>
                   <input type="text" value={wizardData.accompaniments.list} onChange={e => setWizardData({...wizardData, accompaniments: {...wizardData.accompaniments, list: e.target.value}})} placeholder="Frites, Potatoes..." style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1rem' }} />

                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>🥤 Boissons Menu (Séparées par des virgules)</label>
                   <input type="text" value={wizardData.drinks.list} onChange={e => setWizardData({...wizardData, drinks: {...wizardData.drinks, list: e.target.value}})} placeholder="Coca-Cola, Eau Plate, Fanta..." style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1rem' }} />

                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>🍦 Desserts Menu (Optionnel)</label>
                   <input type="text" value={wizardData.desserts.list} onChange={e => setWizardData({...wizardData, desserts: {...wizardData.desserts, list: e.target.value}})} placeholder="McFlurry, Sundae (Laisser vide si aucun)" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1.5rem' }} />

                   <div style={{ background: '#f8fafc', padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '1.5rem' }}>
                       <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 600, color: '#475569' }}>
                           <input type="checkbox" checked={wizardData.accompaniments.hasSizes} onChange={e => {
                               const v = e.target.checked;
                               setWizardData({...wizardData, 
                                 accompaniments: {...wizardData.accompaniments, hasSizes: v},
                                 drinks: {...wizardData.drinks, hasSizes: v},
                                 desserts: {...wizardData.desserts, hasSizes: v}
                               })
                           }} style={{ width: '1.2rem', height: '1.2rem' }} />
                           Proposer des tailles pour Accompagnements & Boissons (S, M, L)
                       </label>

                       {wizardData.accompaniments.hasSizes && (
                           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                               <div>
                                   <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Surlcoût Taille S (€)</label>
                                   <input type="number" step="0.1" value={wizardData.accompaniments.sizeS} onChange={e => setWizardData({...wizardData, accompaniments: {...wizardData.accompaniments, sizeS: parseFloat(e.target.value)}, drinks: {...wizardData.drinks, sizeS: parseFloat(e.target.value)}, desserts: {...wizardData.desserts, sizeS: parseFloat(e.target.value)}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                               </div>
                               <div>
                                   <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Surlcoût Taille M (€)</label>
                                   <input type="number" step="0.1" value={wizardData.accompaniments.sizeM} onChange={e => setWizardData({...wizardData, accompaniments: {...wizardData.accompaniments, sizeM: parseFloat(e.target.value)}, drinks: {...wizardData.drinks, sizeM: parseFloat(e.target.value)}, desserts: {...wizardData.desserts, sizeM: parseFloat(e.target.value)}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                               </div>
                               <div>
                                   <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Surlcoût Taille L (€)</label>
                                   <input type="number" step="0.1" value={wizardData.accompaniments.sizeL} onChange={e => setWizardData({...wizardData, accompaniments: {...wizardData.accompaniments, sizeL: parseFloat(e.target.value)}, drinks: {...wizardData.drinks, sizeL: parseFloat(e.target.value)}, desserts: {...wizardData.desserts, sizeL: parseFloat(e.target.value)}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                               </div>
                           </div>
                       )}
                   </div>

                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button type="button" onClick={() => setWizardStep(4)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1', background: 'white' }}>⬅️ Retour</button>
                      <button type="button" onClick={() => setWizardStep(6)} style={{ padding: '0.6rem 1.2rem', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Suivant ➡️</button>
                   </div>
                 </div>
               )}"""

print(content.find("{wizardStep === 5 && ("))
content = content.replace(step5_old, step5_new)

with open(file_path, "w") as f:
    f.write(content)

