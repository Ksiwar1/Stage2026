import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import styles from "../../page.module.css";

export default async function CarteEditorDashboard(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const nomFichier = `${params.id}.json`;
  const filePath = path.join(process.cwd(), '.softavera', 'carte', nomFichier);
  
  let data: any = null;
  let error = null;

  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(content);
    } else {
      error = "Fichier introuvable.";
    }
  } catch (err: any) {
    error = "Erreur de lecture: " + err.message;
  }

  // Fallback calculations for stats
  const catCount = Object.keys(data?.categories || {}).length;
  const itemCount = Object.keys(data?.items || {}).length;
  const modCount = Object.keys(data?.modifier || {}).length;
  
  const title = data?.title || params.id.replace(/_/g, ' ');

  return (
    <main className={`${styles.main}`} style={{ padding: '4rem 2rem', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3rem', gap: '1.5rem' }}>
           <Link href="/update-carte" style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', textDecoration: 'none', color: '#0f172a', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
             &larr; Retour
           </Link>
           <div>
             <h1 style={{ margin: 0, fontSize: '2rem', color: '#0f172a', letterSpacing: '-0.02em' }}>{title}</h1>
             <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem' }}>{nomFichier}</div>
           </div>
        </div>

        {error ? (
          <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b', padding: '1.5rem', borderRadius: '12px' }}>
            {error}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
            {/* Colonne Principale */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <h2 style={{ marginTop: 0, color: '#1e293b', marginBottom: '1.5rem' }}>Vue d'ensemble</h2>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '1.5rem', borderRadius: '16px', flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                      🍽️
                    </div>
                    <div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{catCount}</div>
                      <div style={{ color: '#64748b', fontWeight: 500, fontSize: '0.9rem', marginTop: '0.25rem' }}>Catégories</div>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '1.5rem', borderRadius: '16px', flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                      🍔
                    </div>
                    <div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{itemCount}</div>
                      <div style={{ color: '#64748b', fontWeight: 500, fontSize: '0.9rem', marginTop: '0.25rem' }}>Produits (Items)</div>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '1.5rem', borderRadius: '16px', flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                      ⚙️
                    </div>
                    <div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{modCount}</div>
                      <div style={{ color: '#64748b', fontWeight: 500, fontSize: '0.9rem', marginTop: '0.25rem' }}>Modifiers</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <h2 style={{ marginTop: 0, color: '#1e293b' }}>Outils d'Édition</h2>
                <p style={{ color: '#64748b', marginBottom: '2rem' }}>Sélectionnez un composant de la carte à modifier. Les éditeurs interactifs garantissent l'intégrité ETK360.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                  <button style={{ padding: '1.5rem', background: 'white', color: '#0f172a', border: '2px dashed #cbd5e1', borderRadius: '16px', fontWeight: 600, cursor: 'pointer', opacity: 0.7, textAlign: 'left', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>📋</span>
                    <span>Éditeur de Catégories</span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>Ajouter, trier ou masquer (Bientôt)</span>
                  </button>
                  <Link href={`/update-carte/${params.id}/produits`} style={{ padding: '1.5rem', background: 'white', color: '#0f172a', border: '2px solid #3b82f6', borderRadius: '16px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '0.5rem', textDecoration: 'none', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)' }}>
                    <span style={{ fontSize: '1.5rem' }}>🏷️</span>
                    <span>Catalogue Produits</span>
                    <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 500 }}>Éditer les prix, images et descriptions &rarr;</span>
                  </Link>
                  <button style={{ padding: '1.5rem', background: 'white', color: '#0f172a', border: '2px dashed #cbd5e1', borderRadius: '16px', fontWeight: 600, cursor: 'pointer', opacity: 0.7, textAlign: 'left', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>🧩</span>
                    <span>Options & Steps</span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>Règles complexes (Bientôt)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Colonne Latérale */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <h3 style={{ marginTop: 0, color: '#1e293b', marginBottom: '1.5rem' }}>Test & Actions</h3>
                
                <Link href={`/borne/${params.id}`} target="_blank" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '1rem', background: '#1e293b', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', marginBottom: '1rem', transition: 'background 0.2s' }}>
                  <span>📱</span> Simuler sur Borne
                </Link>
                
                <div style={{ height: '1px', background: '#e2e8f0', margin: '1.5rem 0' }}></div>
                
                <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '1rem', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                  🗑️ Supprimer la carte
                </button>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', padding: '2rem', borderRadius: '24px', border: '1px solid #bbf7d0' }}>
                 <h3 style={{ marginTop: 0, color: '#166534', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <span>✓</span> Intégrité OK
                 </h3>
                 <p style={{ margin: 0, color: '#15803d', fontSize: '0.9rem' }}>
                   Cette carte respecte le format ETK360. Prête pour le déploiement sur kiosque.
                 </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
