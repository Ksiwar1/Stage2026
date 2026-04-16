'use client';

import styles from "../page.module.css";
import Link from "next/link";
import { useState, useEffect } from "react";
import { genererArchitectureAction, enrichirCarteAction, getAvailableLibraryCards } from "../actions/genererCarteAction";
import KioskSimulator from "../../components/KioskSimulator";
import { parseETK360Hierarchy } from "../../lib/softaveraParser";

const AI_PROVIDERS = [
  { value: "groq", label: "Groq (Llama 3.1 8B)", icon: "🟢", tag: "Gratuit" },
  { value: "gemini", label: "Gemini 2.0 Flash", icon: "🔵", tag: "Gratuit" },
  { value: "claude", label: "Claude Sonnet", icon: "🟠", tag: "Payant" },
];

export default function GenererCarte() {
  const [resultat, setResultat] = useState<{ success: boolean; json?: string; savedPath?: string | null; error?: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepText, setGenerationStepText] = useState<string>("");
  const [selectedAI, setSelectedAI] = useState("groq");

  // States Modal Visualisation
  const [isVisualizing, setIsVisualizing] = useState<boolean>(false);
  const [parsedTree, setParsedTree] = useState<any[]>([]);
  const [rawData, setRawData] = useState<any>(null);
  const [libraryCards, setLibraryCards] = useState<string[]>([]);
  const [submittedRestaurantName, setSubmittedRestaurantName] = useState<string>("RESTAURANT IA");

  // States Wizard Assistant
  const [activeTab, setActiveTab] = useState<"libre" | "wizard">("libre");
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    restaurantName: "",
    theme: "",
    typeLabel: "",
    categories: [] as string[],
    structure: "produits",
    options: [] as string[],
    palette: ""
  });

  useEffect(() => {
    getAvailableLibraryCards().then(setLibraryCards).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsGenerating(true);
    setGenerationStepText("🏗️ 1/2 : Création de l'architecture du parcours...");
    setResultat(null);

    try {
      const formData = new FormData(e.currentTarget);
      
      if (activeTab === "wizard") {
        const compiledSubject = `Je veux un vrai restaurant de type ${wizardData.typeLabel}. Catégories requises : ${wizardData.categories.join(", ")}. 
Format de vente : ${wizardData.structure === "menus" ? "Créer absolument des Formules Menus complexes avec des étapes de choix obligatoires. Règle absolue pour l'ordre des steps (utiliser le 'rank'): 1. Viande/Base, 2. Frites/Accompagnement, 3. Sauces, 4. Boisson, 5. Dessert. ATTENTION : Garde bien la DÉFINITION du contenu des 'steps' (avec leurs 'items' et 'minChoices') EXCLUSIVEMENT à la racine du JSON. Dans le 'modifier', tu fais juste le lien avec le 'rank'." : "Uniquement des produits simples en vente directe, sans format menu."} 
Options à inclure globalement : ${wizardData.options.join(", ")}. 
${wizardData.palette ? `PALETTE GRAPHIQUE STRICTE (N'invente aucune couleur) : ${wizardData.palette}` : ""}
ATTENTION : Génère un large choix (ex: 3 à 4 produits différents par catégorie, plusieurs choix de viandes, plusieurs boissons). N'oublie pas de définir tous tes items dans le dictionnaire "items".`;
        formData.set("sujet", compiledSubject);
        formData.set("sourceInspiration", wizardData.theme);
        if (wizardData.restaurantName) formData.set("restaurantName", wizardData.restaurantName);
      }

      setSubmittedRestaurantName((formData.get("restaurantName") as string) || "RESTAURANT IA");

      // Étape 1 : Architecture
      const archRes = await genererArchitectureAction(formData);
      if (!archRes.success || !archRes.architectureJson) {
         setResultat({ success: false, error: archRes.error || "Échec inattendu de la Phase 1." });
         setIsGenerating(false);
         setGenerationStepText("");
         return;
      }

      // Étape 2 : Produits (Enrichissement)
      setGenerationStepText("🍔 2/2 : Ajout des produits et options (Patience)...");
      const enrichResStr = await enrichirCarteAction(
         formData, 
         archRes.architectureJson, 
         archRes.activeSourceInspiration || "", 
         archRes.activeSecondaryInspirations || []
      );
      const data = JSON.parse(enrichResStr);
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
      setGenerationStepText("");
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

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
           <button 
              onClick={() => setActiveTab("libre")}
              style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', border: 'none', background: activeTab === "libre" ? '#4f46e5' : '#e2e8f0', color: activeTab === "libre" ? 'white' : '#64748b', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}
           >
              ✏️ Mode Libre & OCR
           </button>
           <button 
              onClick={() => setActiveTab("wizard")}
              style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', border: 'none', background: activeTab === "wizard" ? '#4f46e5' : '#e2e8f0', color: activeTab === "wizard" ? 'white' : '#64748b', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}
           >
              🪄 Assistant Guidé
           </button>
        </div>

        <form onSubmit={handleSubmit} encType="multipart/form-data" style={{ display: 'flex', gap: '1rem', flexDirection: 'column', width: '100%', maxWidth: '450px', margin: '0 auto' }}>
          <input type="hidden" name="ai_type" value={selectedAI} />
          <input type="hidden" name="sauvegarder" value="on" />

          {activeTab === "libre" ? (
            <>
              <div style={{ padding: '2rem', border: '2px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', background: '#f8fafc', cursor: 'pointer', position: 'relative' }}>
                 <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#475569' }}>
                   <span style={{ fontSize: '2rem' }}>📸</span>
                   <span style={{ fontWeight: 600 }}>Importer une photo de menu</span>
                   <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Optionnel : L'IA lira l'image (OCR) pour générer la carte.</span>
                   <input 
                     type="file" 
                     name="menuImage" 
                     accept="image/*" 
                     onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) {
                         const url = URL.createObjectURL(file);
                         const previewImg = document.getElementById('image-preview') as HTMLImageElement;
                         if (previewImg) { previewImg.src = url; previewImg.style.display = 'block'; }
                         const subInput = document.getElementById('sujet-input') as HTMLInputElement;
                         if (subInput) subInput.required = false;
                       }
                     }}
                     style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                   />
                 </label>
                 <img id="image-preview" style={{ display: 'none', width: '100%', maxHeight: '200px', objectFit: 'contain', marginTop: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} alt="Aperçu du menu" />
              </div>

              <p style={{ textAlign: 'center', margin: '0.5rem 0', fontWeight: 700, color: '#64748b' }}>OU / ET</p>

              <input
                type="text"
                name="restaurantName"
                placeholder="Nom du Restaurant (Ex: Pizza Roma)"
                style={{ padding: '1.2rem', borderRadius: '12px', border: '1px solid #d1d5db', fontSize: '1.05rem', background: '#ffffff', color: '#111827', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.03)' }}
              />

              <input
                id="sujet-input"
                type="text"
                name="sujet"
                placeholder="Ex : Carte de fidélité pour fast-food..."
                required={activeTab === "libre"}
                style={{ padding: '1.2rem', borderRadius: '12px', border: '1px solid #d1d5db', fontSize: '1.05rem', background: '#ffffff', color: '#111827', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.03)' }}
              />

              <select 
                name="sourceInspiration"
                style={{ padding: '1rem', borderRadius: '12px', border: '1px solid #d1d5db', fontSize: '1rem', background: '#f8fafc', color: '#334155', outline: 'none' }}
              >
                <option value="generique">💡 Architecture ETK360 Standard (Générique)</option>
                {libraryCards.map(file => (
                   <option key={file} value={file}>🎯 S'inspirer de : {file.replace('.json', '')}</option>
                ))}
              </select>
            </>
          ) : (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
               {wizardStep === 1 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Étape 1/4 : Restaurant</h3>
                   <input
                     type="text"
                     value={wizardData.restaurantName}
                     onChange={(e) => setWizardData({...wizardData, restaurantName: e.target.value})}
                     placeholder="Nom de l'enseigne (Ex: O'Tacos)"
                     style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1.5rem', fontSize: '1rem' }}
                   />

                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Type de restaurant ?</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {[
                        { label: 'Fast-Food / Burger', val: 'carte1_smash_up.json' },
                        { label: 'Pizzeria / Grill', val: 'carte3_grill_station.json' },
                        { label: 'Tacos / Kebab', val: 'carte5_etoile_orientale.json' },
                        { label: 'Standard ETK360', val: 'generique' }
                      ].map(t => (
                        <button key={t.val} type="button" onClick={() => { setWizardData({...wizardData, theme: t.val, typeLabel: t.label}); setWizardStep(2); }} style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', textAlign: 'left', fontWeight: 600, color: '#334155' }}>
                          🌮 {t.label}
                        </button>
                      ))}
                   </div>
                 </div>
               )}

               {wizardStep === 2 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Étape 2/5 : Catégories à proposer ?</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                      {['Burgers/Sandwichs', 'Pizzas', 'Boissons', 'Desserts', 'Accompagnements'].map(c => (
                         <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: '#f1f5f9', borderRadius: '6px', cursor: 'pointer' }}>
                           <input type="checkbox" checked={wizardData.categories.includes(c)} onChange={(e) => {
                              const newCat = e.target.checked ? [...wizardData.categories, c] : wizardData.categories.filter(x => x !== c);
                              setWizardData({...wizardData, categories: newCat});
                           }} style={{ width: '1.2rem', height: '1.2rem' }}/>
                           <span style={{ color: '#475569', fontWeight: 500 }}>{c}</span>
                         </label>
                      ))}
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button type="button" onClick={() => setWizardStep(1)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Retour</button>
                      <button type="button" onClick={() => setWizardStep(3)} disabled={wizardData.categories.length === 0} style={{ padding: '0.5rem 1rem', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer', opacity: wizardData.categories.length === 0 ? 0.5 : 1 }}>Suivant</button>
                   </div>
                 </div>
               )}

               {wizardStep === 3 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Étape 3/5 : Structure de la vente ?</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '1rem', background: wizardData.structure === 'produits' ? '#e0e7ff' : '#f1f5f9', border: wizardData.structure === 'produits' ? '2px solid #4f46e5' : '2px solid transparent', borderRadius: '8px', cursor: 'pointer' }}>
                        <input type="radio" checked={wizardData.structure === 'produits'} onChange={() => setWizardData({...wizardData, structure: 'produits'})} style={{ marginTop: '0.2rem' }} />
                        <div>
                           <div style={{ fontWeight: 600, color: '#1e293b' }}>Produits Simples Uniquement</div>
                           <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Ex: Achats directs.</div>
                        </div>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '1rem', background: wizardData.structure === 'menus' ? '#e0e7ff' : '#f1f5f9', border: wizardData.structure === 'menus' ? '2px solid #4f46e5' : '2px solid transparent', borderRadius: '8px', cursor: 'pointer' }}>
                        <input type="radio" checked={wizardData.structure === 'menus'} onChange={() => setWizardData({...wizardData, structure: 'menus'})} style={{ marginTop: '0.2rem' }} />
                        <div>
                           <div style={{ fontWeight: 600, color: '#1e293b' }}>Intégrer des Formules Menus</div>
                           <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Ex: Étapes de choix pour la boisson/sauce.</div>
                        </div>
                      </label>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button type="button" onClick={() => setWizardStep(2)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Retour</button>
                      <button type="button" onClick={() => setWizardStep(4)} style={{ padding: '0.5rem 1rem', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Suivant</button>
                   </div>
                 </div>
               )}

               {wizardStep === 4 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Étape 4/5 : Ambiance Visuelle ?</h3>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                      {[
                        { label: 'Minimaliste (N&B)', val: '["#FFFFFF","#F9F9F9","#000000","#333333","#E0E0E0"]', colors: ['#FFFFFF', '#F9F9F9', '#000000', '#333333', '#E0E0E0'] },
                        { label: 'Cyberpunk (Néon)', val: '["#0B0C10","#1F2833","#66FCF1","#C5C6C7","#45A29E"]', colors: ['#0B0C10', '#1F2833', '#66FCF1', '#C5C6C7', '#45A29E'] },
                        { label: 'Terre & Nature', val: '["#2E3B32","#DFD4B8","#B58F66","#D9D9D9","#8F250C"]', colors: ['#2E3B32', '#DFD4B8', '#B58F66', '#D9D9D9', '#8F250C'] },
                        { label: 'Fast-Food (Rouge)', val: '["#FFFFFF","#FFFBEB","#DC2626","#111827","#FBBF24"]', colors: ['#FFFFFF', '#FFFBEB', '#DC2626', '#111827', '#FBBF24'] },
                      ].map(p => (
                        <label key={p.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: wizardData.palette === p.val ? '#e0e7ff' : '#f1f5f9', border: wizardData.palette === p.val ? '2px solid #4f46e5' : '2px solid transparent', borderRadius: '8px', cursor: 'pointer', textAlign: 'center' }}>
                          <input type="radio" checked={wizardData.palette === p.val} onChange={() => setWizardData({...wizardData, palette: p.val})} style={{ display: 'none' }} />
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.2rem' }}>
                            {p.colors.map((c, i) => (
                               <div key={i} style={{ width: '16px', height: '16px', borderRadius: '50%', background: c, border: c === '#FFFFFF' ? '1px solid #e2e8f0' : 'none' }} />
                            ))}
                          </div>
                          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{p.label}</span>
                        </label>
                      ))}
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button type="button" onClick={() => setWizardStep(3)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Retour</button>
                      <button type="button" onClick={() => setWizardStep(5)} disabled={!wizardData.palette} style={{ padding: '0.5rem 1rem', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer', opacity: !wizardData.palette ? 0.5 : 1 }}>Suivant</button>
                   </div>
                 </div>
               )}

               {wizardStep === 5 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Étape 5/5 : Options requises ?</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                      {['Tailles (S, M, L)', 'Sauces au choix', 'Cuisson de la viande', 'Ingrédients Supplémentaires'].map(o => (
                         <label key={o} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: '#f1f5f9', borderRadius: '6px', cursor: 'pointer' }}>
                           <input type="checkbox" checked={wizardData.options.includes(o)} onChange={(e) => {
                              const newOpt = e.target.checked ? [...wizardData.options, o] : wizardData.options.filter(x => x !== o);
                              setWizardData({...wizardData, options: newOpt});
                           }} style={{ width: '1.2rem', height: '1.2rem' }}/>
                           <span style={{ color: '#475569', fontWeight: 500 }}>{o}</span>
                         </label>
                      ))}
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button type="button" onClick={() => setWizardStep(4)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Retour</button>
                      <span style={{ color: '#059669', fontWeight: 600 }}>✨ Prêt à générer !</span>
                   </div>
                 </div>
               )}
            </div>
          )}

          <button type="submit" disabled={isGenerating || (activeTab === "wizard" && wizardStep !== 5)} className={styles.button_primary} style={{ opacity: isGenerating || (activeTab === "wizard" && wizardStep !== 5) ? 0.5 : 1, marginTop: '1rem' }}>
            {isGenerating ? generationStepText : "🌟 Générer la Carte"}
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


      {/* MODAL DE CHARGEMENT IA */}
      {isGenerating && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinnerContainer}>
            <div className={styles.spinner}></div>
            <div className={styles.spinnerCenter}>✨</div>
          </div>
          <h2 className={styles.loadingText}>Création en cours...</h2>
          <div className={styles.loadingSubtext}>{generationStepText}</div>
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
                 restaurantName={submittedRestaurantName}
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
