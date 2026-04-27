import re

file_path = "src/components/KioskSimulator.tsx"
with open(file_path, "r") as f:
    content = f.read()

header_search = """               <div style={{ position: 'absolute', top: '1rem', right: '1.5rem', display: 'flex', gap: '8px' }}>
                  <button onClick={() => setSelectedProduct(null)} style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)' }}>✕</button>
               </div>
               
               <h2 style={{ margin: 0, fontSize: '1.6rem', textTransform: 'uppercase', fontWeight: 900, color: '#111827', marginBottom: '2.5rem', textAlign: 'center' }}>{activeWorkflow ? activeWorkflow.node.name : selectedProduct.name}</h2>"""

header_replace = """               {/* Controls */}
               <div style={{ position: 'absolute', top: '1rem', right: '1.5rem', display: 'flex', gap: '8px' }}>
                  <button onClick={() => setSelectedProduct(null)} style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)' }}>✕</button>
               </div>
            </div> {/* <-- CORRECTION DE LA FERMETURE DU HEADER ! */}
            
            <div style={{ padding: '2rem 1.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>"""

if header_search in content:
    content = content.replace(header_search, header_replace)
    print("Modal Layout CSS repaired.")

# Now we need to remove the ugly "Step Icons Row", which spans from "                  {/* Step Icons Row */}" to "                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>" minus a few divs
step_icons_pattern = re.compile(r'\{\/\* Step Icons Row \*\/\}.*?<div style=\{\{ display: \'flex\', alignItems: \'center\', justifyContent: \'center\', width: \'100%\', maxWidth: \'400px\' \}\}>', re.DOTALL)

step_icons_replace = """<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '400px', marginBottom: '2rem' }}>"""

if step_icons_pattern.search(content):
    content = step_icons_pattern.sub(step_icons_replace, content)
    print("Step Icons Row Removed")
else:
    print("Step icons row not found?")

with open(file_path, "w") as f:
    f.write(content)
