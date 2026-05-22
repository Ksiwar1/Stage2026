'use client';

import { useRef, useState } from 'react';

export default function UploadButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ message: string; success: boolean } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;
    setStatus(null);
    setIsUploading(true);

    try {
      const res = await fetch('/api/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput })
      });
      const contentType = res.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new TypeError('Oops, we haven\'t got JSON!');
      }
      setStatus({ message: data.message, success: data.success });
      if (data.success) {
        setUrlInput('');
      }
    } catch (err) {
      console.error(err);
      setStatus({ message: "Erreur lors de la requête Web vers le serveur JSON.", success: false });
    } finally {
      setIsUploading(false);
    }
  };


  const handleAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisReport(null);
    try {
      const res = await fetch('/api/analyze-carte', { method: 'POST' });
      const contentType = res.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new TypeError('Oops, we haven\'t got JSON!');
      }
      if (data.success) {
        setAnalysisReport(data.report);
      } else {
        setStatus({ message: data.message || "Erreur d'analyse IA.", success: false });
      }
    } catch (err) {
      console.error(err);
      setStatus({ message: "Erreur réseau avec Gemini.", success: false });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus(null);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const contenuTexte = event.target?.result as string;
        
        try {
          JSON.parse(contenuTexte); 
        } catch (parseError) {
          setStatus({ message: "❌ Le fichier sélectionné n'est pas un JSON valide (Crash syntaxe).", success: false });
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        // On bypass les Server Actions de Next.js et on attaque l'API pure !
        const res = await fetch('/api/upload-json?name=' + encodeURIComponent(file.name), {
            method: 'POST',
            body: contenuTexte,
            headers: { 'Content-Type': 'text/plain' } // C'est juste du gros texte innocent
        });

        const contentType = res.headers.get('content-type');
        let result;
        if (contentType && contentType.includes('application/json')) {
          result = await res.json();
        } else {
          throw new TypeError('Oops, we haven\'t got JSON!');
        }
        setStatus({ message: result.message, success: result.success });

      } catch (err) {
        console.error("Erreur réseau Fetch", err);
        setStatus({ message: "Erreur réseau lors de la communication de l'API.", success: false });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.onerror = () => {
      setStatus({ message: "Échec de lecture.", success: false });
      setIsUploading(false);
    };

    reader.readAsText(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem', margin: '3rem 0', width: '100%' }}>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json,application/json" 
        style={{ display: 'none' }} 
      />

      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '24px',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-md, 0 10px 15px -3px rgba(0, 0, 0, 0.05))',
        width: '100%',
        maxWidth: '600px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        transition: 'var(--transition-smooth)'
      }}>
        
        <div>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: 800, color: 'var(--foreground)' }}>Sources de données</h2>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748b' }}>Liez un catalogue externe ou importez un fichier local.</p>
        </div>

        {/* Import par URL */}
        <form onSubmit={handleUrlImport} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lien HTTPS distant</label>
          <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            </div>
            <input 
              type="url" 
              placeholder="https://domaine.com/catalogue.json"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={isUploading}
              required
              style={{ 
                flexGrow: 1, 
                padding: '0.85rem 1rem 0.85rem 2.8rem', 
                borderRadius: '12px',
                border: '1px solid var(--card-border)',
                fontSize: '0.95rem',
                outline: 'none',
                background: 'rgba(255, 255, 255, 0.05)',
                transition: 'var(--transition-smooth)',
                color: 'var(--foreground)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
            />
            <button 
              type="submit"
              disabled={isUploading}
              style={{
                background: isUploading ? 'rgba(255, 255, 255, 0.1)' : 'var(--foreground)',
                color: 'var(--background)',
                border: 'none',
                padding: '0 1.5rem',
                borderRadius: '12px',
                fontWeight: '600',
                cursor: isUploading ? 'wait' : 'pointer',
                transition: 'var(--transition-smooth)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {isUploading ? (
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
              ) : 'Connecter'}
            </button>
          </div>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '1rem', margin: '0.5rem 0' }}>
          <div style={{ flexGrow: 1, height: '1px', background: 'var(--card-border)' }}></div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>OU UPLOAD LOCAL</span>
          <div style={{ flexGrow: 1, height: '1px', background: 'var(--card-border)' }}></div>
        </div>
        
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          style={{
            background: isUploading ? 'rgba(37, 99, 235, 0.5)' : 'var(--primary)',
            color: 'white',
            border: 'none',
            padding: '1.2rem 2rem',
            borderRadius: '16px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: isUploading ? 'wait' : 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'var(--transition-smooth)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
          onMouseOver={(e) => {
            if (!isUploading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }
          }}
          onMouseOut={(e) => {
            if (!isUploading) {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          {isUploading ? 'Importation en cours...' : 'Sélectionner un fichier JSON'}
        </button>

        {status && (
          <div style={{ 
              background: status.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
              padding: '1rem 1.2rem', 
              borderRadius: '12px',
              border: `1px solid ${status.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
          }}>
              <div style={{ color: status.success ? '#10b981' : '#ef4444' }}>
                {status.success ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                )}
              </div>
              <p style={{ color: status.success ? '#065f46' : '#991b1b', fontWeight: '500', margin: 0, fontSize: '0.95rem' }}>
              {status.message}
              </p>
          </div>
        )}
      </div>

      {/* Bouton d'Analyse IA */}
      <button 
        type="button" 
        onClick={handleAnalysis}
        disabled={isAnalyzing}
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#059669',
          padding: '1rem 2rem',
          borderRadius: '9999px',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: isAnalyzing ? 'wait' : 'pointer',
          boxShadow: 'var(--shadow-sm)',
          transition: 'var(--transition-smooth)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
        onMouseOver={(e) => {
          if (!isAnalyzing) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.background = '#10b981';
            e.currentTarget.style.color = 'white';
          }
        }}
        onMouseOut={(e) => {
          if (!isAnalyzing) {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
            e.currentTarget.style.color = '#059669';
          }
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        {isAnalyzing ? 'Analyse Gemini en cours...' : 'Lancer un Audit IA de la base'}
      </button>

      {/* Rapport d'Analyse */}
      {analysisReport && (
        <div style={{ 
            background: 'rgba(255, 255, 255, 0.95)', 
            padding: '2rem', 
            borderRadius: '24px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            maxWidth: '700px',
            width: '100%',
            textAlign: 'left',
            boxShadow: 'var(--shadow-xl)',
            animation: 'fadeInDown 0.5s ease-out'
        }}>
            <h3 style={{marginTop: 0, color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 800}}>
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
               Rapport d'Audit Gemini
            </h3>
            <div style={{ color: '#334155', lineHeight: '1.7', whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>
                {analysisReport}
            </div>
        </div>
      )}
    </div>
  );
}
