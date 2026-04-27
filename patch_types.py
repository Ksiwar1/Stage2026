file_path = "src/app/generer-carte/page.tsx"
with open(file_path, "r") as f:
    content = f.read()

target = """                      {[
                        { label: 'Fast-Food / Burger', val: 'carte1_smash_up.json' },
                        { label: 'Pizzeria / Grill', val: 'carte3_grill_station.json' },
                        { label: 'Tacos / Kebab', val: 'carte5_etoile_orientale.json' },
                        { label: 'Standard ETK360', val: 'generique' }
                      ].map(t => (
                        <button key={t.val} type="button" onClick={() => setWizardData({...wizardData, theme: t.val, typeLabel: t.label})} style={{ padding: '0.8rem', borderRadius: '8px', border: wizardData.theme === t.val ? '2px solid #4f46e5' : '1px solid #cbd5e1', background: wizardData.theme === t.val ? '#e0e7ff' : '#f8fafc', cursor: 'pointer', textAlign: 'left', fontWeight: 600, color: '#334155' }}>
                          🌮 {t.label}
                        </button>
                      ))}"""

new_content = """                      {[
                        { label: 'Fast-Food', val: 'carte1_smash_up.json', icon: '🍔' },
                        { label: 'Fast-Casual', val: 'generique', icon: '🥗' },
                        { label: 'Pizzeria', val: 'carte3_grill_station.json', icon: '🍕' },
                        { label: 'Café', val: 'generique', icon: '☕' }
                      ].map(t => (
                        <button key={t.label} type="button" onClick={() => setWizardData({...wizardData, theme: t.val, typeLabel: t.label})} style={{ padding: '0.8rem', borderRadius: '8px', border: wizardData.typeLabel === t.label ? '2px solid #4f46e5' : '1px solid #cbd5e1', background: wizardData.typeLabel === t.label ? '#e0e7ff' : '#f8fafc', cursor: 'pointer', textAlign: 'left', fontWeight: 600, color: '#334155' }}>
                          {t.icon} {t.label}
                        </button>
                      ))}"""

if target in content:
    content = content.replace(target, new_content)
    with open(file_path, "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target block not found")
