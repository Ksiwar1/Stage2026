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
    <main className={`${styles.main} ${styles.heroImageBg}`} style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'rgba(255,255,255,0.95)', padding: '3rem', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
            <div>
                <h1 style={{ fontSize: '2.5rem', color: '#0f172a', margin: 0, letterSpacing: '-0.03em' }}>Historique</h1>
                <p style={{ color: '#64748b', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                Retrouvez ici la traçabilité complète de l'activité liée à vos cartes (les 10 dernières actions).
                </p>
            </div>
            <Link href="/" style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', color: '#334155', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, transition: 'all 0.2s' }}>
              &larr; Retour
            </Link>
        </div>

        {sortedKeys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
             Aucune carte ni aucun historique trouvé.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {sortedKeys.map((nomFichier) => {
              const data = groupedLogs[nomFichier];
              return (
              <div key={nomFichier} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.5rem' }}>
                       {data.carteMeta.title} 
                       {data.carteMeta.deleted && <span style={{ fontSize: '0.8rem', background: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.5rem', borderRadius: '6px', marginLeft: '1rem', verticalAlign: 'middle' }}>Supprimée</span>}
                    </h2>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontFamily: 'monospace' }}>{nomFichier}</span>
                </div>

                {data.recentLogs.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>Aucune modification enregistrée pour cette carte.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {data.recentLogs.map((log) => {
                            const date = new Date(log.timestamp);
                            const isCreate = log.actionType === 'CREATE';
                            const isDelete = log.actionType === 'DELETE';
                            const badgeColor = isCreate ? '#dcfce7' : isDelete ? '#fee2e2' : '#e0e7ff';
                            const textColor = isCreate ? '#166534' : isDelete ? '#991b1b' : '#3730a3';
                            
                            return (
                                <div key={log.id} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                                    <div style={{ width: '120px', flexShrink: 0, color: '#64748b', fontSize: '0.85rem', paddingTop: '0.2rem', textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600 }}>{date.toLocaleDateString('fr-FR')}</div>
                                        <div>{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                                        <span style={{ background: badgeColor, color: textColor, padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                                            {log.actionType}
                                        </span>
                                        <span style={{ color: '#334155', fontSize: '0.95rem' }}>{log.details}</span>
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
