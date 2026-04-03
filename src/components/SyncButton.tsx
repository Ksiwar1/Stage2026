'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<{ message: string; details?: any[]; success: boolean } | null>(null);
  const router = useRouter();

  const handleSync = async () => {
    setIsSyncing(true);
    setStatus(null);
    try {
      const res = await fetch('/api/sync-cartes', { method: 'POST' });
      const data = await res.json();
      setStatus({ 
        message: data.message, 
        success: data.success,
        details: data.details 
      });
      // Rafraîchir la page courante pour voir les nouvelles json apparaitre
      if (data.success) {
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      setStatus({ message: "Erreur réseau lors de la synchronisation.", success: false });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1rem', marginBottom: '1rem' }}>
      <button 
        onClick={handleSync}
        disabled={isSyncing}
        style={{
          background: isSyncing ? '#cbd5e1' : 'transparent',
          color: isSyncing ? '#64748b' : '#059669',
          border: '2px solid #059669',
          padding: '0.6rem 1.5rem',
          borderRadius: '99px',
          fontWeight: 'bold',
          cursor: isSyncing ? 'wait' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isSyncing ? 'none' : '0 4px 6px rgba(5, 150, 105, 0.1)',
        }}
        onMouseOver={(e) => {
          if (!isSyncing) {
            e.currentTarget.style.background = '#059669';
            e.currentTarget.style.color = 'white';
          }
        }}
        onMouseOut={(e) => {
          if (!isSyncing) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#059669';
          }
        }}
      >
        {isSyncing ? 'Synchronisation en cours...' : '🔄 Synchroniser les cartes du catalogue'}
      </button>

      {status && (
        <div style={{
          background: status.success ? '#dcfce7' : '#fee2e2',
          color: status.success ? '#166534' : '#991b1b',
          padding: '1rem',
          borderRadius: '8px',
          fontSize: '0.9rem',
          maxWidth: '500px',
          textAlign: 'left'
        }}>
          <strong>{status.message}</strong>
          {status.details && status.details.length > 0 && (
            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.2rem' }}>
              {status.details.map((d, i) => (
                <li key={i}>
                  {d.success ? '✅' : '❌'} {d.name} {d.error && `(${d.error})`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
