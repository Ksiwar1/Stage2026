'use client';

// Force chunk invalidation - Action ID reset
import styles from "../page.module.css";
import Link from "next/link";
import { useState, useEffect } from "react";
import { genererArchitectureAction, enrichirCarteAction, getAvailableLibraryCards } from "../actions/genererCarteAction";
import KioskSimulator from "../../components/KioskSimulator";
import { parseETK360Hierarchy } from "../../lib/softaveraParser";
import { useLanguage } from '../../lib/LanguageContext';
import LogoMarquee from '../../components/LogoMarquee';


const AI_PROVIDERS = [
  { value: "groq", label: "Groq (Llama 3.1 8B)", icon: "🟢", tag: "Gratuit" },
  { value: "gemini", label: "Gemini 2.0 Flash", icon: "🔵", tag: "Gratuit" },
  { value: "claude", label: "Claude Sonnet", icon: "🟠", tag: "Payant" },
];

const GLOBAL_DRINKS_LIST = [
  "Coca-Cola", "Coca-Cola Zéro", "Fanta", "Sprite", "Ice Tea", "Oasis", "Perrier", "Eau Plate", "Jus d'orange", "Jus de pomme"
];


export default function GenererCarte() {
  const { t } = useLanguage();
  const [resultat, setResultat] = useState<{ success: boolean; json?: string; savedPath?: string | null; error?: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepText, setGenerationStepText] = useState<string>("");
  const [selectedAI, setSelectedAI] = useState("groq");
  const [hasImage, setHasImage] = useState(false);

  // States Modal Visualisation
  const [isVisualizing, setIsVisualizing] = useState<boolean>(false);
  const [parsedTree, setParsedTree] = useState<any[]>([]);
  const [rawData, setRawData] = useState<any>(null);
  const [libraryCards, setLibraryCards] = useState<string[]>([]);
  const [submittedRestaurantName, setSubmittedRestaurantName] = useState<string>("RESTAURANT IA");
  const [isExtractingColor, setIsExtractingColor] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [savedToDbSuccess, setSavedToDbSuccess] = useState(false);
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
    formulas: { isSeul: true, isMenu: true, menuPrice: 2.50, isMaxi: true, maxiPrice: 3.50 },
    accompaniments: { list: "Frites, Potatoes", hasSizes: false, sizeS: 0, sizeM: 1.0, sizeL: 1.50 },
    drinks: { list: "Coca-Cola, Eau Plate", selectedGlobal: ["Coca-Cola", "Eau Plate"], customList: "", hasSizes: false, sizeS: 0, sizeM: 0.5, sizeL: 1.0 },
    desserts: { list: "", hasSizes: false, sizeS: 0, sizeM: 0.5, sizeL: 1.0 },
    forcedItems: {} as Record<string, string>
  });

  useEffect(() => {
    getAvailableLibraryCards().then(setLibraryCards).catch(console.error);
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtractingColor(true);

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      try {
        const ColorThief = ((await import('colorthief')) as any).default || (await import('colorthief') as any);
        const colorThief = new ColorThief();
        const dominantRgb = colorThief.getColor(img);
        const paletteRgb = colorThief.getPalette(img, 3);
        
        const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map(x => {
          const hex = x.toString(16)
          return hex.length === 1 ? '0' + hex : hex
        }).join('');

        const pColor = rgbToHex(dominantRgb[0], dominantRgb[1], dominantRgb[2]);
        let sColor = pColor;
        
        if (paletteRgb && paletteRgb.length > 1) {
          sColor = rgbToHex(paletteRgb[1][0], paletteRgb[1][1], paletteRgb[1][2]);
        }
        
        setWizardData(prev => ({ ...prev, primaryColor: pColor, secondaryColor: sColor }));
      } catch(err) {
        console.error("Color extraction failed", err);
        alert("Impossible d'extraire les couleurs de cette image. (Format non supporté ou image corrompue)");
      } finally {
        setIsExtractingColor(false);
        URL.revokeObjectURL(img.src);
      }
    };
  };

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
${wizardData.drinks?.list ? `- RÈGLE ABSOLUE POUR LES BOISSONS : Si tu génères une catégorie de boissons, tu DOIS obligatoirement inclure toutes ces boissons : ${wizardData.drinks.list}. N'en oublie aucune.` : ""}
`;
      formData.set("sujet", compiledSubject.trim());
      formData.set("sourceInspiration", ['custom', 'coffeeshop'].includes(wizardData.theme) ? 'standard' : wizardData.theme);
      formData.set("systemConfigJSON", JSON.stringify({
          typeLabel: wizardData.typeLabel,
          visualTheme: wizardData.visualTheme,
          visualStyle: wizardData.visualStyle,
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
    const safeName = submittedRestaurantName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeName || 'carte_ia'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToDb = async () => {
    if (!resultat?.json) return;
    setIsSavingToDb(true);
    try {
      const parsedContent = JSON.parse(resultat.json);
      const storeName = submittedRestaurantName || "Restaurant IA";
      
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: storeName,
          content: parsedContent
        })
      });
      
      if (res.ok) {
        setSavedToDbSuccess(true);
        setTimeout(() => setSavedToDbSuccess(false), 5000);
      } else {
        alert("Erreur lors de l'enregistrement en base de données.");
      }
    } catch (e) {
      alert("Erreur technique lors de la sauvegarde en DB.");
      console.error(e);
    } finally {
      setIsSavingToDb(false);
    }
  };

  const openVisualizer = () => {
    if (parsedTree.length > 0) {
       setIsVisualizing(true);
    } else {
       alert("Aucun arbre valide généré.");
    }
  };

  return (
    <main className={`${styles.main} ${styles.heroImageBg}`} style={{ padding: '10rem 1.5rem 4rem 1.5rem' }}>
      <div className={styles.hero}>
        <h1 className={styles.title}>{t('gen_title')}</h1>
        <p className={styles.description}>
          {t('gen_desc')}
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
                background: selectedAI === ai.value ? 'rgba(99, 102, 241, 0.15)' : 'var(--input-bg)',
                color: selectedAI === ai.value ? '#4f46e5' : '#6b7280',
                fontWeight: selectedAI === ai.value ? 700 : 500,
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease', backdropFilter: 'blur(10px)',
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
                background: ai.tag === "Gratuit" ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: ai.tag === "Gratuit" ? '#86efac' : '#fcd34d',
                fontWeight: 600,
              }}>
                {ai.tag}
              </span>
            </button>
          ))}
        </div>



                        <form onSubmit={handleSubmit} encType="multipart/form-data" style={{ width: '100%', maxWidth: '900px', margin: '0 auto', position: 'relative', overflow: 'hidden', paddingBottom: '2rem' }}>
          <input type="hidden" name="ai_type" value={selectedAI} />
          <input type="hidden" name="sauvegarder" value="on" />

          {/* --- PROGRESS BAR 5 STEPS --- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', position: 'relative', padding: '0 1rem' }}>
            <div style={{ position: 'absolute', top: '50%', left: '1rem', right: '1rem', height: '6px', background: 'var(--button-secondary-bg)', borderRadius: '3px', zIndex: 0, transform: 'translateY(-50%)' }}></div>
            <div style={{ position: 'absolute', top: '50%', left: '1rem', width: `calc(${((wizardStep - 1) / 4) * 100}% - 2rem)`, height: '6px', background: 'linear-gradient(90deg, #4f46e5, #0ea5e9)', borderRadius: '3px', zIndex: 0, transform: 'translateY(-50%)', transition: 'width 0.4s ease' }}></div>
            
            {[{ n: 1, label: t('gen_step1') }, { n: 2, label: t('gen_step2') }, { n: 3, label: t('gen_step3') }, { n: 4, label: t('gen_step4') }, { n: 5, label: t('gen_step5') }].map(step => (
              <div key={step.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                <div 
                  onClick={() => step.n <= wizardStep && setWizardStep(step.n)} 
                  style={{ width: '45px', height: '45px', borderRadius: '50%', background: wizardStep >= step.n ? 'linear-gradient(135deg, #4f46e5, #0ea5e9)' : 'var(--step-bg-inactive)', color: wizardStep >= step.n ? 'white' : 'rgba(255,255,255,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', cursor: step.n <= wizardStep ? 'pointer' : 'default', transition: 'all 0.3s', boxShadow: wizardStep === step.n ? '0 0 0 5px rgba(79, 70, 229, 0.2)' : 'none', border: wizardStep >= step.n ? 'none' : '2px solid #e2e8f0' }}
                >
                  {wizardStep > step.n ? <span style={{fontSize:'1.2rem'}}>✓</span> : step.n}
                </div>
                <span style={{ position: 'absolute', top: '55px', fontSize: '0.8rem', fontWeight: wizardStep === step.n ? 700 : 500, color: wizardStep === step.n ? 'var(--foreground)' : 'var(--step-text-inactive)', whiteSpace: 'nowrap' }}>{step.label}</span>
              </div>
            ))}
          </div>

          {/* DRAGGABLE CONTAINER (5 STEPS = 500% width, 20% each) */}
          <div style={{ display: 'flex', width: '500%', transform: `translateX(-${(wizardStep - 1) * 20}%)`, transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' }}>
            
            {/* ETAPE 1 : CONCEPT DU RESTAURANT */}
            <div style={{ width: '20%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: wizardStep === 1 ? 1 : 0.4, transition: 'opacity 0.5s' }}>
               <div style={{ background: 'var(--panel-bg)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '2.5rem', boxShadow: 'var(--panel-shadow)', border: '1px solid var(--panel-border)' }}>
                   <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--foreground)', fontSize: '1.2rem' }}>Nom de l'enseigne <span style={{color: '#fb7185'}}>*</span></label>
                   <input type="text" name="restaurantName" required={true} value={wizardData.restaurantName} onChange={(e) => setWizardData({...wizardData, restaurantName: e.target.value})} placeholder="Ex: L'Atelier du Burger..." style={{ width: '100%', padding: '1.2rem', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '1.2rem', fontWeight: 600, color: 'var(--foreground)', background: 'var(--input-bg)', outline: 'none', transition: 'border 0.2s', marginBottom: '1.5rem' }} />
                   
                   <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--foreground)', fontSize: '1.2rem' }}>Langue(s) du catalogue</label>
                   <select value={wizardData.language} onChange={(e) => setWizardData({...wizardData, language: e.target.value})} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--foreground)', background: 'rgba(15, 23, 42, 0.9)' }}>
                       <option>Français</option>
                       <option>English</option>
                       <option>Español</option>
                       <option>Arabe</option>
                       <option>Bilingue FR/EN</option>
                   </select>

                   <label style={{ display: 'block', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--foreground)', fontSize: '1.2rem' }}>Concept du Restaurant <span style={{color: '#fb7185'}}>*</span></label>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: wizardData.theme === 'custom' ? '1rem' : '0' }}>
                      {[
                        { label: 'Fast-Food / Burger', icon: '🍔', c: 'fastfood', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
                        { label: 'Pizzeria / Grill', icon: '🍕', c: 'pizzeria', gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
                        { label: 'Tacos / Kebab', icon: '🌯', c: 'tacos', gradient: 'linear-gradient(135deg, #10b981, #047857)' },
                        { label: 'Gastronomique', icon: '🍷', c: 'gastronomique', gradient: 'linear-gradient(135deg, #6366f1, #4338ca)' },
                        { label: 'Sushi / Japonais', icon: '🍣', c: 'sushi', gradient: 'linear-gradient(135deg, #ec4899, #be185d)' },
                        { label: 'Asiatique / Thaï', icon: '🥢', c: 'thai', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
                        { label: 'Oriental / Halal', icon: '🥙', c: 'oriental', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
                        { label: 'Coffee Shop / Café', icon: '☕', c: 'coffeeshop', gradient: 'linear-gradient(135deg, #d97706, #78350f)' },
                        { label: 'Standard ETK360', icon: '📱', c: 'standard', gradient: 'linear-gradient(135deg, #64748b, #475569)' },
                        { label: 'Sur Mesure...', icon: '✨', c: 'custom', gradient: 'linear-gradient(135deg, #1e293b, #0f172a)' }
                      ].map(t => {
                        const isSelected = wizardData.theme === t.c;
                        return (
                        <div 
                          key={t.c} 
                          onClick={() => setWizardData({...wizardData, typeLabel: t.c === 'custom' ? '' : t.label, theme: t.c})} 
                          style={{ 
                             position: 'relative',
                             padding: '1.2rem 1rem', 
                             background: isSelected ? t.gradient : 'rgba(255,255,255,0.05)', 
                             border: isSelected ? 'none' : '1px solid #e2e8f0', 
                             borderRadius: '16px', 
                             cursor: 'pointer', 
                             textAlign: 'center', 
                             transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                             transform: isSelected ? 'translateY(-4px)' : 'none', 
                             boxShadow: isSelected ? '0 10px 20px -5px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.02)',
                             color: isSelected ? 'white' : 'var(--text-muted)',
                             overflow: 'hidden'
                          }}
                        >
                           {isSelected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)', pointerEvents: 'none' }}></div>}
                           <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', filter: isSelected ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' : 'none', transition: 'all 0.3s' }}>{t.icon}</div>
                           <div style={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: '-0.01em' }}>{t.label}</div>
                           
                           {isSelected && (
                                <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                    ✓
                                </div>
                           )}
                        </div>
                      )})}
                   </div>
                   
                   <div style={{ 
                        height: wizardData.theme === 'custom' ? 'auto' : '0', 
                        opacity: wizardData.theme === 'custom' ? 1 : 0, 
                        overflow: 'hidden', 
                        transition: 'all 0.3s ease' 
                   }}>
                        <div style={{ background: 'var(--input-bg)', padding: '1.2rem', borderRadius: '12px', border: '1px solid #cbd5e1', borderLeft: '4px solid #1e293b' }}>
                            <label style={{ display: 'block', fontWeight: 600, color: 'var(--foreground)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>Quel est votre concept ? (L'IA s'en inspirera pour les noms et descriptions)</label>
                            <input 
                                type="text" 
                                value={wizardData.typeLabel} 
                                onChange={e => setWizardData({...wizardData, typeLabel: e.target.value})} 
                                placeholder="Ex: Bar à Salades, Spécialité Libanaise, Boulangerie..." 
                                style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.05rem', outline: 'none' }} 
                            />
                        </div>
                   </div>
                   
                   <div style={{ display: 'flex', alignItems: 'center', margin: '2rem 0', color: 'rgba(255,255,255,0.4)' }}>
                     <div style={{ flex: 1, height: '1px', background: 'var(--button-secondary-bg)' }}></div>
                     <span style={{ padding: '0 1rem', fontWeight: 800, fontSize: '0.9rem', color: 'var(--button-secondary-text)' }}>OU</span>
                     <div style={{ flex: 1, height: '1px', background: 'var(--button-secondary-bg)' }}></div>
                   </div>

                   {/* SECTION OCR RESTAUREE */}
                   <div style={{ padding: '1.5rem', border: '2px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', background: 'var(--input-bg)', cursor: 'pointer', position: 'relative' }}>
                     <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--button-secondary-text)' }}>
                       <span style={{ fontSize: '2rem' }}>📸</span>
                       <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--foreground)' }}>Importer une photo de menu</span>
                       <span style={{ fontSize: '0.85rem', color: 'var(--button-secondary-text)' }}>Optionnel : L'IA lira l'image (OCR) pour générer votre catalogue.</span>
                       <input 
                         type="file" 
                         name="menuImage" 
                         accept="image/*" 
                         onChange={(e) => {
                           const file = e.target.files?.[0];
                           setHasImage(!!file);
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
               </div>
               <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                   <button type="button" onClick={() => setWizardStep(hasImage ? 4 : 2)} disabled={!wizardData.restaurantName || (!wizardData.theme && !hasImage)} style={{ padding: '1rem 2rem', background: '#4f46e5', color: 'white', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', opacity: (!wizardData.restaurantName || (!wizardData.theme && !hasImage)) ? 0.5 : 1, transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>{hasImage ? "Mode Photo : Aller au Design →" : t('gen_continue')}</button>
               </div>
            </div>

            {/* ETAPE 2 : LOGIQUE DE VENTE */}
            <div style={{ width: '20%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: wizardStep === 2 ? 1 : 0.4, transition: 'opacity 0.5s' }}>
                <div style={{ background: 'var(--panel-bg)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '2.5rem', boxShadow: 'var(--panel-shadow)', border: '1px solid var(--panel-border)' }}>
                   <label style={{ display: 'block', fontWeight: 800, marginBottom: '1rem', color: 'var(--foreground)', fontSize: '1.2rem' }}>Formules Automatiques</label>
                   <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--input-bg)', padding: '0.8rem 1.2rem', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', flex: 1 }}>
                          <input type="checkbox" checked={wizardData.formulas.isMenu} onChange={e => setWizardData({...wizardData, formulas: {...wizardData.formulas, isMenu: e.target.checked}})} style={{ width: '20px', height: '20px', accentColor: '#4f46e5' }} />
                          <span style={{ fontWeight: 600 }}>Taille Standard (+ <input type="number" step="0.1" value={wizardData.formulas.menuPrice} onChange={e => setWizardData({...wizardData, formulas: {...wizardData.formulas, menuPrice: parseFloat(e.target.value)||0}})} style={{ width: '50px', padding: '0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /> €)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--input-bg)', padding: '0.8rem 1.2rem', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', flex: 1 }}>
                          <input type="checkbox" checked={wizardData.formulas.isMaxi} onChange={e => setWizardData({...wizardData, formulas: {...wizardData.formulas, isMaxi: e.target.checked}})} style={{ width: '20px', height: '20px', accentColor: '#4f46e5' }} />
                          <span style={{ fontWeight: 600 }}>Taille Maxi (+ <input type="number" step="0.1" value={wizardData.formulas.maxiPrice} onChange={e => setWizardData({...wizardData, formulas: {...wizardData.formulas, maxiPrice: parseFloat(e.target.value)||0}})} style={{ width: '50px', padding: '0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /> €)</span>
                      </label>
                   </div>

                   <label style={{ display: 'block', fontWeight: 800, margin: '2rem 0 1rem 0', color: 'var(--foreground)', fontSize: '1.2rem' }}>Accompagnements (Pour les formules)</label>
                   <input type="text" value={wizardData.accompaniments.list} onChange={e => setWizardData({...wizardData, accompaniments: {...wizardData.accompaniments, list: e.target.value}})} placeholder="Ex: Frites, Potatoes, Salade (séparés par virgule)" style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }} />
                   
                   <label style={{ display: 'block', fontWeight: 800, margin: '2rem 0 1rem 0', color: 'var(--foreground)', fontSize: '1.2rem' }}>Boissons</label>
                   
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem', marginBottom: '1.5rem' }}>
                      {GLOBAL_DRINKS_LIST.map(boisson => {
                         const isSelected = wizardData.drinks.selectedGlobal?.includes(boisson);
                         return (
                            <label key={boisson} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: isSelected ? '#eef2ff' : 'rgba(255,255,255,0.05)', padding: '0.8rem 1rem', borderRadius: '8px', border: isSelected ? '1px solid #4f46e5' : '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}>
                                <input type="checkbox" checked={isSelected || false} onChange={e => {
                                    const checked = e.target.checked;
                                    let newSelected = [...(wizardData.drinks.selectedGlobal || [])];
                                    if (checked) newSelected.push(boisson);
                                    else newSelected = newSelected.filter(b => b !== boisson);
                                    
                                    const customList = wizardData.drinks.customList || "";
                                    const newList = [...newSelected, customList].filter(Boolean).join(", ");
                                    
                                    setWizardData({...wizardData, drinks: {...wizardData.drinks, selectedGlobal: newSelected, list: newList}});
                                }} style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }} />
                                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: isSelected ? '#4f46e5' : 'var(--foreground)' }}>{boisson}</span>
                            </label>
                         );
                      })}
                   </div>
                   
                   <label style={{ display: 'block', fontWeight: 600, margin: '0 0 0.5rem 0', color: 'var(--button-secondary-text)', fontSize: '0.95rem' }}>Boissons supplémentaires (séparées par une virgule)</label>
                   <input type="text" value={wizardData.drinks.customList || ""} onChange={e => {
                       const customList = e.target.value;
                       const newSelected = wizardData.drinks.selectedGlobal || [];
                       const newList = [...newSelected, customList].filter(Boolean).join(", ");
                       setWizardData({...wizardData, drinks: {...wizardData.drinks, customList, list: newList}});
                   }} placeholder="Ex: Bière Pression, Limonade Maison..." style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }} />

                   <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '2rem', background: 'var(--input-bg)', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                        <input type="checkbox" checked={wizardData.compositions.cookingOptions} onChange={e => setWizardData({...wizardData, compositions: {...wizardData.compositions, cookingOptions: e.target.checked}})} style={{ width: '20px', height: '20px', accentColor: '#4f46e5' }} />
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>Forcer les choix de cuisson si applicable</span>
                   </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                   <button type="button" onClick={() => setWizardStep(1)} style={{ padding: '1rem 2rem', background: 'var(--button-secondary-bg)', color: 'var(--button-secondary-text)', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>{t('gen_back')}</button>
                   <button type="button" onClick={() => setWizardStep(3)} style={{ padding: '1rem 2rem', background: '#4f46e5', color: 'white', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>{t('gen_continue')}</button>
               </div>
            </div>

            {/* ETAPE 3 : STRUCTURE */}
            <div style={{ width: '20%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: wizardStep === 3 ? 1 : 0.4, transition: 'opacity 0.5s' }}>
                <div style={{ background: 'var(--panel-bg)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '2.5rem', boxShadow: 'var(--panel-shadow)', border: '1px solid var(--panel-border)' }}>
                   <label style={{ display: 'block', fontWeight: 800, marginBottom: '1rem', color: 'var(--foreground)', fontSize: '1.2rem' }}>Que vendez-vous ? <span style={{color: '#fb7185'}}>*</span></label>
                   
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.5rem' }}>
                      {['Entrées', 'Burgers', 'Pizzas', 'Tacos', 'Kebabs', 'Sandwichs', 'Salades', 'Boissons', 'Desserts', 'Extras', 'Menus Enfants'].map(c => {
                          const isSelected = wizardData.categories.includes(c);
                          return (
                             <button type="button" key={c} onClick={() => {
                                 let newCats = [...wizardData.categories];
                                 if (isSelected) newCats = newCats.filter(x => x !== c);
                                 else newCats.push(c);
                                 setWizardData({...wizardData, categories: newCats});
                             }} style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1', background: isSelected ? '#4f46e5' : 'rgba(255,255,255,0.05)', color: isSelected ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}>
                                {c}
                             </button>
                          );
                      })}
                   </div>

                   <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--foreground)', fontSize: '1.2rem' }}>Taille (par catégorie)</label>
                   <select value={wizardData.productCountLimit} onChange={(e) => setWizardData({...wizardData, productCountLimit: e.target.value})} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--foreground)' }}>
                       <option>3-5 produits</option>
                       <option>6-10 produits</option>
                       <option>10+ produits (Long format)</option>
                   </select>

                   <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--foreground)', fontSize: '1.2rem' }}>Règles strictes (Optionnel)</label>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--input-bg)', padding: '1rem', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                      {wizardData.categories.length === 0 ? <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontStyle: 'italic' }}>Sélectionnez des catégories d'abord.</div> : wizardData.categories.map((c) => (
                          <div key={c} style={{ display: 'flex', flexDirection: 'column', background: 'white', padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c} :</span>
                                <input type="text" placeholder="Produits exacts imposés..." value={wizardData.forcedItems[c] || ""} onChange={e => setWizardData({...wizardData, forcedItems: {...wizardData.forcedItems, [c]: e.target.value}})} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: 'none', borderBottom: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }} />
                          </div>
                      ))}
                   </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                   <button type="button" onClick={() => setWizardStep(2)} style={{ padding: '1rem 2rem', background: 'var(--button-secondary-bg)', color: 'var(--button-secondary-text)', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>{t('gen_back')}</button>
                   <button type="button" onClick={() => setWizardStep(4)} disabled={wizardData.categories.length === 0} style={{ padding: '1rem 2rem', background: '#4f46e5', color: 'white', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', opacity: wizardData.categories.length === 0 ? 0.5 : 1 }}>{t('gen_continue')}</button>
               </div>
            </div>

                        {/* ETAPE 4 : TECHNIQUE & DESIGN */}
            <div style={{ width: '20%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: wizardStep === 4 ? 1 : 0.4, transition: 'opacity 0.5s' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                   {/* Col Gauche : FormControls */}
                   <div style={{ background: 'var(--panel-bg)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '2.5rem', boxShadow: 'var(--panel-shadow)', border: '1px solid var(--panel-border)' }}>
                      <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--foreground)', fontSize: '1.2rem' }}>Format d'affichage cible</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
                         {['Écran kiosque', 'Tablette', 'Impression A4', 'QR Code menu'].map(f => (
                           <button type="button" key={f} onClick={() => setWizardData({...wizardData, outputFormat: f})} style={{ padding: '0.8rem', borderRadius: '8px', border: wizardData.outputFormat === f ? '2px solid #4f46e5' : '1px solid #cbd5e1', background: wizardData.outputFormat === f ? '#eef2ff' : 'rgba(255,255,255,0.05)', cursor: 'pointer', fontWeight: 600, color: wizardData.outputFormat === f ? '#4f46e5' : 'var(--foreground)' }}>
                             {f}
                           </button>
                         ))}
                      </div>

                      <label style={{ display: 'block', fontWeight: 800, marginBottom: '1rem', color: 'var(--foreground)', fontSize: '1.2rem' }}>Ambiance Visuelle (Couleurs)</label>

                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem',
                            background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: 'white',
                            padding: '1rem', borderRadius: '12px', cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)', transition: 'all 0.3s',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            {isExtractingColor ? (
                               <span style={{ fontWeight: 600 }}>🪄 Analyse magique en cours...</span>
                            ) : (
                               <>
                                  <span style={{ fontSize: '1.2rem' }}>📸</span>
                                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Magic Color : Extraire depuis mon Logo</span>
                                  <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                               </>
                            )}
                        </label>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.8rem', marginBottom: '1rem' }}>
                          {[
                            { name: 'Moderne', p: '#4f46e5', s: '#10b981' },
                            { name: 'Gourmand', p: '#dc2626', s: '#ea580c' },
                            { name: 'Healthy', p: '#16a34a', s: '#84cc16' },
                            { name: 'Élégant', p: 'var(--foreground)', s: 'rgba(255,255,255,0.4)' },
                            { name: 'Océan', p: '#0284c7', s: '#38bdf8' },
                            { name: 'Pastel', p: '#f43f5e', s: '#fb7185' },
                            { name: 'Luxury', p: 'var(--foreground)', s: '#d4af37' },
                            { name: 'Sunset', p: '#ea580c', s: '#fcd34d' },
                          ].map(th => {
                              const isSelected = wizardData.primaryColor === th.p && wizardData.secondaryColor === th.s;
                              return (
                                <div 
                                    key={th.name} 
                                    onClick={() => setWizardData({...wizardData, primaryColor: th.p, secondaryColor: th.s})} 
                                    style={{ 
                                        position: 'relative',
                                        height: '70px',
                                        borderRadius: '12px', 
                                        cursor: 'pointer', 
                                        display: 'flex', 
                                        alignItems: 'flex-end', 
                                        padding: '0.6rem',
                                        background: `linear-gradient(135deg, ${th.p}, ${th.s})`,
                                        boxShadow: isSelected ? `0 8px 20px -5px ${th.p}80` : '0 4px 10px rgba(0,0,0,0.05)',
                                        transform: isSelected ? 'translateY(-3px)' : 'none',
                                        transition: 'all 0.3s ease',
                                        border: isSelected ? '2px solid white' : '2px solid transparent',
                                        outline: isSelected ? `2px solid ${th.p}` : 'none',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{ 
                                        background: 'rgba(255, 255, 255, 0.25)', 
                                        backdropFilter: 'blur(4px)',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '6px',
                                        width: '100%',
                                        textAlign: 'center',
                                        border: '1px solid var(--step-text-inactive)'
                                    }}>
                                        <span style={{ fontWeight: 700, color: 'white', fontSize: '0.8rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{th.name}</span>
                                    </div>
                                    
                                    {isSelected && (
                                        <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: th.p, fontSize: '0.6rem', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                                            ✓
                                        </div>
                                    )}
                                </div>
                              );
                          })}
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                          <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--button-secondary-text)', marginBottom: '0.3rem' }}>Primaire</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <input type="color" value={wizardData.primaryColor} onChange={(e) => setWizardData({...wizardData, primaryColor: e.target.value})} style={{ width: '35px', height: '35px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
                                  <code style={{ fontSize: '0.85rem', color: 'var(--foreground)', fontWeight: 600 }}>{wizardData.primaryColor}</code>
                              </div>
                          </div>
                          <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--button-secondary-text)', marginBottom: '0.3rem' }}>Secondaire</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <input type="color" value={wizardData.secondaryColor} onChange={(e) => setWizardData({...wizardData, secondaryColor: e.target.value})} style={{ width: '35px', height: '35px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
                                  <code style={{ fontSize: '0.85rem', color: 'var(--foreground)', fontWeight: 600 }}>{wizardData.secondaryColor}</code>
                              </div>
                          </div>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'var(--input-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', marginBottom: '0.5rem' }}>
                           <input type="checkbox" checked={wizardData.showAllergens} onChange={e => setWizardData({...wizardData, showAllergens: e.target.checked})} style={{ width: '20px', height: '20px', accentColor: '#4f46e5' }} />
                           <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>Placer des pastilles allergènes automatiquement</span>
                      </label>
                      
                      <label style={{ display: 'block', fontWeight: 800, margin: '1rem 0 0.5rem 0', color: 'var(--foreground)', fontSize: '1rem' }}>Sémantique Promotionnelle (Badges)</label>
                      <input type="text" value={wizardData.productBadges.join(', ')} onChange={e => setWizardData({...wizardData, productBadges: e.target.value.split(',').map(s=>s.trim())})} placeholder="Ex: NOUVEAU, OFFRE SPECIALE, BEST-SELLER" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                   </div>

                   {/* Col Droite : Live Preview */}
                   <div style={{ background: wizardData.primaryColor, borderRadius: '16px', padding: '1.5rem', color: 'var(--card-bg)', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: `0 10px 25px -5px ${wizardData.primaryColor}80`, transition: 'background 0.3s ease', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: wizardData.secondaryColor, borderRadius: '50%', opacity: 0.8, filter: 'blur(30px)' }}></div>
                      
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 800, opacity: 0.9 }}>Aperçu Dynamique</div>
                      
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.2rem', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                         {wizardData.productBadges.length > 0 && wizardData.productBadges[0] && (
                           <div style={{ display: 'inline-block', background: wizardData.secondaryColor, color: '#fff', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '99px', fontWeight: 'bold', marginBottom: 'auto', alignSelf: 'flex-start' }}>
                             ★ {wizardData.productBadges[0]}
                           </div>
                         )}
                         <span style={{ fontSize: '1.1rem', fontWeight: 900, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>Votre Interface ETK</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                         <div style={{ height: '45px', flex: 1, background: wizardData.secondaryColor, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>Bouton Action</div>
                         <div style={{ height: '45px', width: '45px', background: 'rgba(255,255,255,0.9)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: wizardData.primaryColor, fontWeight: 'bold' }}>+</div>
                      </div>
                   </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                   <button type="button" onClick={() => setWizardStep(hasImage ? 1 : 3)} style={{ padding: '1rem 2rem', background: 'var(--button-secondary-bg)', color: 'var(--button-secondary-text)', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>{t('gen_back')}</button>
                   <button type="button" onClick={() => setWizardStep(5)} style={{ padding: '1rem 2rem', background: '#4f46e5', color: 'white', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>{t('gen_continue')}</button>
               </div>
            </div>

{/* ETAPE 5 : GENERATION (Recap) */}
            <div style={{ width: '20%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: wizardStep === 5 ? 1 : 0.4, transition: 'opacity 0.5s' }}>
               <div style={{ background: 'var(--panel-bg)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '2.5rem', boxShadow: 'var(--panel-shadow)', border: '1px solid var(--panel-border)', textAlign: 'center' }}>
                   <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚀</div>
                   <h2 style={{ margin: '0 0 1rem 0', color: 'var(--foreground)', fontSize: '1.8rem' }}>{t('gen_ready')}</h2>
                   <p style={{ color: 'var(--button-secondary-text)', fontSize: '1.1rem', marginBottom: '2rem' }}>{t('gen_ready_desc')}</p>
                   
                   <div style={{ background: 'var(--input-bg)', padding: '1.5rem', borderRadius: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>Restaurant :</span> <span style={{fontWeight:800}}>{wizardData.restaurantName} ({wizardData.language})</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>Concept :</span> <span style={{fontWeight:800}}>{wizardData.typeLabel}</span></div>
                      {hasImage ? (
                         <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 'bold' }}><span>Mode :</span> <span>Extraction Optique (OCR) 📸</span></div>
                      ) : (
                         <>
                           <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>Catégories :</span> <span style={{fontWeight:800}}>{wizardData.categories.length}</span></div>
                           <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>Formules :</span> <span style={{fontWeight:800}}>{wizardData.formulas.isMenu ? "Menu/Maxi actifs" : "Seul"}</span></div>
                         </>
                      )}
                   </div>

                   <button disabled={isGenerating} type="submit" style={{ width: '100%', padding: '1.2rem', background: isGenerating ? 'rgba(255,255,255,0.4)' : 'linear-gradient(135deg, #4f46e5, #0ea5e9)', color: 'white', borderRadius: '12px', border: 'none', fontSize: '1.3rem', fontWeight: 900, cursor: isGenerating ? 'not-allowed' : 'pointer', transition: 'all 0.3s', boxShadow: isGenerating ? 'none' : '0 10px 25px -5px rgba(79, 70, 229, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                      {isGenerating ? (
                        <><span>⏳</span> {generationStepText || t('gen_generating')}</>
                      ) : (
                        <>{t('gen_generate')} <span style={{fontSize:'1.5rem'}}>⚡</span></>
                      )}
                   </button>
               </div>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                   <button type="button" disabled={isGenerating} onClick={() => setWizardStep(4)} style={{ padding: '1rem 2rem', background: 'var(--button-secondary-bg)', color: 'var(--button-secondary-text)', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', opacity: isGenerating ? 0.5 : 1 }}>{t('gen_back')}</button>
               </div>
            </div>

          </div>
        </form>



        <Link href="/menu" className={styles.backButton}>
          <span>&lt;-</span> {t('gen_return_board')}
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
                   <h3 style={{ fontSize: '1rem', color: 'var(--button-secondary-text)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Code Brut (JSON)</h3>
                   <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button onClick={handleDownload} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                         ⬇️ Télécharger
                      </button>
                      <button onClick={handleSaveToDb} disabled={isSavingToDb || savedToDbSuccess} style={{ padding: '0.5rem 1rem', background: savedToDbSuccess ? '#059669' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: (isSavingToDb || savedToDbSuccess) ? 'not-allowed' : 'pointer', fontWeight: 600, transition: 'all 0.2s' }}>
                         {isSavingToDb ? "⏳ Enregistrement..." : savedToDbSuccess ? "✅ Enregistré en BDD !" : "💾 Enregistrer en Base"}
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15, 23, 42, 0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
           
           <div style={{ position: 'absolute', top: '2rem', right: '2rem', zIndex: 110 }}>
              <button 
                onClick={() => setIsVisualizing(false)}
                style={{ padding: '0.75rem 1.5rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '99px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 20px rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'transform 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                 Fermer l'aperçu
              </button>
           </div>
           
           {/* Cadre de la Borne Physique */}
           <div style={{ 
              width: '480px', 
              height: '820px', 
              background: 'white',
              borderRadius: '24px',
              boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6), 0 0 0 16px #0f172a, 0 0 0 18px rgba(255,255,255,0.1)', // Gros cadre plastique noir avec reflet
              overflow: 'hidden', 
              position: 'relative',
              animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
           }}>
              <KioskSimulator 
                 restaurantName={submittedRestaurantName}
                 tree={parsedTree} 
                 catalogData={rawData}
                 themePalette={{ primary: wizardData.primaryColor, secondary: wizardData.secondaryColor, text: '#111827', onPrimary: 'white' }} 
              />
           </div>
        </div>
      )}

      <LogoMarquee />
    </main>
  );
}
