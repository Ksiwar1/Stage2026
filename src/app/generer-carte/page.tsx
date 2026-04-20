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
    language: "Français",
    productCountLimit: "3-5",
    categories: [] as string[],
    customCategory: "",
    visualStyle: "Moderne",
    visualTheme: "Coloré",
    primaryColor: "#4f46e5",
    secondaryColor: "#10b981",
    productSizes: "Aucune",
    productSupplements: [] as string[],
    productBadges: [] as string[],
    showAllergens: true,
    outputFormat: "Écran kiosque",
    navigationType: "Parcours guidé",
    structure: "produits",
    options: [] as string[],
    palette: "",
    compositions: { defaultIngredients: "", cookingOptions: false, customSupplements: [] as {name: string, price: number}[], fastSupplementName: "", fastSupplementPrice: "" },
    formulas: { isSeul: true, isMenu: false, menuPrice: 2.50, isMaxi: false, maxiPrice: 3.50 },
    accompaniments: { list: "Frites, Potatoes", hasSizes: false, sizeS: 0, sizeM: 1.0, sizeL: 1.50 },
    drinks: { list: "Coca-Cola, Eau Plate", hasSizes: false, sizeS: 0, sizeM: 0.5, sizeL: 1.0 },
    desserts: { list: "", hasSizes: false, sizeS: 0, sizeM: 0.5, sizeL: 1.0 },
    forcedItems: {} as Record<string, string>
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
      
      const compiledSubject = `
--- INSTRUCTIONS STRUCTURELLES ET CRÉATIVES ---
Je veux générer la carte complète pour un restaurant.
- Nom : ${wizardData.restaurantName}
- Type/Concept : ${wizardData.typeLabel}
- Langue prioritaire : ${wizardData.language}
- Quantité cible de produits par catégorie : environ ${wizardData.productCountLimit}.
- Catégories obligatoires (exactement dans cet ordre) : ${wizardData.categories.join(", ")}.
- Style Visuel souhaité : ${wizardData.visualTheme} / ${wizardData.visualStyle}.
- Tailles requises sur les produits applicables : ${wizardData.productSizes}.
${wizardData.compositions?.defaultIngredients ? `- Ingrédients typiques à distribuer intelligemment dans les descriptions : ${wizardData.compositions.defaultIngredients}.` : ""}
${wizardData.productBadges?.length > 0 ? `- IMPORTANT : Assure-toi de saupoudrer certains produits majeurs de ces badges dans leurs titres : ${wizardData.productBadges.join(", ")}.` : ""}
${wizardData.showAllergens ? `- IMPORTANT : Ajoute explicitement les allergènes typiques (A) à la fin des descriptions.` : ""}
- Affichage global : Orienté pour ${wizardData.outputFormat} en mode ${wizardData.navigationType}.
${Object.keys(wizardData.forcedItems).length > 0 ? 
  `- RÈGLES ABSOLUES SUR LES PRODUITS :\n` + 
  Object.entries(wizardData.forcedItems).map(([cat, items]) => {
      if(items.trim() === "") return "";
      return `  -> Pour la catégorie "${cat}", tu DOIS générer UNIQUEMENT ces produits : ${items}. N'invente rien d'autre.`;
  }).join('\n')
  : ""}

`;
      formData.set("sujet", compiledSubject.trim());
      formData.set("sourceInspiration", wizardData.theme);
      formData.set("systemConfigJSON", JSON.stringify({
          compositions: wizardData.compositions,
          formulas: wizardData.formulas,
          accompaniments: wizardData.accompaniments,
          drinks: wizardData.drinks,
          desserts: wizardData.desserts,
          badges: wizardData.productBadges,
          forcedItems: wizardData.forcedItems
      }));
      formData.set("primaryColor", wizardData.primaryColor);
      formData.set("secondaryColor", wizardData.secondaryColor);
      
      if (wizardData.restaurantName) formData.set("restaurantName", wizardData.restaurantName);

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
      // DEBUG
      if (data.json && data.json.includes('"categories": {}')) {
           setResultat({ success: false, error: "AI generated an empty structure. Raw AI output was: " + archRes.architectureJson });
           return;
      }
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



        <form onSubmit={handleSubmit} encType="multipart/form-data" style={{ display: 'flex', gap: '1rem', flexDirection: 'column', width: '100%', maxWidth: '450px', margin: '0 auto' }}>
          <input type="hidden" name="ai_type" value={selectedAI} />
          <input type="hidden" name="sauvegarder" value="on" />

           <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '2rem' }}>
               <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', color: '#1e293b', fontSize: '1.1rem' }}>Nom du Restaurant <span style={{color: '#ef4444'}}>*</span></label>
               <input
                 type="text"
                 name="restaurantName"
                 required
                 value={wizardData.restaurantName}
                 onChange={(e) => setWizardData({...wizardData, restaurantName: e.target.value})}
                 placeholder="Ex: Burger House..."
                 style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '2px solid #cbd5e1', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}
               />
               <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Ce nom sera utilisé pour la bibliothèque et l'affichage des catalogues.</p>
           </div>


           <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', background: '#4f46e5', color: 'white', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)' }}>
                 📸 Analyse d'Image (OCR)
              </div>
           </div>

           <div style={{ padding: '2rem', border: '2px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', background: '#f8fafc', cursor: 'pointer', position: 'relative', marginBottom: '2rem' }}>
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
                   }
                 }}
                 style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
               />
             </label>
             <img id="image-preview" style={{ display: 'none', width: '100%', maxHeight: '200px', objectFit: 'contain', marginTop: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} alt="Aperçu du menu" />
           </div>

           <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
               <button type="submit" disabled={isGenerating} style={{ padding: '0.8rem 2.5rem', background: '#3b82f6', color: 'white', borderRadius: '999px', cursor: isGenerating ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '1rem', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)', transition: 'transform 0.1s' }}>
                   {isGenerating ? 'Génération en cours...' : '⚡ Générer la carte avec l\'image'}
               </button>
           </div>
           <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', background: '#4f46e5', color: 'white', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)' }}>
                 🪄 Assistant Guidé
              </div>
           </div>

           <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: '#4f46e5' }}>Étape {wizardStep}/6</span>
               </div>

               {wizardStep === 1 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Restaurant & Base</h3>
                   


                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Type de restaurant</label>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      {[
                        { label: 'Fast-Food', val: 'carte1_smash_up.json', icon: '🍔' },
                        { label: 'Fast-Casual', val: 'generique', icon: '🥗' },
                        { label: 'Pizzeria', val: 'carte3_grill_station.json', icon: '🍕' },
                        { label: 'Café', val: 'generique', icon: '☕' }
                      ].map(t => (
                        <button key={t.label} type="button" onClick={() => setWizardData({...wizardData, theme: t.val, typeLabel: t.label})} style={{ padding: '0.8rem', borderRadius: '8px', border: wizardData.typeLabel === t.label ? '2px solid #4f46e5' : '1px solid #cbd5e1', background: wizardData.typeLabel === t.label ? '#e0e7ff' : '#f8fafc', cursor: 'pointer', textAlign: 'left', fontWeight: 600, color: '#334155' }}>
                          {t.icon} {t.label}
                        </button>
                      ))}
                   </div>

                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                       <div>
                           <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Langue</label>
                           <select value={wizardData.language} onChange={(e) => setWizardData({...wizardData, language: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                               <option>Français</option>
                               <option>Anglais</option>
                               <option>Arabe</option>
                               <option>Bilingue FR/EN</option>
                           </select>
                       </div>
                       <div>
                           <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Nb Produits/Cat.</label>
                           <select value={wizardData.productCountLimit} onChange={(e) => setWizardData({...wizardData, productCountLimit: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                               <option>3-5</option>
                               <option>6-10</option>
                               <option>10+</option>
                           </select>
                       </div>
                   </div>

                   <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setWizardStep(2)} disabled={!wizardData.restaurantName || !wizardData.theme} style={{ padding: '0.6rem 1.2rem', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer', opacity: (!wizardData.restaurantName || !wizardData.theme) ? 0.5 : 1 }}>Suivant ➡️</button>
                   </div>
                 </div>
               )}

               {wizardStep === 2 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Catégories & Structure</h3>
                   
                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Catégories standard</label>
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      {['Entrées', 'Burgers', 'Pizzas', 'Tacos', 'Kebabs', 'Sandwichs', 'Salades', 'Menus', 'Boissons', 'Desserts', 'Extras'].map(c => {
                          const isSelected = wizardData.categories.includes(c);
                          return (
                             <button type="button" key={c} onClick={() => {
                                 let newCats = [...wizardData.categories];
                                 if (isSelected) newCats = newCats.filter(x => x !== c);
                                 else newCats.push(c);
                                 setWizardData({...wizardData, categories: newCats});
                             }} style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: isSelected ? '1px solid #4f46e5' : '1px solid #cbd5e1', background: isSelected ? '#4f46e5' : '#f8fafc', color: isSelected ? 'white' : '#475569', cursor: 'pointer', fontWeight: 500 }}>
                                {c}
                             </button>
                          );
                      })}
                   </div>

                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Ordre des catégories sélectionnées</label>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                      {wizardData.categories.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>Aucune catégorie sélectionnée</div> : wizardData.categories.map((c, index) => (
                          <div key={c} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                             <div style={{ flex: 1, marginRight: '1rem' }}>
                                <span style={{ fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>{c}</span>
                                <input type="text" placeholder="Produits exacts imposés ? (ex: Coca, Sprite...)" value={wizardData.forcedItems[c] || ""} onChange={e => setWizardData({...wizardData, forcedItems: {...wizardData.forcedItems, [c]: e.target.value}})} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} title="Si rempli, l'IA n'inventera pas d'autres produits pour cette catégorie." />
                             </div>
                             <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                 <button type="button" onClick={() => {
                                     if(index === 0) return;
                                     const newArr = [...wizardData.categories];
                                     const temp = newArr[index-1];
                                     newArr[index-1] = newArr[index];
                                     newArr[index] = temp;
                                     setWizardData({...wizardData, categories: newArr});
                                 }} disabled={index === 0} style={{ padding: '0.2rem 0.5rem', cursor: 'pointer', border: 'none', background: '#e2e8f0', borderRadius: '4px' }}>↑</button>
                                 <button type="button" onClick={() => {
                                     if(index === wizardData.categories.length - 1) return;
                                     const newArr = [...wizardData.categories];
                                     const temp = newArr[index+1];
                                     newArr[index+1] = newArr[index];
                                     newArr[index] = temp;
                                     setWizardData({...wizardData, categories: newArr});
                                 }} disabled={index === wizardData.categories.length - 1} style={{ padding: '0.2rem 0.5rem', cursor: 'pointer', border: 'none', background: '#e2e8f0', borderRadius: '4px' }}>↓</button>
                             </div>
                          </div>
                      ))}
                   </div>

                   <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      <input type="text" value={wizardData.customCategory} onChange={e => setWizardData({...wizardData, customCategory: e.target.value})} placeholder="Nouvelle catégorie (ex: Tapas)" style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                      <button type="button" onClick={() => {
                          if(wizardData.customCategory.trim()) {
                             setWizardData({...wizardData, categories: [...wizardData.categories, wizardData.customCategory.trim()], customCategory: ""});
                          }
                      }} style={{ padding: '0.8rem 1.2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Ajouter</button>
                   </div>

                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button type="button" onClick={() => setWizardStep(1)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1', background: 'white' }}>⬅️ Retour</button>
                      <button type="button" onClick={() => setWizardStep(3)} disabled={wizardData.categories.length === 0} style={{ padding: '0.6rem 1.2rem', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer', opacity: wizardData.categories.length === 0 ? 0.5 : 1 }}>Suivant ➡️</button>
                   </div>
                 </div>
               )}

               {wizardStep === 3 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Composition & Cuisson</h3>
                   
                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Ingrédients de base retirables (ex: Laitue, Tomate, Oignon)</label>
                   <input type="text" value={wizardData.compositions.defaultIngredients} onChange={e => setWizardData({...wizardData, compositions: {...wizardData.compositions, defaultIngredients: e.target.value}})} placeholder="Séparés par des virgules" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1.5rem' }} />

                   <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 600, color: '#475569' }}>
                       <input type="checkbox" checked={wizardData.compositions.cookingOptions} onChange={e => setWizardData({...wizardData, compositions: {...wizardData.compositions, cookingOptions: e.target.checked}})} style={{ width: '1.2rem', height: '1.2rem' }} />
                       Proposer des cuissons (Saignant, À point, Bien cuit)
                   </label>

                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Suppléments payants</label>
                   <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                       {wizardData.compositions.customSupplements.map((s, idx) => (
                           <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', background: 'white', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                               <span>{s.name} (+{s.price}€)</span>
                               <button type="button" onClick={() => {
                                   const arr = [...wizardData.compositions.customSupplements];
                                   arr.splice(idx, 1);
                                   setWizardData({...wizardData, compositions: {...wizardData.compositions, customSupplements: arr}});
                               }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                           </div>
                       ))}
                       <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                           <input type="text" placeholder="Ex: Fromage" value={wizardData.compositions.fastSupplementName} onChange={e => setWizardData({...wizardData, compositions: {...wizardData.compositions, fastSupplementName: e.target.value}})} style={{ flex: 2, padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                           <input type="number" step="0.1" placeholder="Prix" value={wizardData.compositions.fastSupplementPrice} onChange={e => setWizardData({...wizardData, compositions: {...wizardData.compositions, fastSupplementPrice: e.target.value}})} style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                           <button type="button" onClick={() => {
                               if (wizardData.compositions.fastSupplementName && wizardData.compositions.fastSupplementPrice) {
                                  setWizardData({...wizardData, compositions: {
                                     ...wizardData.compositions,
                                     customSupplements: [...wizardData.compositions.customSupplements, { name: wizardData.compositions.fastSupplementName, price: parseFloat(wizardData.compositions.fastSupplementPrice) }],
                                     fastSupplementName: "", fastSupplementPrice: ""
                                  }});
                               }
                           }} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '0.5rem 1rem', cursor: 'pointer' }}>Ajouter</button>
                       </div>
                   </div>

                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Badges visuels</label>
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      {['Nouveau 🆕', 'Bestseller ⭐', 'Épicé 🌶️', 'Végétarien 🌱'].map(b => {
                          const isSelected = wizardData.productBadges.includes(b);
                          return (
                             <button type="button" key={b} onClick={() => {
                                 let newB = [...wizardData.productBadges];
                                 if (isSelected) newB = newB.filter(x => x !== b);
                                 else newB.push(b);
                                 setWizardData({...wizardData, productBadges: newB});
                             }} style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: isSelected ? '1px solid #10b981' : '1px solid #cbd5e1', background: isSelected ? '#dcfce7' : '#f8fafc', color: isSelected ? '#065f46' : '#475569', cursor: 'pointer', fontWeight: 500 }}>
                                {b}
                             </button>
                          );
                      })}
                   </div>

                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button type="button" onClick={() => setWizardStep(2)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1', background: 'white' }}>⬅️ Retour</button>
                      <button type="button" onClick={() => setWizardStep(4)} style={{ padding: '0.6rem 1.2rem', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Suivant ➡️</button>
                   </div>
                 </div>
               )}

               {wizardStep === 4 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Formules & Menus</h3>
                   
                   <div style={{ marginBottom: '1.5rem' }}>
                       <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#475569', padding: '1rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                           <input type="checkbox" checked={wizardData.formulas.isSeul} onChange={e => setWizardData({...wizardData, formulas: {...wizardData.formulas, isSeul: e.target.checked}})} style={{ width: '1.2rem', height: '1.2rem' }} />
                           Proposer "Produit Seul" (Prix de base)
                       </label>
                   </div>

                   <div style={{ marginBottom: '1.5rem', padding: '1rem', background: wizardData.formulas.isMenu ? '#eef2ff' : '#f8fafc', border: wizardData.formulas.isMenu ? '2px solid #4f46e5' : '1px solid #cbd5e1', borderRadius: '8px' }}>
                       <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#475569', marginBottom: wizardData.formulas.isMenu ? '1rem' : '0' }}>
                           <input type="checkbox" checked={wizardData.formulas.isMenu} onChange={e => setWizardData({...wizardData, formulas: {...wizardData.formulas, isMenu: e.target.checked}})} style={{ width: '1.2rem', height: '1.2rem' }} />
                           Proposer en "Menu" (+ Boisson & Accompagnement)
                       </label>
                       {wizardData.formulas.isMenu && (
                           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '2rem' }}>
                               <span>Surcoût du menu :</span>
                               <input type="number" step="0.1" value={wizardData.formulas.menuPrice} onChange={e => setWizardData({...wizardData, formulas: {...wizardData.formulas, menuPrice: parseFloat(e.target.value)}})} style={{ width: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                               <span>€</span>
                           </div>
                       )}
                   </div>

                   <div style={{ marginBottom: '1.5rem', padding: '1rem', background: wizardData.formulas.isMaxi ? '#fffbeb' : '#f8fafc', border: wizardData.formulas.isMaxi ? '2px solid #d97706' : '1px solid #cbd5e1', borderRadius: '8px' }}>
                       <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#475569', marginBottom: wizardData.formulas.isMaxi ? '1rem' : '0' }}>
                           <input type="checkbox" checked={wizardData.formulas.isMaxi} onChange={e => setWizardData({...wizardData, formulas: {...wizardData.formulas, isMaxi: e.target.checked}})} style={{ width: '1.2rem', height: '1.2rem' }} />
                           Proposer en "Maxi Menu"
                       </label>
                       {wizardData.formulas.isMaxi && (
                           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '2rem' }}>
                               <span>Surcoût du maxi menu :</span>
                               <input type="number" step="0.1" value={wizardData.formulas.maxiPrice} onChange={e => setWizardData({...wizardData, formulas: {...wizardData.formulas, maxiPrice: parseFloat(e.target.value)}})} style={{ width: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                               <span>€</span>
                           </div>
                       )}
                   </div>

                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button type="button" onClick={() => setWizardStep(3)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1', background: 'white' }}>⬅️ Retour</button>
                      <button type="button" onClick={() => setWizardStep(5)} style={{ padding: '0.6rem 1.2rem', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Suivant ➡️</button>
                   </div>
                 </div>
               )}

               {wizardStep === 5 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Composition des Menus (Accomp. / Boissons / Desserts)</h3>
                   
                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>🍔 Accompagnements (Séparés par des virgules)</label>
                   <input type="text" value={wizardData.accompaniments.list} onChange={e => setWizardData({...wizardData, accompaniments: {...wizardData.accompaniments, list: e.target.value}})} placeholder="Frites, Potatoes..." style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1rem' }} />

                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>🥤 Boissons Menu (Séparées par des virgules)</label>
                   <input type="text" value={wizardData.drinks.list} onChange={e => setWizardData({...wizardData, drinks: {...wizardData.drinks, list: e.target.value}})} placeholder="Coca-Cola, Eau Plate, Fanta..." style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1rem' }} />

                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>🍦 Desserts Menu (Optionnel)</label>
                   <input type="text" value={wizardData.desserts.list} onChange={e => setWizardData({...wizardData, desserts: {...wizardData.desserts, list: e.target.value}})} placeholder="McFlurry, Sundae (Laisser vide si aucun)" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1.5rem' }} />

                   <div style={{ background: '#f8fafc', padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '1.5rem' }}>
                       <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 600, color: '#475569' }}>
                           <input type="checkbox" checked={wizardData.accompaniments.hasSizes} onChange={e => {
                               const v = e.target.checked;
                               setWizardData({...wizardData, 
                                 accompaniments: {...wizardData.accompaniments, hasSizes: v},
                                 drinks: {...wizardData.drinks, hasSizes: v},
                                 desserts: {...wizardData.desserts, hasSizes: v}
                               })
                           }} style={{ width: '1.2rem', height: '1.2rem' }} />
                           Proposer des tailles pour Accompagnements & Boissons (S, M, L)
                       </label>

                       {wizardData.accompaniments.hasSizes && (
                           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                               <div>
                                   <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Surlcoût Taille S (€)</label>
                                   <input type="number" step="0.1" value={wizardData.accompaniments.sizeS} onChange={e => setWizardData({...wizardData, accompaniments: {...wizardData.accompaniments, sizeS: parseFloat(e.target.value)}, drinks: {...wizardData.drinks, sizeS: parseFloat(e.target.value)}, desserts: {...wizardData.desserts, sizeS: parseFloat(e.target.value)}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                               </div>
                               <div>
                                   <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Surlcoût Taille M (€)</label>
                                   <input type="number" step="0.1" value={wizardData.accompaniments.sizeM} onChange={e => setWizardData({...wizardData, accompaniments: {...wizardData.accompaniments, sizeM: parseFloat(e.target.value)}, drinks: {...wizardData.drinks, sizeM: parseFloat(e.target.value)}, desserts: {...wizardData.desserts, sizeM: parseFloat(e.target.value)}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                               </div>
                               <div>
                                   <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Surlcoût Taille L (€)</label>
                                   <input type="number" step="0.1" value={wizardData.accompaniments.sizeL} onChange={e => setWizardData({...wizardData, accompaniments: {...wizardData.accompaniments, sizeL: parseFloat(e.target.value)}, drinks: {...wizardData.drinks, sizeL: parseFloat(e.target.value)}, desserts: {...wizardData.desserts, sizeL: parseFloat(e.target.value)}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                               </div>
                           </div>
                       )}
                   </div>

                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button type="button" onClick={() => setWizardStep(4)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1', background: 'white' }}>⬅️ Retour</button>
                      <button type="button" onClick={() => setWizardStep(6)} style={{ padding: '0.6rem 1.2rem', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Suivant ➡️</button>
                   </div>
                 </div>
               )}

               {wizardStep === 6 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Style Visuel & Couleurs</h3>
                   
                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Thème / Ambiance</label>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      {['Clair', 'Sombre', 'Coloré', 'Épuré'].map(t => (
                        <button type="button" key={t} onClick={() => setWizardData({...wizardData, visualTheme: t})} style={{ padding: '0.8rem', borderRadius: '8px', border: wizardData.visualTheme === t ? '2px solid #4f46e5' : '1px solid #cbd5e1', background: wizardData.visualTheme === t ? '#e0e7ff' : '#f8fafc', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
                          {t}
                        </button>
                      ))}
                   </div>

                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Couleurs Exactes (Optionnel)</label>
                   <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <input type="color" value={wizardData.primaryColor} onChange={e => setWizardData({...wizardData, primaryColor: e.target.value})} style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }} />
                         <span style={{ fontSize: '0.9rem' }}>Primaire</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <input type="color" value={wizardData.secondaryColor} onChange={e => setWizardData({...wizardData, secondaryColor: e.target.value})} style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }} />
                         <span style={{ fontSize: '0.9rem' }}>Secondaire</span>
                      </div>
                   </div>

                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Style de Carte</label>
                   <select value={wizardData.visualStyle} onChange={(e) => setWizardData({...wizardData, visualStyle: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1.5rem' }}>
                       <option>Moderne</option>
                       <option>Classique</option>
                       <option>Minimaliste</option>
                       <option>Bold</option>
                   </select>

                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button type="button" onClick={() => setWizardStep(5)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1', background: 'white' }}>⬅️ Retour</button>
                      <button type="button" onClick={() => setWizardStep(7)} style={{ padding: '0.6rem 1.2rem', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Suivant ➡️</button>
                   </div>
                 </div>
               )}

               {wizardStep === 7 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Format de Sortie & Affichage</h3>
                   
                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Format d'affichage</label>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      {['Écran kiosque', 'Tablette', 'Impression A4', 'QR Code menu'].map(f => (
                        <button type="button" key={f} onClick={() => setWizardData({...wizardData, outputFormat: f})} style={{ padding: '0.8rem', borderRadius: '8px', border: wizardData.outputFormat === f ? '2px solid #4f46e5' : '1px solid #cbd5e1', background: wizardData.outputFormat === f ? '#e0e7ff' : '#f8fafc', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
                          {f}
                        </button>
                      ))}
                   </div>

                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Type de navigation temporelle</label>
                   <select value={wizardData.navigationType} onChange={(e) => setWizardData({...wizardData, navigationType: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1.5rem' }}>
                       <option>Parcours guidé (étapes obligatoires)</option>
                       <option>Menu classique (tout visible catégorisé)</option>
                       <option>Carrousel interactif</option>
                   </select>

                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button type="button" onClick={() => setWizardStep(6)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1', background: 'white' }}>⬅️ Retour</button>
                      <button type="button" onClick={() => setWizardStep(8)} style={{ padding: '0.6rem 1.2rem', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Voir le Récapitulatif ➡️</button>
                   </div>
                 </div>
               )}

               {wizardStep === 8 && (
                 <div>
                   <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b', textAlign: 'center' }}>✨ Récapitulatif & Génération</h3>
                   
                   <div style={{ background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                         <span style={{ color: '#64748b' }}>Restaurant :</span>
                         <span style={{ fontWeight: 600 }}>{wizardData.restaurantName} ({wizardData.language})</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                         <span style={{ color: '#64748b' }}>Type :</span>
                         <span style={{ fontWeight: 600 }}>{wizardData.typeLabel}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                         <span style={{ color: '#64748b' }}>Catégories :</span>
                         <span style={{ fontWeight: 600 }}>{wizardData.categories.length} sections ({wizardData.productCountLimit} prod.)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                         <span style={{ color: '#64748b' }}>Formules :</span>
                         <span style={{ fontWeight: 600 }}>{wizardData.formulas.isMenu ? "Menu OK" : "Seul"}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                         <span style={{ color: '#64748b' }}>Design :</span>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 600 }}>{wizardData.visualTheme} / {wizardData.visualStyle}</span>
                            <div style={{ width: '15px', height: '15px', background: wizardData.primaryColor, borderRadius: '50%' }}></div>
                            <div style={{ width: '15px', height: '15px', background: wizardData.secondaryColor, borderRadius: '50%' }}></div>
                         </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                          <button type="button" onClick={() => setWizardStep(1)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#475569' }}>✏️ Tout Revoir (Modifier)</button>
                      </div>
                   </div>

                   <button type="submit" disabled={isGenerating} className={styles.button_primary} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', opacity: isGenerating ? 0.5 : 1 }}>
                     {isGenerating ? "⏳ L'IA construit votre carte..." : "🚀 Lancer la Génération IA"}
                   </button>
                 </div>
               )}            </div>

          
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
                 themePalette={{ primary: wizardData.primaryColor, secondary: wizardData.secondaryColor, text: '#111827', onPrimary: 'white' }} 
              />
           </div>
        </div>
      )}

    </main>
  );
}
