"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";
import paramStyles from "./parametres.module.css";
import Link from "next/link";
import LogoMarquee from '../../components/LogoMarquee';


export default function Parametres() {
  const [isClient, setIsClient] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // States pour Override Global UI
  const [overrideLanguages, setOverrideLanguages] = useState<string[]>([]);
  const [overridePrimaryColor, setOverridePrimaryColor] = useState("");
  const [overrideSecondaryColor, setOverrideSecondaryColor] = useState("");
  const [siteMenuOrder, setSiteMenuOrder] = useState<string[]>([
    'generer', 'bibliotheque', 'importer', 'update', 'historique', 'parametres'
  ]);

  // Load from Database API on mount
  useEffect(() => {
    setIsClient(true);
    fetch('/api/settings')
      .then(res => res.json())
      .then(parsed => {
        if (parsed.overrideLanguages) setOverrideLanguages(parsed.overrideLanguages);
        if (parsed.overridePrimaryColor) setOverridePrimaryColor(parsed.overridePrimaryColor);
        if (parsed.overrideSecondaryColor) setOverrideSecondaryColor(parsed.overrideSecondaryColor);
        if (parsed.siteMenuOrder) setSiteMenuOrder(parsed.siteMenuOrder);
      })
      .catch(e => console.error("Failed to load settings from DB", e));
  }, []);

  const handleLanguageToggle = (lang: string) => {
    setOverrideLanguages(prev => {
      if (prev.includes(lang)) return prev.filter(l => l !== lang);
      return [...prev, lang];
    });
  };

  const handleSave = async () => {
    const settings = {
      overrideLanguages,
      overridePrimaryColor,
      overrideSecondaryColor,
      siteMenuOrder
    };
    
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (res.ok) {
        setShowToast(true);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        console.error("Failed to save settings");
      }
    } catch (e) {
      console.error("Error saving settings", e);
    }
  };

  if (!isClient) return null;

  return (
    <main className={`${styles.main} ${styles.heroImageBg}`}>
      <div className={styles.hero} style={{ maxWidth: '1000px', width: '100%', margin: '10rem auto 2.5rem auto', paddingTop: '0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 className={styles.title} style={{ marginBottom: '0.5rem', textAlign: 'left', color: 'var(--foreground)' }}>Paramètres du Site</h1>
            <p className={styles.description} style={{ textAlign: 'left', margin: '0', color: 'var(--text-muted)' }}>
              Personnalisation de l'interface d'administration Softavera.
            </p>
          </div>
          <Link href="/menu" className={styles.backButton}><span>&larr;</span> Retour</Link>
        </div>

        <div className={paramStyles.container}>
          <section className={paramStyles.section}>
            <h2 className={paramStyles.sectionTitle}>🎨 Personnalisation du Site</h2>
            <p className={paramStyles.helpText} style={{ marginBottom: '1.5rem' }}>
              Ces paramètres modifient l'apparence et le fonctionnement de votre interface d'administration (Back-Office).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              
              <div className={paramStyles.formGroup}>
                <label className={paramStyles.label}>Langues forcées</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.75rem' }}>
                  {/* Toggle FR */}
                  <div 
                    onClick={() => handleLanguageToggle('FR')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border-highlight)'; e.currentTarget.style.background = 'var(--glass-bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'var(--glass-bg)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>🇫🇷</span>
                      <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>Français</span>
                    </div>
                    {/* Switch */}
                    <div style={{
                      width: '44px', height: '24px', borderRadius: '12px',
                      background: overrideLanguages.includes('FR') ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                      position: 'relative', transition: 'var(--transition-smooth)',
                      boxShadow: overrideLanguages.includes('FR') ? '0 0 10px var(--primary-glow)' : 'none'
                    }}>
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '50%', background: 'white',
                        position: 'absolute', top: '2px', left: overrideLanguages.includes('FR') ? '22px' : '2px',
                        transition: 'var(--transition-smooth)', boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                      }} />
                    </div>
                  </div>

                  {/* Toggle EN */}
                  <div 
                    onClick={() => handleLanguageToggle('EN')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border-highlight)'; e.currentTarget.style.background = 'var(--glass-bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'var(--glass-bg)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>🇬🇧</span>
                      <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>Anglais</span>
                    </div>
                    {/* Switch */}
                    <div style={{
                      width: '44px', height: '24px', borderRadius: '12px',
                      background: overrideLanguages.includes('EN') ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                      position: 'relative', transition: 'var(--transition-smooth)',
                      boxShadow: overrideLanguages.includes('EN') ? '0 0 10px var(--primary-glow)' : 'none'
                    }}>
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '50%', background: 'white',
                        position: 'absolute', top: '2px', left: overrideLanguages.includes('EN') ? '22px' : '2px',
                        transition: 'var(--transition-smooth)', boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                      }} />
                    </div>
                  </div>
                </div>
                <span className={paramStyles.helpText} style={{ marginTop: '0.75rem', display: 'block', color: 'var(--text-muted)' }}>Activez ou désactivez les langues de l'interface d'administration.</span>
              </div>

              <div className={paramStyles.formGroup}>
                <label className={paramStyles.label}>Couleurs Principales</label>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
                  
                  {/* Color Picker Primaire */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ 
                      position: 'relative', width: '56px', height: '56px', borderRadius: '50%', 
                      overflow: 'hidden', border: '1px solid var(--glass-border-highlight)', 
                      boxShadow: 'var(--shadow-md)' 
                    }}>
                      <input 
                        type="color" 
                        value={overridePrimaryColor || "#000000"} 
                        onChange={(e) => setOverridePrimaryColor(e.target.value)}
                        style={{ position: 'absolute', top: '-10px', left: '-10px', width: '80px', height: '80px', cursor: 'pointer', border: 'none', padding: 0 }}
                        title="Choisir la couleur primaire"
                      />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Primaire</span>
                  </div>

                  {/* Color Picker Secondaire */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ 
                      position: 'relative', width: '56px', height: '56px', borderRadius: '50%', 
                      overflow: 'hidden', border: '1px solid var(--glass-border-highlight)', 
                      boxShadow: 'var(--shadow-md)' 
                    }}>
                      <input 
                        type="color" 
                        value={overrideSecondaryColor || "#000000"} 
                        onChange={(e) => setOverrideSecondaryColor(e.target.value)}
                        style={{ position: 'absolute', top: '-10px', left: '-10px', width: '80px', height: '80px', cursor: 'pointer', border: 'none', padding: 0 }}
                        title="Choisir la couleur secondaire"
                      />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Secondaire</span>
                  </div>

                </div>
                
                <div style={{ marginTop: '1.5rem' }}>
                  <button 
                    onClick={() => { setOverridePrimaryColor(""); setOverrideSecondaryColor(""); }}
                    style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)',
                      padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'var(--transition-smooth)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    Réinitialiser les couleurs
                  </button>
                </div>
              </div>

              <div className={paramStyles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={paramStyles.label}>Ordre des modules du Tableau de bord</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {siteMenuOrder.map((id, index) => {
                    const titles: Record<string, string> = { 
                      generer: 'Générer une carte', 
                      bibliotheque: 'Bibliothèque', 
                      importer: 'Importer des cartes',
                      update: 'Update Carte',
                      historique: 'Historique',
                      parametres: 'Paramètres' 
                    };
                    return (
                      <div 
                        key={id} 
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          // On stocke l'index dans le dataTransfer ou via un attribut
                          e.dataTransfer.setData('text/plain', index.toString());
                          // Effet visuel pendant le drag
                          setTimeout(() => {
                            (e.target as HTMLElement).style.opacity = '0.5';
                          }, 0);
                        }}
                        onDragEnd={(e) => {
                          (e.target as HTMLElement).style.opacity = '1';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault(); // Nécessaire pour autoriser le drop
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                          const targetIndex = index;
                          
                          if (draggedIndex === targetIndex) return;
                          
                          const newOrder = [...siteMenuOrder];
                          const [removed] = newOrder.splice(draggedIndex, 1);
                          newOrder.splice(targetIndex, 0, removed);
                          
                          setSiteMenuOrder(newOrder);
                        }}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '0.75rem 1rem', 
                          background: 'var(--glass-bg)', 
                          border: '1px solid var(--glass-border)', 
                          borderRadius: '8px',
                          cursor: 'grab',
                          boxShadow: 'var(--shadow-sm)',
                          transition: 'var(--transition-smooth)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                          e.currentTarget.style.borderColor = 'var(--glass-border-highlight)';
                          e.currentTarget.style.background = 'var(--glass-bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                          e.currentTarget.style.borderColor = 'var(--glass-border)';
                          e.currentTarget.style.background = 'var(--glass-bg)';
                        }}
                      >
                        <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>{titles[id] || id}</span>
                        <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} title="Glissez pour déplacer">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <span className={paramStyles.helpText} style={{ marginTop: '0.5rem', display: 'block' }}>Maintenez le clic et glissez les éléments pour réorganiser l'ordre du tableau de bord.</span>
              </div>
            </div>
          </section>



          {/* Actions */}
          <div className={paramStyles.saveContainer}>
            <button className={styles.button_primary} onClick={handleSave}>
              Appliquer les paramètres
            </button>

            {showToast && (
              <div className={paramStyles.toast}>
                <span>✓</span> Paramètres du site enregistrés. La page va se recharger.
              </div>
            )}
          </div>

        </div>
      </div>
      <LogoMarquee />
    </main>
  );
}
