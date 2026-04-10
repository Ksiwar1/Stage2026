'use client';

import styles from "../page.module.css";
import Link from "next/link";
import { useState } from "react";
import { genererUneNouvelleCarte } from "../actions/genererCarteAction";
import KioskSimulator from "../../components/KioskSimulator";
import { parseETK360Hierarchy } from "../../lib/softaveraParser";

const AI_PROVIDERS = [
  { value: "groq", label: "Groq (Llama 3.3 70B)", icon: "🟢", tag: "Gratuit" },
  { value: "gemini", label: "Gemini 2.0 Flash", icon: "🔵", tag: "Gratuit" },
  { value: "claude", label: "Claude Sonnet", icon: "🟠", tag: "Payant" },
];

export default function GenererCarte() {
  const [resultat, setResultat] = useState<{ success: boolean; json?: string; savedPath?: string | null; error?: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAI, setSelectedAI] = useState("groq");

  // States Modal Visualisation
  const [isVisualizing, setIsVisualizing] = useState<boolean>(false);
  const [parsedTree, setParsedTree] = useState<any[]>([]);
  const [rawData, setRawData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsGenerating(true);
    setResultat(null);

    try {
      const formData = new FormData(e.currentTarget);
      const codeGenereStr = await genererUneNouvelleCarte(formData);
      const data = JSON.parse(codeGenereStr);
      setResultat(data);
      
      // Stockage préventif
      if (data.success && data.json) {
         try {
           const parsedJson = JSON.parse(data.json);
           setRawData(parsedJson);
           setParsedTree(parseETK360Hierarchy(parsedJson));
         } catch(e) {
           console.error("Erreur de formatage UI internal:", e);
         }
      }
    } catch(err) {
      setResultat({ success: false, error: "Erreur technique côté client lors de la réception." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!resultat?.json) return;
    const blob = new Blob([resultat.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carte_ia_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openVisualizer = () => {
    if (parsedTree.length > 0) {
       setIsVisualizing(true);
    } else {
       alert("Aucun arbre valide généré.");
    }
  };

  return (
    <main className={`${styles.main} ${styles.heroImageBg}`}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Générateur de cartes</h1>
        <p className={styles.description}>
          L'Intelligence Artificielle est connectée à vos cartes. Tapez un sujet et laissez la magie opérer.
        </p>

        {/* Sélecteur AI Provider */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {AI_PROVIDERS.map((ai) => (
            <button
              key={ai.value}
              type="button"
              onClick={() => setSelectedAI(ai.value)}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '999px',
                border: selectedAI === ai.value ? '2px solid #4f46e5' : '2px solid #e5e7eb',
                background: selectedAI === ai.value ? '#eef2ff' : '#ffffff',
                color: selectedAI === ai.value ? '#4f46e5' : '#6b7280',
                fontWeight: selectedAI === ai.value ? 700 : 500,
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>{ai.icon}</span>
              <span>{ai.label}</span>
              <span style={{
                fontSize: '0.7rem',
                padding: '0.15rem 0.4rem',
                borderRadius: '999px',
                background: ai.tag === "Gratuit" ? '#dcfce7' : '#fef3c7',
                color: ai.tag === "Gratuit" ? '#166534' : '#92400e',
                fontWeight: 600,
              }}>
                {ai.tag}
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', flexDirection: 'column', width: '100%', maxWidth: '450px', margin: '0 auto' }}>
          <input type="hidden" name="ai_type" value={selectedAI} />
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
            {isGenerating ? `${AI_PROVIDERS.find(a => a.value === selectedAI)?.icon} ${AI_PROVIDERS.find(a => a.value === selectedAI)?.label} réfléchit...` : "🌟 Générer par IA"}
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
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', marginTop: '2rem' }}>
                   <h3 style={{ fontSize: '1rem', color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Code Brut (JSON)</h3>
                   <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button onClick={handleDownload} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                         ⬇️ Télécharger
                      </button>
                      <button onClick={openVisualizer} style={{ padding: '0.5rem 1rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                         👁️ Visualiser
                      </button>
                   </div>
                </div>
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




      {/* MODAL SIMULATEUR */}
      {isVisualizing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column' }}>
           <div style={{ padding: '1rem', display: 'flex', justifyContent: 'flex-end', background: '#111827' }}>
              <button 
                onClick={() => setIsVisualizing(false)}
                style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                 ✕ Fermer la Visualisation
              </button>
           </div>
           <div style={{ flex: 1, position: 'relative', background: '#f9fafb', overflow: 'hidden' }}>
              <KioskSimulator 
                 restaurantName="Restaurant IA"
                 tree={parsedTree} 
                 catalogData={rawData}
                 themePalette={{ primary: '#4f46e5', secondary: '#4338ca', text: '#111827', onPrimary: 'white' }} 
              />
           </div>
        </div>
      )}

    </main>
  );
}
