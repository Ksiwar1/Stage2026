"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";
import paramStyles from "./parametres.module.css";
import Link from "next/link";

export default function Parametres() {
  const [isClient, setIsClient] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // States pour Support Softavera
  const [environment, setEnvironment] = useState("prod");
  const [debugMode, setDebugMode] = useState(false);
  const [showTechnicalIds, setShowTechnicalIds] = useState(false);
  const [kioskIdOverride, setKioskIdOverride] = useState("");
  const [restaurantIdOverride, setRestaurantIdOverride] = useState("");
  const [disableCache, setDisableCache] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("softavera_support_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.environment) setEnvironment(parsed.environment);
        if (parsed.debugMode !== undefined) setDebugMode(parsed.debugMode);
        if (parsed.showTechnicalIds !== undefined) setShowTechnicalIds(parsed.showTechnicalIds);
        if (parsed.kioskIdOverride) setKioskIdOverride(parsed.kioskIdOverride);
        if (parsed.restaurantIdOverride) setRestaurantIdOverride(parsed.restaurantIdOverride);
        if (parsed.disableCache !== undefined) setDisableCache(parsed.disableCache);
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  const handleSave = () => {
    const settings = {
      environment,
      debugMode,
      showTechnicalIds,
      kioskIdOverride,
      restaurantIdOverride,
      disableCache
    };
    localStorage.setItem("softavera_support_settings", JSON.stringify(settings));
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleClearCache = () => {
    // Simulation du vidage de cache
    alert("Cache applicatif et données locales ETK360 vidés avec succès.");
  };

  if (!isClient) return null;

  return (
    <main className={`${styles.main} ${styles.heroImageBg}`}>
      <div className={styles.hero} style={{ maxWidth: '1000px', width: '100%', margin: '0 auto', paddingTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 className={styles.title} style={{ marginBottom: '0.5rem', textAlign: 'left' }}>Outils Support</h1>
            <p className={styles.description} style={{ textAlign: 'left', margin: '0' }}>
              Interface de configuration réservée aux équipes Support Softavera.
            </p>
          </div>
          <Link href="/menu" className={styles.backButton}><span>&larr;</span> Retour</Link>
        </div>

        <div className={paramStyles.container}>
          
          {/* Section Environnement */}
          <section className={paramStyles.section}>
            <h2 className={paramStyles.sectionTitle}>🌍 Environnement de Diagnostic</h2>
            
            <div className={paramStyles.formGroup}>
              <label className={paramStyles.label}>Pointeurs API (Source de données)</label>
              <select 
                className={paramStyles.select}
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
              >
                <option value="prod">Production (Données live restaurants)</option>
                <option value="preprod">Pré-production (Tests internes)</option>
                <option value="recette">Recette (Intégration partenaire)</option>
              </select>
              <span className={paramStyles.helpText}>Modifie l'URL de base utilisée pour interroger les catalogues ETK360.</span>
            </div>

            <div className={paramStyles.formGroup}>
              <div className={paramStyles.switchContainer}>
                <label className={paramStyles.switch}>
                  <input 
                    type="checkbox" 
                    checked={disableCache}
                    onChange={(e) => setDisableCache(e.target.checked)}
                  />
                  <span className={paramStyles.slider}></span>
                </label>
                <div>
                  <div className={paramStyles.label}>Désactiver le cache local</div>
                  <div className={paramStyles.helpText}>Force le re-téléchargement complet des JSON à chaque action (ralentit l'app mais assure des données fraîches).</div>
                </div>
              </div>
            </div>
            
            <button 
              className={styles.btnSecondary} 
              style={{ marginTop: '1rem', padding: '0.8rem 1.5rem', fontSize: '0.9rem' }}
              onClick={handleClearCache}
            >
              🗑️ Vider le cache manuellement
            </button>
          </section>

          {/* Section Simulation (Impersonation) */}
          <section className={paramStyles.section}>
            <h2 className={paramStyles.sectionTitle}>🕵️ Simulation du point de vente (Impersonation)</h2>
            <p className={paramStyles.helpText} style={{ marginBottom: '1rem' }}>
              Permet de simuler le comportement exact d'une borne ou d'un restaurant spécifique pour reproduire un bug signalé par un client.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className={paramStyles.formGroup}>
                <label className={paramStyles.label}>ID Restaurant (O3K / ETK)</label>
                <input 
                  type="text" 
                  className={paramStyles.input} 
                  value={restaurantIdOverride}
                  onChange={(e) => setRestaurantIdOverride(e.target.value)}
                  placeholder="Ex: RESTO_LYON_PARTDIEU"
                />
              </div>

              <div className={paramStyles.formGroup}>
                <label className={paramStyles.label}>Forcer l'ID de la borne</label>
                <input 
                  type="text" 
                  className={paramStyles.input} 
                  value={kioskIdOverride}
                  onChange={(e) => setKioskIdOverride(e.target.value)}
                  placeholder="Ex: KIOSK_03"
                />
              </div>
            </div>
          </section>

          {/* Section Débogage Borne */}
          <section className={paramStyles.section}>
            <h2 className={paramStyles.sectionTitle}>🐛 Mode Débogage (Borne Visuelle)</h2>
            
            <div className={paramStyles.formGroup}>
              <div className={paramStyles.switchContainer}>
                <label className={paramStyles.switch}>
                  <input 
                    type="checkbox" 
                    checked={debugMode}
                    onChange={(e) => setDebugMode(e.target.checked)}
                  />
                  <span className={paramStyles.slider}></span>
                </label>
                <div>
                  <div className={paramStyles.label}>Activer le Log Détaillé (Console)</div>
                  <div className={paramStyles.helpText}>Affiche les étapes du parsing Softavera et les erreurs de typage JSON directement dans la console du navigateur.</div>
                </div>
              </div>
            </div>

            <div className={paramStyles.formGroup}>
              <div className={paramStyles.switchContainer}>
                <label className={paramStyles.switch}>
                  <input 
                    type="checkbox" 
                    checked={showTechnicalIds}
                    onChange={(e) => setShowTechnicalIds(e.target.checked)}
                  />
                  <span className={paramStyles.slider}></span>
                </label>
                <div>
                  <div className={paramStyles.label}>Affichage des IDs techniques sur la borne</div>
                  <div className={paramStyles.helpText}>Affiche le "MenuId", "DealId" ou "Rank" directement en surimpression sur l'interface de la borne simulée pour faciliter la recherche d'articles invisibles.</div>
                </div>
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
                <span>✓</span> Paramètres appliqués pour le support
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
