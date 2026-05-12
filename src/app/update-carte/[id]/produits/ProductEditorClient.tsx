'use client';

import React, { useState } from 'react';
import { updateProduitAction } from '../../../actions/updateProduitAction';

interface ProductEditorClientProps {
  items: any;
  nomFichier: string;
}

export default function ProductEditorClient({ items, nomFichier }: ProductEditorClientProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States for the form
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState<number | string>(0);
  const [editImg, setEditImg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Convert items object to array for easier mapping
  const itemsArray = Object.keys(items).map(id => ({
    id,
    ...items[id]
  }));

  const filteredItems = itemsArray.filter(item => {
    const name = item.displayName?.dflt?.nameDef || item.title || item.t || item.id;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSelectProduct = (itemId: string) => {
    const item = itemsArray.find(i => i.id === itemId) || items[itemId];
    if (!item) return;
    
    setSelectedItemId(itemId);
    setMessage(null);
    
    // Extract name
    setEditName(item.displayName?.dflt?.nameDef || item.title || item.t || itemId);
    
    // Extract price
    let p = 0;
    if (item.price?.dflt?.ttc !== undefined) p = item.price.dflt.ttc;
    else if (item.price?.ttc !== undefined) p = item.price.ttc;
    else if (item.p !== undefined) p = item.p;
    setEditPrice(p);
    
    // Extract image
    setEditImg(item.img?.dflt?.img || '');
  };

  const handleSave = async () => {
    if (!selectedItemId) return;
    setIsSaving(true);
    setMessage(null);

    const updates = {
      name: editName,
      price: typeof editPrice === 'string' ? (parseFloat(editPrice) || 0) : editPrice,
      img: editImg
    };

    const res = await updateProduitAction(nomFichier, selectedItemId, updates);
    
    if (res?.success) {
      setMessage({ text: 'Produit mis à jour avec succès !', type: 'success' });
      // Update local state to reflect changes instantly without reload
      items[selectedItemId] = res.updatedItem;
    } else {
      setMessage({ text: res?.error || 'Erreur lors de la sauvegarde.', type: 'error' });
    }
    
    setIsSaving(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem', height: 'calc(100vh - 200px)' }}>
      
      {/* Colonne de gauche : Liste des produits */}
      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <input 
            type="text" 
            placeholder="Rechercher un produit..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
          />
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {filteredItems.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8' }}>Aucun produit trouvé.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredItems.map((item, index) => {
                const name = item.displayName?.dflt?.nameDef || item.title || item.t || item.id;
                const isSelected = item.id === selectedItemId;
                return (
                  <button 
                    key={`${item.id}-${index}`}
                    onClick={() => handleSelectProduct(item.id)}
                    style={{ 
                      padding: '1rem', 
                      textAlign: 'left', 
                      background: isSelected ? '#eff6ff' : 'white', 
                      border: isSelected ? '1px solid #bfdbfe' : '1px solid #f1f5f9',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? '#1d4ed8' : '#334155'
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Colonne de droite : Éditeur */}
      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '2.5rem', overflowY: 'auto' }}>
        {!selectedItemId ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>👈</span>
            <p style={{ fontSize: '1.2rem' }}>Sélectionnez un produit dans la liste pour le modifier.</p>
          </div>
        ) : (
          <div style={{ maxWidth: '600px' }}>
            <h2 style={{ marginTop: 0, color: '#0f172a', marginBottom: '2rem' }}>Éditer le produit</h2>
            
            {message && (
              <div style={{ 
                padding: '1rem', 
                marginBottom: '2rem', 
                borderRadius: '8px', 
                background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                color: message.type === 'success' ? '#166534' : '#991b1b',
                border: message.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca'
              }}>
                {message.text}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569' }}>Nom du produit</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569' }}>Prix TTC (€)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569' }}>URL de l'image</label>
                <input 
                  type="text" 
                  value={editImg}
                  onChange={(e) => setEditImg(e.target.value)}
                  placeholder="https://..."
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                />
                {editImg && (
                  <div style={{ marginTop: '1rem', width: '150px', height: '150px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={editImg} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{ 
                    padding: '1rem 2rem', 
                    background: 'var(--site-secondary)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    fontWeight: 600, 
                    fontSize: '1rem',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.7 : 1,
                    transition: 'background 0.2s',
                    width: '100%'
                  }}
                >
                  {isSaving ? 'Sauvegarde en cours...' : 'Sauvegarder les modifications'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
