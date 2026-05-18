'use client';
import { VisualCardSummary } from "../lib/memory";
import Link from 'next/link';
import { useState } from 'react';
import { deleteCarteAction } from '../app/actions/deleteCarteAction';

export default function CarteVisuelle({ summary, baseRoute = '/borne/' }: { summary: VisualCardSummary, baseRoute?: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement la carte : ${summary.nomFichier} ?`)) return;
    
    setIsDeleting(true);
    const res = await deleteCarteAction(summary.nomFichier);
    if (!res?.success) {
      alert("Erreur lors de la suppression: " + res?.error);
      setIsDeleting(false);
    }
  };
  if (summary.type === 'ERROR') {
    return (
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '1.5rem', borderRadius: '20px', position: 'relative', opacity: isDeleting ? 0.5 : 1 }}>
        <button onClick={handleDelete} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'white', border: '1px solid #fecaca', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'var(--transition-smooth)' }} title="Supprimer">🗑️</button>
        <h3 style={{ margin: 0, color: '#991b1b', paddingRight: '2.5rem', fontSize: '1.1rem' }}>❌ {summary.nomFichier}</h3>
        <p style={{ margin: '0.5rem 0 0 0', color: '#b91c1c', fontSize: '0.9rem' }}>Fichier corrompu ou illisible.</p>
      </div>
    );
  }

  if (summary.type === 'ETK360_CATALOG') {
    let displayName = summary.restaurantName;
    if (!displayName) {
       displayName = summary.nomFichier.replace('.json', '').replace(/^ia_*/, '').replace(/_/g, ' ');
       if (displayName.trim() === '' || displayName.startsWith('INSTRUCTIONS STRUCT')) {
           displayName = "Restaurant IA";
       }
    }
    return (
      <Link href={`${baseRoute}${summary.nomFichier.replace('.json', '')}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%', outline: 'none' }}>
        <div style={{
          background: 'var(--card-bg, rgba(255, 255, 255, 0.95))',
          border: '1px solid var(--card-border, #e2e8f0)',
          borderRadius: '24px',
          padding: '2rem 1.5rem',
          boxShadow: 'var(--shadow-sm, 0 4px 6px -1px rgba(0, 0, 0, 0.05))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '100%',
          position: 'relative',
          transition: 'var(--transition-smooth, all 0.3s ease)',
          backdropFilter: 'blur(10px)',
          opacity: isDeleting ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isDeleting) {
            e.currentTarget.style.transform = 'translateY(-6px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1))';
            e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDeleting) {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm, 0 4px 6px -1px rgba(0, 0, 0, 0.05))';
            e.currentTarget.style.borderColor = 'var(--card-border, #e2e8f0)';
          }
        }}
        >
          {/* Badge Nombre d'Articles */}
          <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f8fafc', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700, color: '#475569', border: '1px solid #e2e8f0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {summary.itemCount} articles
          </div>

          {/* Bouton de Suppression */}
          <button 
            onClick={handleDelete}
            style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', background: 'white', border: '1px solid #fee2e2', width: '32px', height: '32px', borderRadius: '50%', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.1)', transition: 'all 0.2s ease', padding: 0 }}
            title="Supprimer la carte"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fef2f2';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          </button>

          {/* Icône Centrale (Logo ou Initiale) */}
          <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
            {summary.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={summary.logoUrl} alt="Logo Restaurant" style={{ width: '72px', height: '72px', objectFit: 'contain', background: 'white', padding: '0.5rem', borderRadius: '20px', boxShadow: '0 8px 20px rgba(0,0,0,0.06)' }} />
            ) : (
              <div style={{ width: '72px', height: '72px', background: 'linear-gradient(135deg, var(--site-primary, #2563eb), #1d4ed8)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '20px', fontSize: '2rem', fontWeight: 800, boxShadow: '0 10px 20px rgba(37,99,235,0.2)', textTransform: 'uppercase' }}>
                {(displayName || "R").charAt(0)}
              </div>
            )}
          </div>

          {/* Textes (Titre & Sous-titre) */}
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '-0.02em', wordBreak: 'break-word', lineHeight: 1.2 }}>
              {displayName}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
              {summary.nomFichier.includes('franchise') ? 'Franchise ETK360' : 'Boutique ETK360'}
            </p>
          </div>

        </div>
      </Link>
    );
  }

  // Softavera Card ou Inconnu
  return (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '16px',
      padding: '1.5rem',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      position: 'relative',
      opacity: isDeleting ? 0.5 : 1
    }}>
      <button onClick={handleDelete} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} title="Supprimer">🗑️</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: '2rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#111827', wordBreak: 'break-all' }}>📄 {summary.titre || summary.nomFichier}</h3>
        {summary.statut && (
          <span style={{
            background: summary.statut === 'actif' ? '#dcfce7' : '#f3f4f6',
            color: summary.statut === 'actif' ? '#166534' : '#4b5563',
            padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize'
          }}>
            {summary.statut}
          </span>
        )}
      </div>
      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>Stockage : Local (.json)</p>
    </div>
  );
}
