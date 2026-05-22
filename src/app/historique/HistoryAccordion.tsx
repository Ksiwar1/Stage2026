'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import KioskSimulator from '../../components/KioskSimulator';
import { parseETK360Hierarchy } from '../../lib/softaveraParser';

type HistoryLog = {
  id: string;
  id_carte: string;
  cart: any;
  date_modification: string;
  action?: string;
  details?: string;
};

export default function HistoryAccordion({ card }: { card: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<HistoryLog[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<HistoryLog | null>(null);

  const fetchHistory = async () => {
    if (!history) {
      setLoading(true);
      try {
        const res = await fetch(`/api/cards/${card.id}/history`);
        const contentType = res.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
          data = await res.json();
        } else {
          throw new TypeError('Oops, we haven\'t got JSON!');
        }
        setHistory(data);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'historique', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleAccordion = () => {
    if (!isOpen) {
      fetchHistory();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div style={{ 
        background: 'var(--card-bg)', 
        border: '1px solid var(--card-border)', 
        borderRadius: '24px', 
        padding: '2rem', 
        boxShadow: 'var(--shadow-md)',
        backdropFilter: 'blur(16px)'
    }}>
      {/* En-tête de la Carte (Cliquable) */}
      <div 
        onClick={toggleAccordion} 
        style={{ cursor: 'pointer', display: 'flex', gap: '1.25rem', alignItems: 'center' }}
      >
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foreground)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {card.store_name}
              </h2>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'monospace', marginTop: '0.25rem', display: 'block' }}>{card.id}</span>
          </div>
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', color: 'var(--foreground)' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
      </div>

      {/* Historique Timeline */}
      {isOpen && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
              {loading ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
                      Chargement de l'historique...
                  </div>
              ) : history && history.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Aucune modification enregistrée pour cette carte.</p>
              ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {history?.map((log, index) => {
                          const date = new Date(log.date_modification);
                          const isLast = index === history.length - 1;
                          
                          const actionType = log.action || 'UPDATE';
                          const isCreate = actionType.startsWith('CREATE');
                          const isDelete = actionType.startsWith('DELETE');
                          const badgeBg = isCreate ? 'rgba(34, 197, 94, 0.2)' : isDelete ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)';
                          const badgeText = isCreate ? '#4ade80' : isDelete ? '#f87171' : '#818cf8';
                          
                          return (
                              <div key={log.id} style={{ 
                                  display: 'flex', 
                                  gap: '1.5rem', 
                                  alignItems: 'center',
                                  padding: '1.25rem 0',
                                  borderBottom: isLast ? 'none' : '1px solid var(--card-border)'
                              }}>
                                  <div style={{ width: '100px', flexShrink: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                      <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{date.toLocaleDateString('fr-FR')}</div>
                                      <div>{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                                  </div>
                                  
                                  <div style={{ width: '110px', flexShrink: 0 }}>
                                      <span style={{ 
                                          background: badgeBg, 
                                          color: badgeText, 
                                          padding: '0.35rem 0.8rem', 
                                          borderRadius: '999px', 
                                          fontSize: '0.7rem', 
                                          fontWeight: 800,
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.05em',
                                          display: 'inline-block',
                                          textAlign: 'center',
                                          minWidth: '95px'
                                      }}>
                                          {actionType}
                                      </span>
                                  </div>

                                  <div style={{ flex: 1, color: 'var(--foreground)', fontSize: '0.95rem', lineHeight: 1.5, opacity: 0.9 }}>
                                      {log.details || 'Modification enregistrée en base de données.'}
                                  </div>
                                  
                                  <div>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', opacity: 0.6, transition: 'opacity 0.2s' }}
                                        title="Voir les données de la carte à cet instant"
                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                      >
                                          👁️
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              )}
          </div>
      )}

      {/* Modal View Carte via Portal */}
      {selectedLog && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ background: 'var(--background)', border: '1px solid var(--card-border)', borderRadius: '24px', width: '100%', maxWidth: '1200px', height: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', zIndex: 10 }}>
                    <h3 style={{ margin: 0, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>👁️</span> 
                        Aperçu de la carte au {new Date(selectedLog.date_modification).toLocaleString('fr-FR')}
                    </h3>
                    <button onClick={() => setSelectedLog(null)} style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255,255,255,0.1)', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', color: 'var(--foreground)', transition: 'all 0.2s' }}>✕</button>
                </div>
                <div style={{ flex: 1, position: 'relative', background: 'var(--background)', overflow: 'hidden' }}>
                    <KioskSimulator 
                        restaurantName={selectedLog.cart?.opt?.restaurantName || selectedLog.cart?.title || card.store_name} 
                        tree={parseETK360Hierarchy(selectedLog.cart)}
                        catalogData={selectedLog.cart}
                    />
                </div>
            </div>
        </div>,
        document.body
      )}
    </div>
  );
}
