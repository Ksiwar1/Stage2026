import re

file_path = "src/app/generer-carte/page.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Locate Step 4 start and end
step4_start_token = "{/* ETAPE 4 : TECHNIQUE & DESIGN */}"
step4_end_token = "{/* ETAPE 5 : GENERATION (Recap) */}"

start_idx = content.find(step4_start_token)
end_idx = content.find(step4_end_token)

if start_idx == -1 or end_idx == -1:
    print("Tokens missing!")
else:
    new_step4 = """            {/* ETAPE 4 : TECHNIQUE & DESIGN */}
            <div style={{ width: '20%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: wizardStep === 4 ? 1 : 0.4, transition: 'opacity 0.5s' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                   {/* Col Gauche : FormControls */}
                   <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
                      <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', color: '#1e293b', fontSize: '1.2rem' }}>Format d'affichage cible</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
                         {['Écran kiosque', 'Tablette', 'Impression A4', 'QR Code menu'].map(f => (
                           <button type="button" key={f} onClick={() => setWizardData({...wizardData, outputFormat: f})} style={{ padding: '0.8rem', borderRadius: '8px', border: wizardData.outputFormat === f ? '2px solid #4f46e5' : '1px solid #cbd5e1', background: wizardData.outputFormat === f ? '#eef2ff' : '#f8fafc', cursor: 'pointer', fontWeight: 600, color: wizardData.outputFormat === f ? '#4f46e5' : '#334155' }}>
                             {f}
                           </button>
                         ))}
                      </div>

                      <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', color: '#1e293b', fontSize: '1.2rem' }}>Style global de l'app</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.5rem' }}>
                          {[
                            { name: 'Moderne', p: '#4f46e5', s: '#10b981' },
                            { name: 'Gourmand (Viande/Pizza)', p: '#dc2626', s: '#ea580c' },
                            { name: 'Healthy (Salade)', p: '#16a34a', s: '#84cc16' },
                            { name: 'Élégant', p: '#1e293b', s: '#94a3b8' },
                            { name: 'Océan (Sushis)', p: '#0284c7', s: '#38bdf8' },
                            { name: 'Pastel (Gourmandise)', p: '#f43f5e', s: '#fb7185' }
                          ].map(th => (
                             <div key={th.name} onClick={() => setWizardData({...wizardData, primaryColor: th.p, secondaryColor: th.s})} style={{ padding: '0.7rem', border: wizardData.primaryColor === th.p ? '2px solid '+th.p : '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: th.p }}></div>
                                <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>{th.name}</span>
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

                   {/* Col Droite : Live Preview */}
                   <div style={{ background: wizardData.primaryColor, borderRadius: '16px', padding: '1.5rem', color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: `0 10px 25px -5px ${wizardData.primaryColor}80`, transition: 'background 0.3s ease', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: wizardData.secondaryColor, borderRadius: '50%', opacity: 0.8, filter: 'blur(30px)' }}></div>
                      
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 800, opacity: 0.9 }}>Aperçu Dynamique</div>
                      
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.2rem', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                         {wizardData.productBadges.length > 0 && wizardData.productBadges[0] && (
                           <div style={{ display: 'inline-block', background: wizardData.secondaryColor, color: '#fff', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '99px', fontWeight: 'bold', marginBottom: 'auto', alignSelf: 'flex-start' }}>
                             ★ {wizardData.productBadges[0]}
                           </div>
                         )}
                         <span style={{ fontSize: '1.1rem', fontWeight: 900, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>Votre Interface ETK</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                         <div style={{ height: '45px', flex: 1, background: wizardData.secondaryColor, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>Bouton Action</div>
                         <div style={{ height: '45px', width: '45px', background: 'rgba(255,255,255,0.9)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: wizardData.primaryColor, fontWeight: 'bold' }}>+</div>
                      </div>
                   </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                   <button type="button" onClick={() => setWizardStep(3)} style={{ padding: '1rem 2rem', background: '#e2e8f0', color: '#475569', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>← Retour</button>
                   <button type="button" onClick={() => setWizardStep(5)} style={{ padding: '1rem 2rem', background: '#4f46e5', color: 'white', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>Continuer →</button>
               </div>
            </div>

"""
    
    new_content = content[:start_idx] + new_step4 + content[end_idx:]
    with open(file_path, "w") as f:
        f.write(new_content)
    print("Step 4 fixed.")
