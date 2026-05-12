'use client';

import React, { useState } from 'react';
import { updateParametresAction } from '../../../../actions/updateParametresAction';

interface Category {
  id: string;
  title: string;
  rank: number;
}

interface ParametresEditorClientProps {
  nomFichier: string;
  initialCategories: Category[];
  initialLanguages: string[];
  initialPrimaryColor: string;
  initialSecondaryColor: string;
}

export default function ParametresEditorClient({
  nomFichier,
  initialCategories,
  initialLanguages,
  initialPrimaryColor,
  initialSecondaryColor
}: ParametresEditorClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [languages, setLanguages] = useState<string[]>(initialLanguages);
  const [primaryColor, setPrimaryColor] = useState(initialPrimaryColor);
  const [secondaryColor, setSecondaryColor] = useState(initialSecondaryColor);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleLanguageToggle = (lang: string) => {
    setLanguages(prev => {
      if (prev.includes(lang)) {
        return prev.filter(l => l !== lang);
      } else {
        return [...prev, lang];
      }
    });
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categories.length - 1) return;

    const newCategories = [...categories];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newCategories[index];
    newCategories[index] = newCategories[swapIndex];
    newCategories[swapIndex] = temp;

    setCategories(newCategories);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    const categoryOrder = categories.map(c => c.id);

    const res = await updateParametresAction(nomFichier, {
      languages,
      primaryColor,
      secondaryColor,
      categoryOrder
    });

    if (res.success) {
      setMessage({ text: 'Paramètres mis à jour avec succès !', type: 'success' });
    } else {
      setMessage({ text: res.error || 'Erreur lors de la sauvegarde.', type: 'error' });
    }

    setIsSaving(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
      
      {/* Colonne de gauche: Langues et Couleurs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Paramètres de Langues */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h2 style={{ marginTop: 0, color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🌍</span> Langues de la borne
          </h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Sélectionnez les langues disponibles pour vos clients.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: languages.includes('FR') ? '#f0fdf4' : 'white' }}>
              <input 
                type="checkbox" 
                checked={languages.includes('FR')} 
                onChange={() => handleLanguageToggle('FR')}
                style={{ width: '20px', height: '20px', accentColor: 'var(--site-primary)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>Français (FR)</div>
              </div>
              <span style={{ fontSize: '1.5rem' }}>🇫🇷</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: languages.includes('EN') ? '#f0fdf4' : 'white' }}>
              <input 
                type="checkbox" 
                checked={languages.includes('EN')} 
                onChange={() => handleLanguageToggle('EN')}
                style={{ width: '20px', height: '20px', accentColor: 'var(--site-primary)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>Anglais (EN)</div>
              </div>
              <span style={{ fontSize: '1.5rem' }}>🇬🇧</span>
            </label>
            
            {languages.length === 0 && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                ⚠️ Vous devez sélectionner au moins une langue.
              </div>
            )}
          </div>
        </div>

        {/* Paramètres de Couleurs */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h2 style={{ marginTop: 0, color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🎨</span> Couleurs Principales
          </h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Personnalisez l'identité visuelle de l'interface kiosque.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569' }}>Couleur Primaire</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="color" 
                  value={primaryColor} 
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{ width: '60px', height: '50px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                />
                <input 
                  type="text" 
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', textTransform: 'uppercase' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569' }}>Couleur Secondaire</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="color" 
                  value={secondaryColor} 
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  style={{ width: '60px', height: '50px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                />
                <input 
                  type="text" 
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', textTransform: 'uppercase' }}
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Colonne de droite: Ordre des catégories et Sauvegarde */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ marginTop: 0, color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📋</span> Ordre des Catégories
          </h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Utilisez les flèches pour modifier l'ordre d'affichage des catégories dans le menu de la borne.
          </p>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '400px', paddingRight: '1rem' }}>
            {categories.map((cat, index) => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                <div style={{ fontWeight: 600, color: '#334155' }}>
                  <span style={{ color: '#94a3b8', marginRight: '0.5rem', fontSize: '0.9rem' }}>{index + 1}.</span> 
                  {cat.title}
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                    onClick={() => moveCategory(index, 'up')}
                    disabled={index === 0}
                    style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.4 : 1 }}
                  >
                    ↑
                  </button>
                  <button 
                    onClick={() => moveCategory(index, 'down')}
                    disabled={index === categories.length - 1}
                    style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: index === categories.length - 1 ? 'not-allowed' : 'pointer', opacity: index === categories.length - 1 ? 0.4 : 1 }}
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div style={{ 
            padding: '1rem', 
            borderRadius: '12px', 
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            border: message.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca',
            fontWeight: 500
          }}>
            {message.text}
          </div>
        )}

        <button 
          onClick={handleSave}
          disabled={isSaving || languages.length === 0}
          style={{ 
            padding: '1.2rem 2rem', 
            background: 'var(--site-primary)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '12px', 
            fontWeight: 700, 
            fontSize: '1.1rem',
            cursor: (isSaving || languages.length === 0) ? 'not-allowed' : 'pointer',
            opacity: (isSaving || languages.length === 0) ? 0.7 : 1,
            transition: 'background 0.2s',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
          }}
        >
          {isSaving ? 'Sauvegarde en cours...' : '💾 Enregistrer les Paramètres'}
        </button>

      </div>

    </div>
  );
}
