"use client";

import React, { useState } from 'react';
import CarteVisuelle from './CarteVisuelle';
import styles from '../app/page.module.css';

export default function CarteGrid({ cartes }: { cartes: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCartes = cartes.filter(carte => {
    // Les propriétés réelles venant de VisualCardSummary
    const safeTitle = carte.restaurantName || carte.titre || "";
    const safeFileName = (carte.nomFichier || "").replace(/_/g, ' ');
    
    return safeTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
           safeFileName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ marginBottom: '2rem', width: '100%', maxWidth: '600px', padding: '0 20px' }}>
        <input 
          type="text" 
          placeholder="Rechercher une carte (nom ou fichier)..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: '50px',
            border: '1px solid rgba(0,0,0,0.1)',
            fontSize: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            outline: 'none',
            transition: 'all 0.3s ease',
            backgroundColor: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(10px)'
          }}
          onFocus={(e) => {
            e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
            e.target.style.border = '1px solid rgba(0,0,0,0.2)';
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
            e.target.style.border = '1px solid rgba(0,0,0,0.1)';
          }}
        />
      </div>

      <div className={styles.grid}>
        {filteredCartes.length === 0 ? (
          <p style={{ textAlign: 'center', width: '100%', color: '#666' }}>Aucun résultat trouvé pour "{searchTerm}".</p>
        ) : (
          filteredCartes.map((summary, index) => (
            <CarteVisuelle key={index} summary={summary} />
          ))
        )}
      </div>
    </div>
  );
}
