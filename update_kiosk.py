import re

file_path = "src/components/KioskSimulator.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Inject Theme variables into the root container style based on `rawData.themeMetadata`
container_search = """    <div style={{ flex: 1, backgroundColor: 'var(--color-background)', fontFamily: "'Inter', sans-serif", display: 'flex' }}>"""
container_replace = """    <div style={{ 
      flex: 1, 
      backgroundColor: rawData?.themeMetadata?.typeLabel?.toLowerCase().includes('fast') ? '#121212' : rawData?.themeMetadata?.typeLabel?.toLowerCase().includes('pizza') ? '#fdfbf7' : 'var(--color-background)', 
      fontFamily: rawData?.themeMetadata?.typeLabel?.toLowerCase().includes('pizza') ? "'Playfair Display', serif" : rawData?.themeMetadata?.typeLabel?.toLowerCase().includes('gastronomique') ? "'Cinzel', serif" : "'Inter', sans-serif", 
      display: 'flex',
      '--color-text': rawData?.themeMetadata?.typeLabel?.toLowerCase().includes('fast') ? '#ffffff' : '#111827',
      '--color-surface': rawData?.themeMetadata?.typeLabel?.toLowerCase().includes('fast') ? '#1e1e1e' : '#ffffff',
      '--color-primary': rawData?.themeMetadata?.typeLabel?.toLowerCase().includes('pizz') ? '#b91c1c' : rawData?.themeMetadata?.typeLabel?.toLowerCase().includes('tacos') ? '#16a34a' : 'var(--color-primary)'
    } as any}>"""

if container_search in content:
    content = content.replace(container_search, container_replace)
    print("Injected dynamic theme styling root.")

# 2. Add large image header to Modal (around line 380)
modal_header_search = """           <div style={{ width: '90%', maxWidth: '800px', height: '85vh', background: 'var(--color-surface)', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>"""
modal_header_replace = """           <div style={{ width: '90%', maxWidth: '800px', height: '85vh', background: 'var(--color-surface)', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
             
            {/* Image Header HD dynamique */}
            <div style={{ 
                height: '250px', width: '100%', 
                backgroundImage: `url(${selectedProduct?.image})`, 
                backgroundSize: 'cover', backgroundPosition: 'center', 
                position: 'relative', flexShrink: 0 
            }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '2rem 1.5rem 1rem' }}>
                    <h2 style={{ color: 'white', margin: 0, fontSize: '2.5rem', fontWeight: 800 }}>{selectedProduct?.name}</h2>
                    <p style={{ color: '#e5e7eb', margin: '0.5rem 0 0', fontSize: '1.2rem', fontWeight: 600 }}>{selectedProduct?.priceTTC.toFixed(2)} €</p>
                </div>
            </div>"""

if modal_header_search in content:
    content = content.replace(modal_header_search, modal_header_replace)
    print("Injected UI Modal Image Header.")

# 3. Enhance Option Cards UX (Animations / Sizes) - approx line 540
option_card_search = """                            transition: 'all 0.2s',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                            opacity: isComp && !isIncluded ? 0.6 : 1
                          }}
                        >"""
option_card_replace = """                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: isSelected || (isComp && isIncluded) ? '0 10px 25px rgba(0,0,0,0.1)' : '0 4px 15px rgba(0,0,0,0.05)',
                            transform: isSelected || (isComp && isIncluded) ? 'translateY(-4px)' : 'none',
                            opacity: isComp && !isIncluded ? 0.6 : 1,
                            overflow: 'hidden'
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.transform = 'translateY(-2px)' }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.transform = 'none' }}
                        >"""

if option_card_search in content:
    content = content.replace(option_card_search, option_card_replace)
    print("Injected Option Card Hover UX.")

# 4. Enhance 'Valider' Button
valider_btn_search = """                <button onClick={confirmProduct} style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', padding: '1rem 3rem', borderRadius: '8px', border: 'none', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
                  Valider le produit"""
valider_btn_replace = """                <button onClick={(e) => {
                   const btn = e.currentTarget;
                   btn.style.transform = 'scale(0.95)';
                   setTimeout(() => { btn.style.transform = 'scale(1)'; confirmProduct(); }, 150);
                }} style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', padding: '1rem 3rem', borderRadius: '12px', border: 'none', fontSize: '1.4rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)', transition: 'all 0.15s ease-out', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Confirmer"""

if valider_btn_search in content:
    content = content.replace(valider_btn_search, valider_btn_replace)
    print("Injected Valider Button UX.")


with open(file_path, "w") as f:
    f.write(content)
print("KioskSimulator UI Update complete.")
