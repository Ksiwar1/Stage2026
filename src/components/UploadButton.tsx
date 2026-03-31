'use client';

import { useRef, useState } from 'react';

export default function UploadButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ message: string; success: boolean } | null>(null);

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
      
      <button 
        type="button" 
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        style={{
          background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.8), rgba(229, 46, 113, 0.8))',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.2)',
          padding: '1.2rem 3rem',
          borderRadius: '99px',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: isUploading ? 'wait' : 'pointer',
          boxShadow: '0 8px 30px rgba(138,43,226, 0.5)',
          transition: 'transform 0.2s',
          transform: isUploading ? 'scale(0.98)' : 'scale(1)'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = isUploading ? 'scale(0.98)' : 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isUploading ? 'Analyse du fichier...' : '📥 Sélectionner un fichier JSON externe'}
      </button>

      {status && (
        <div style={{ 
            background: status.success ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)', 
            padding: '1rem', 
            borderRadius: '8px',
            border: `1px solid ${status.success ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            maxWidth: '500px',
            textAlign: 'center'
        }}>
            <p style={{ color: status.success ? '#4ade80' : '#f87171', fontWeight: 'bold', margin: 0 }}>
            {status.message}
            </p>
        </div>
      )}
    </div>
  );
}
