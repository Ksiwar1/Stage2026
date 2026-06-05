'use client';

import React, { useState } from 'react';
import { updateProduitAction } from '../../../actions/updateProduitAction';

interface ProductEditorClientProps {
  items: any;
  parsedHierarchy?: any[];
  nomFichier: string;
}

export default function ProductEditorClient({ items, parsedHierarchy = [], nomFichier }: ProductEditorClientProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States for the form
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState<number | string>(0);
  const [editImg, setEditImg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Convert items object to array for easier mapping
  const itemsArray = Object.keys(items).map(key => ({
    _key: key,
    ...items[key]
  }));

  const filteredItems = itemsArray.filter(item => {
    const name = item.displayName?.dflt?.nameDef || item.title || item.t || item._key;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Construction du dictionnaire des catégories depuis l'AST (Arbre des catégories)
  const itemToCategory: Record<string, string> = {};
  if (parsedHierarchy && Array.isArray(parsedHierarchy)) {
    parsedHierarchy.forEach(cat => {
      const catTitle = cat.title || "Catégorie inconnue";
      
      // 1. Produits directement dans la catégorie
      if (cat.directProducts && Array.isArray(cat.directProducts)) {
        cat.directProducts.forEach((p: any) => {
          if (p.id) itemToCategory[p.id] = catTitle;
        });
      }
      
      // 2. Produits dans les sous-catégories
      if (cat.subCategories && Array.isArray(cat.subCategories)) {
        cat.subCategories.forEach((subCat: any) => {
          if (subCat.products && Array.isArray(subCat.products)) {
            subCat.products.forEach((p: any) => {
              if (p.id) itemToCategory[p.id] = catTitle;
            });
          }
        });
      }
    });
  }

  // Regroupement
  const groupedItems: Record<string, typeof itemsArray> = {};
  filteredItems.forEach(item => {
    const catName = itemToCategory[item._key] || 'Options & Sous-produits';
    if (!groupedItems[catName]) groupedItems[catName] = [];
    groupedItems[catName].push(item);
  });

  // Trier les catégories (mettre 'Options & Sous-produits' à la fin)
  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    if (a === 'Options & Sous-produits') return 1;
    if (b === 'Options & Sous-produits') return -1;
    return a.localeCompare(b);
  });

  // Tri alphabétique des produits à l'intérieur de chaque catégorie
  Object.keys(groupedItems).forEach(cat => {
    groupedItems[cat].sort((a, b) => {
      const nameA = (a.displayName?.dflt?.nameDef || a.title || a.t || a._key).toLowerCase();
      const nameB = (b.displayName?.dflt?.nameDef || b.title || b.t || b._key).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  });

  const handleSelectProduct = (itemKey: string) => {
    const item = itemsArray.find(i => i._key === itemKey) || items[itemKey];
    if (!item) return;
    
    setSelectedItemId(itemKey);
    setMessage(null);
    
    // Extract name
    setEditName(item.displayName?.dflt?.nameDef || item.title || item.t || itemKey);
    
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
      <div style={{ background: 'var(--card-bg)', borderRadius: '16px', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--card-border)' }}>
          <input 
            type="text" 
            placeholder="Rechercher un produit..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--foreground)', outline: 'none' }}
          />
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {filteredItems.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucun produit trouvé.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {sortedCategories.map(catName => (
                <div key={catName}>
                  <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, paddingLeft: '0.5rem' }}>
                    {catName} <span style={{ fontWeight: 400, opacity: 0.7 }}>({groupedItems[catName].length})</span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {groupedItems[catName].map((item, index) => {
                      const name = item.displayName?.dflt?.nameDef || item.title || item.t || item._key;
                      const isSelected = item._key === selectedItemId;
                      return (
                        <button 
                          key={`${item._key}-${index}`}
                          onClick={() => handleSelectProduct(item._key)}
                          style={{ 
                            padding: '1rem', 
                            textAlign: 'left', 
                            background: isSelected ? 'var(--primary-glow)' : 'var(--glass-bg)', 
                            border: isSelected ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontWeight: isSelected ? 600 : 400,
                            color: isSelected ? 'var(--primary)' : 'var(--foreground)'
                          }}
                        >
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Colonne de droite : Éditeur */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '16px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--card-border)', padding: '2.5rem', overflowY: 'auto' }}>
        {!selectedItemId ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>👈</span>
            <p style={{ fontSize: '1.2rem' }}>Sélectionnez un produit dans la liste pour le modifier.</p>
          </div>
        ) : (
          <div style={{ maxWidth: '600px' }}>
            <h2 style={{ marginTop: 0, color: 'var(--foreground)', marginBottom: '2rem' }}>Éditer le produit</h2>
            
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
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>Nom du produit</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--foreground)', fontSize: '1rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>Prix TTC (€)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--foreground)', fontSize: '1rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>URL de l'image</label>
                <input 
                  type="text" 
                  value={editImg}
                  onChange={(e) => setEditImg(e.target.value)}
                  placeholder="https://..."
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--foreground)', fontSize: '1rem' }}
                />
                {editImg && (
                  <div style={{ marginTop: '1rem', width: '150px', height: '150px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
