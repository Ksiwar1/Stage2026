'use client';

import styles from "../page.module.css";
import Link from "next/link";
import { useState } from "react";
import { genererUneNouvelleCarte } from "../actions/genererCarteAction";

export default function GenererCarte() {
  const [resultat, setResultat] = useState<{ success: boolean; json?: string; savedPath?: string | null; error?: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsGenerating(true);
    setResultat(null);

    try {
      const formData = new FormData(e.currentTarget);
      const codeGenereStr = await genererUneNouvelleCarte(formData);
      const data = JSON.parse(codeGenereStr);
      setResultat(data);
    } catch(err) {
      setResultat({ success: false, error: "Erreur technique côté client lors de la réception." });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className={`${styles.main} ${styles.heroImageBg}`}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Générateur de cartes</h1>
        <p className={styles.description}>
          L'Intelligence Artificielle de Google (Gemini) est connectée à vos cartes. Tapez un sujet et laissez la magie opérer.
        </p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', flexDirection: 'column', width: '100%', maxWidth: '450px', margin: '0 auto' }}>
          <input 
            type="text" 
            name="sujet" 
            placeholder="Ex : Carte de fidélité pour fast-food..." 
            required 
            style={{ padding: '1.2rem', borderRadius: '12px', border: '1px solid #d1d5db', fontSize: '1.05rem', background: '#ffffff', color: '#111827', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.03)' }}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#4b5563', fontSize: '0.95rem', cursor: 'pointer', padding: '0.5rem 0' }}>
            <input type="checkbox" name="sauvegarder" style={{ width: '1.2rem', height: '1.2rem', accentColor: '#2563eb' }} defaultChecked />
            Sauvegarder physiquement dans le projet
          </label>

          <button type="submit" disabled={isGenerating} className={styles.button_primary} style={{ opacity: isGenerating ? 0.7 : 1 }}>
            {isGenerating ? "✨ Gemini réfléchit..." : "🌟 Générer par IA"}
          </button>
        </form>

        <Link href="/menu" className={styles.backButton}>
          <span>&lt;-</span> Retour au tableau de bord
        </Link>
      </div>

      {resultat && (
        <div className={styles.grid} style={{ marginTop: '3rem', justifyContent: 'center' }}>
          <div className={styles.card} style={{ flexBasis: '100%', maxWidth: '800px', cursor: 'default' }}>
            {resultat.success ? (
              <>
                <h2 style={{ color: '#059669', fontSize: '1.5rem', marginBottom: '1rem' }}>✅ Carte générée avec succès !</h2>
                {resultat.savedPath && (
                  <div style={{ background: '#dcfce7', color: '#166534', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: '500' }}>
                    💾 Magnifique ! La carte a été sauvegardée dans : <code>.softavera/carte/{resultat.savedPath}</code>
                  </div>
                )}
                
                <h3 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Code Brut (JSON)</h3>
                <pre style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "1.5rem", borderRadius: "12px", color: "#334155", overflowX: "auto", fontSize: "0.95rem" }}>
                  <code>{resultat.json}</code>
                </pre>
              </>
            ) : (
               <>
                 <h2 style={{ color: '#dc2626' }}>❌ Erreur de l'IA</h2>
                 <p style={{ color: '#b91c1c', background: '#fee2e2', padding: '1rem', borderRadius: '8px' }}>{resultat.error}</p>
               </>
            )}
          </div>
        </div>
      )}


    </main>
  );
}
