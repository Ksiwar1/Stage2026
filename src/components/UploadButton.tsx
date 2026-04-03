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
      const data = await res.json();
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
      const data = await res.json();
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

        const result = await res.json();
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', margin: '3rem 0' }}>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json,application/json" 
        style={{ display: 'none' }} 
      />

      {/* Import par URL */}
      <form onSubmit={handleUrlImport} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', maxWidth: '500px' }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#374151' }}>Importer depuis une URL :</p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="url" 
            placeholder="Lien HTTPS vers le fichier JSON..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            disabled={isUploading}
            required
            style={{ 
              flexGrow: 1, 
              padding: '0.9rem 1.2rem', 
              borderRadius: '12px',
              border: '1px solid #d1d5db',
              fontSize: '0.95rem',
              outline: 'none',
              background: '#f9fafb'
            }}
          />
          <button 
            type="submit"
            disabled={isUploading}
            style={{
              background: isUploading ? '#cbd5e1' : '#4b5563',
              color: 'white',
              border: 'none',
              padding: '0 1.5rem',
              borderRadius: '12px',
              fontWeight: 'bold',
              cursor: isUploading ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
            }}
          >
            {isUploading ? '⏳' : '📥 Lier'}
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '500px', gap: '1rem', margin: '0.5rem 0' }}>
        <div style={{ flexGrow: 1, height: '1px', background: '#e5e7eb' }}></div>
        <span style={{ color: '#9ca3af', fontSize: '0.85rem', fontWeight: 'bold' }}>OU FICHIER LOCAL</span>
        <div style={{ flexGrow: 1, height: '1px', background: '#e5e7eb' }}></div>
      </div>
      

      <button 
        type="button" 
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        style={{
          background: isUploading ? '#93c5fd' : '#2563eb', /* Softavera Royal Blue */
          color: 'white',
          border: 'none',
          padding: '1rem 2.5rem',
          borderRadius: '99px',
          fontSize: '1.05rem',
          fontWeight: '600',
          cursor: isUploading ? 'wait' : 'pointer',
          boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.4)',
          transition: 'all 0.2s ease',
          transform: isUploading ? 'scale(0.98)' : 'scale(1)'
        }}
        onMouseOver={(e) => {
          if (!isUploading) {
            e.currentTarget.style.transform = 'scale(1.03)';
            e.currentTarget.style.background = '#1d4ed8'; // Darker blue hover
          }
        }}
        onMouseOut={(e) => {
          if (!isUploading) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = '#2563eb';
          }
        }}
      >
        {isUploading ? 'Traitement du fichier...' : '📥 Importer un fichier JSON externe'}
      </button>

      {status && (
        <div style={{ 
            background: status.success ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)', 
            padding: '1rem 1.5rem', 
            borderRadius: '12px',
            border: `1px solid ${status.success ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            maxWidth: '500px',
            textAlign: 'center'
        }}>
            <p style={{ color: status.success ? '#166534' : '#991b1b', fontWeight: '600', margin: 0, fontSize: '0.95rem' }}>
            {status.message}
            </p>
        </div>
      )}

      {/* Bouton d'Analyse IA */}
      <button 
        type="button" 
        onClick={handleAnalysis}
        disabled={isAnalyzing}
        style={{
          background: isAnalyzing ? '#cbd5e1' : 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white',
          border: 'none',
          padding: '1rem 2.5rem',
          borderRadius: '99px',
          fontSize: '1.05rem',
          fontWeight: '600',
          cursor: isAnalyzing ? 'wait' : 'pointer',
          boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.4)',
          transition: 'all 0.2s ease',
          transform: isAnalyzing ? 'scale(0.98)' : 'scale(1)'
        }}
        onMouseOver={(e) => {
          if (!isAnalyzing) {
            e.currentTarget.style.transform = 'scale(1.03)';
          }
        }}
        onMouseOut={(e) => {
          if (!isAnalyzing) {
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        {isAnalyzing ? 'Analyse par Gemini en cours...' : '✨ Analyser la base avec l\'IA'}
      </button>

      {/* Rapport d'Analyse */}
      {analysisReport && (
        <div style={{ 
            background: 'rgba(16, 185, 129, 0.04)', 
            padding: '2rem', 
            borderRadius: '16px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            maxWidth: '700px',
            textAlign: 'left',
            boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
        }}>
            <h3 style={{marginTop: 0, color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem'}}>
               ✨ Rapport Gemini 1.5 Pro
            </h3>
            <div style={{ color: '#064e3b', lineHeight: '1.7', whiteSpace: 'pre-wrap', fontSize: '1rem' }}>
                {analysisReport}
            </div>
        </div>
      )}
    </div>
  );
}
