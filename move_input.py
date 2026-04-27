file_path = "src/app/generer-carte/page.tsx"
with open(file_path, "r") as f:
    content = f.read()

target_remove = """                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Nom de l'enseigne</label>
                   <input
                     type="text"
                     name="restaurantName"
                     required
                     value={wizardData.restaurantName}
                     onChange={(e) => setWizardData({...wizardData, restaurantName: e.target.value})}
                     placeholder="Ex: O'Tacos"
                     style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1.5rem', fontSize: '1rem' }}
                   />"""


target_insert_before = """           <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', background: '#4f46e5', color: 'white', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)' }}>
                 📸 Analyse d'Image (OCR)
              </div>
           </div>"""

global_input = """           <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '2rem' }}>
               <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', color: '#1e293b', fontSize: '1.1rem' }}>Nom du Restaurant <span style={{color: '#ef4444'}}>*</span></label>
               <input
                 type="text"
                 name="restaurantName"
                 required
                 value={wizardData.restaurantName}
                 onChange={(e) => setWizardData({...wizardData, restaurantName: e.target.value})}
                 placeholder="Ex: Burger House..."
                 style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '2px solid #cbd5e1', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}
               />
               <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Ce nom sera utilisé pour la bibliothèque et l'affichage des catalogues.</p>
           </div>
"""

if target_remove in content and target_insert_before in content:
    content = content.replace(target_remove, "")
    content = content.replace(target_insert_before, global_input + "\n\n" + target_insert_before)
    with open(file_path, "w") as f:
        f.write(content)
    print("Moved restaurantName input successfully")
else:
    print("Blocks not found")

