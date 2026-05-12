"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";
import paramStyles from "./parametres.module.css";
import Link from "next/link";

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

  // Load from localStorage on mount
  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("softavera_support_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.overrideLanguages) setOverrideLanguages(parsed.overrideLanguages);
        if (parsed.overridePrimaryColor) setOverridePrimaryColor(parsed.overridePrimaryColor);
        if (parsed.overrideSecondaryColor) setOverrideSecondaryColor(parsed.overrideSecondaryColor);
        if (parsed.siteMenuOrder) setSiteMenuOrder(parsed.siteMenuOrder);
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  const handleLanguageToggle = (lang: string) => {
    setOverrideLanguages(prev => {
      if (prev.includes(lang)) return prev.filter(l => l !== lang);
      return [...prev, lang];
    });
  };

  const handleSave = () => {
    const settings = {
      overrideLanguages,
      overridePrimaryColor,
      overrideSecondaryColor,
      siteMenuOrder
    };
    localStorage.setItem("softavera_support_settings", JSON.stringify(settings));
    
    setShowToast(true);
    setTimeout(() => window.location.reload(), 1000);
  };

  if (!isClient) return null;

  return (
    <main className={`${styles.main} ${styles.heroImageBg}`}>
      <div className={styles.hero} style={{ maxWidth: '1000px', width: '100%', margin: '0 auto', paddingTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 className={styles.title} style={{ marginBottom: '0.5rem', textAlign: 'left' }}>Paramètres du Site</h1>
            <p className={styles.description} style={{ textAlign: 'left', margin: '0' }}>
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
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={overrideLanguages.includes('FR')} 
                      onChange={() => handleLanguageToggle('FR')}
                    />
                    <span>🇫🇷 Français</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={overrideLanguages.includes('EN')} 
                      onChange={() => handleLanguageToggle('EN')}
                    />
                    <span>🇬🇧 Anglais</span>
                  </label>
                </div>
                <span className={paramStyles.helpText} style={{ marginTop: '0.5rem', display: 'block' }}>Choisissez les langues disponibles pour l'interface d'administration.</span>
              </div>

              <div className={paramStyles.formGroup}>
                <label className={paramStyles.label}>Couleurs Principales</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>Primaire</span>
                    <input 
                      type="color" 
                      value={overridePrimaryColor || "#000000"} 
                      onChange={(e) => setOverridePrimaryColor(e.target.value)}
                      style={{ width: '40px', height: '40px', cursor: 'pointer' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>Secondaire</span>
                    <input 
                      type="color" 
                      value={overrideSecondaryColor || "#000000"} 
                      onChange={(e) => setOverrideSecondaryColor(e.target.value)}
                      style={{ width: '40px', height: '40px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <button 
                    onClick={() => { setOverridePrimaryColor(""); setOverrideSecondaryColor(""); }}
                    style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
                  >
                    Effacer les couleurs (Reset)
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
                      <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <span style={{ fontWeight: 500, color: '#334155' }}>{titles[id] || id}</span>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button 
                            onClick={() => {
                              if (index > 0) {
                                const newOrder = [...siteMenuOrder];
                                [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                                setSiteMenuOrder(newOrder);
                              }
                            }}
                            disabled={index === 0}
                            style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.5 : 1 }}
                          >
                            ↑
                          </button>
                          <button 
                            onClick={() => {
                              if (index < siteMenuOrder.length - 1) {
                                const newOrder = [...siteMenuOrder];
                                [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
                                setSiteMenuOrder(newOrder);
                              }
                            }}
                            disabled={index === siteMenuOrder.length - 1}
                            style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: index === siteMenuOrder.length - 1 ? 'not-allowed' : 'pointer', opacity: index === siteMenuOrder.length - 1 ? 0.5 : 1 }}
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <span className={paramStyles.helpText} style={{ marginTop: '0.5rem', display: 'block' }}>Utilisez les flèches pour réorganiser les modules affichés sur la page d'accueil du tableau de bord.</span>
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
    </main>
  );
}
