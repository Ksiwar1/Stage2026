import styles from "../page.module.css";
import Link from "next/link";
import { getLogs, LogEntry } from "../../lib/logger";
import { getCartesVisualSummary } from "../../lib/memory";

export default async function Historique() {
  const logs = getLogs();
  const cartes = await getCartesVisualSummary();

  // Map to store grouped logs
  const groupedLogs: Record<string, { carteMeta: any, recentLogs: LogEntry[] }> = {};

  // Initialize with all existing cards
  cartes.forEach(carte => {
    groupedLogs[carte.nomFichier] = { carteMeta: carte, recentLogs: [] };
  });

  // Sort logs by date descending (newest first)
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Group logs
  logs.forEach(log => {
    if (!groupedLogs[log.nomFichier]) {
      // If log exists for a deleted card
      groupedLogs[log.nomFichier] = { 
        carteMeta: { title: `Carte (${log.nomFichier})`, deleted: true }, 
        recentLogs: [] 
      };
    }
    // Only keep top 10
    if (groupedLogs[log.nomFichier].recentLogs.length < 10) {
      groupedLogs[log.nomFichier].recentLogs.push(log);
    }
  });

  // Pour un meilleur rendu, on met les cartes récemment modifiées en premier
  const sortedKeys = Object.keys(groupedLogs).sort((a, b) => {
    const timeA = groupedLogs[a].recentLogs[0] ? new Date(groupedLogs[a].recentLogs[0].timestamp).getTime() : 0;
    const timeB = groupedLogs[b].recentLogs[0] ? new Date(groupedLogs[b].recentLogs[0].timestamp).getTime() : 0;
    return timeB - timeA;
  });

  return (
    <main className={`${styles.main} ${styles.heroImageBg}`} style={{ minHeight: '100vh', padding: '4rem 1.5rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        
        {/* En-tête de page */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
            <div>
                <h1 style={{ fontSize: '2.5rem', color: 'var(--foreground)', margin: 0, fontWeight: 800, letterSpacing: '-0.03em' }}>
                  Historique & Logs
                </h1>
                <p style={{ color: '#64748b', fontSize: '1.05rem', marginTop: '0.5rem', maxWidth: '500px' }}>
                  Traçabilité complète des opérations, générations IA et suppressions liées à vos catalogues.
                </p>
            </div>
            <Link href="/menu" style={{ 
                padding: '0.6rem 1.2rem', 
                background: 'rgba(255,255,255,0.8)', 
                backdropFilter: 'blur(10px)',
                color: '#334155', 
                borderRadius: '999px', 
                textDecoration: 'none', 
                fontWeight: 600, 
                fontSize: '0.9rem',
                border: '1px solid var(--card-border)',
                transition: 'var(--transition-smooth)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: 'var(--shadow-sm)'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Retour
            </Link>
        </div>

        {sortedKeys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', background: 'rgba(255,255,255,0.5)', borderRadius: '24px', border: '2px dashed var(--card-border)', backdropFilter: 'blur(10px)' }}>
             <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginBottom: '1rem' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
             <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Aucune carte ni aucun historique trouvé.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {sortedKeys.map((nomFichier) => {
              const data = groupedLogs[nomFichier];
              return (
              <div key={nomFichier} style={{ 
                  background: 'var(--card-bg)', 
                  border: '1px solid var(--card-border)', 
                  borderRadius: '24px', 
                  padding: '2.5rem', 
                  boxShadow: 'var(--shadow-md)',
                  backdropFilter: 'blur(16px)'
              }}>
                {/* En-tête de la Carte */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </div>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ margin: 0, color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                               {data.carteMeta.title} 
                               {data.carteMeta.deleted && <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#b91c1c', padding: '0.25rem 0.75rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Supprimée</span>}
                            </h2>
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontFamily: 'monospace', marginTop: '0.25rem', display: 'block' }}>{nomFichier}</span>
                        </div>
                    </div>
                </div>

                {/* Historique Timeline */}
                {data.recentLogs.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>Aucune modification enregistrée pour cette carte.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {data.recentLogs.map((log, index) => {
                            const date = new Date(log.timestamp);
                            const isCreate = log.actionType === 'CREATE';
                            const isDelete = log.actionType === 'DELETE';
                            const badgeBg = isCreate ? '#dcfce7' : isDelete ? '#fee2e2' : '#e0e7ff';
                            const badgeText = isCreate ? '#166534' : isDelete ? '#991b1b' : '#3730a3';
                            const isLast = index === data.recentLogs.length - 1;
                            
                            return (
                                <div key={log.id} style={{ 
                                    display: 'flex', 
                                    gap: '1.5rem', 
                                    alignItems: 'center',
                                    padding: '1.25rem 0',
                                    borderBottom: isLast ? 'none' : '1px solid #f1f5f9'
                                }}>
                                    <div style={{ width: '100px', flexShrink: 0, color: '#64748b', fontSize: '0.8rem' }}>
                                        <div style={{ fontWeight: 600, color: '#475569' }}>{date.toLocaleDateString('fr-FR')}</div>
                                        <div>{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                                    </div>
                                    
                                    <div style={{ width: '90px', flexShrink: 0 }}>
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
                                            minWidth: '85px'
                                        }}>
                                            {log.actionType}
                                        </span>
                                    </div>

                                    <div style={{ flex: 1, color: '#334155', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                        {log.details}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>
    </main>
  );
}
