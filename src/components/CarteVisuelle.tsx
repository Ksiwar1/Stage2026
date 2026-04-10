import { VisualCardSummary } from "../lib/memory";
import Link from 'next/link';

export default function CarteVisuelle({ summary }: { summary: VisualCardSummary }) {
  if (summary.type === 'ERROR') {
    return (
      <div style={{ background: '#fee2e2', border: '1px solid #ef4444', padding: '1.5rem', borderRadius: '12px' }}>
        <h3 style={{ margin: 0, color: '#991b1b' }}>❌ {summary.nomFichier}</h3>
        <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.9rem' }}>Fichier corrompu ou illisible.</p>
      </div>
    );
  }

  if (summary.type === 'ETK360_CATALOG') {
    return (
      <Link href={`/borne/${summary.nomFichier.replace('.json', '')}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%', transition: 'transform 0.2s', ...({ '&:hover': { transform: 'translateY(-5px)' } } as any) }}>
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          {/* En-tête de la carte avec Image Hero / Logo */}
          <div style={{ padding: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)', flexGrow: 1, position: 'relative' }}>

            <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.05)', padding: '0.4rem 0.8rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
              {summary.itemCount} articles
            </div>

            <div style={{
              width: '100%',
              height: '140px',
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)', top: '-50%', left: '-50%' }}></div>

              {summary.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={summary.logoUrl} alt="Logo Restaurant" style={{ width: '80px', height: '80px', objectFit: 'contain', background: 'white', padding: '0.5rem', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 10 }} />
              ) : (
                <div style={{ width: '80px', height: '80px', background: '#3b82f6', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '16px', fontSize: '2rem', fontWeight: 900, boxShadow: '0 10px 25px rgba(59,130,246,0.4)', zIndex: 10, textTransform: 'uppercase' }}>
                  {(summary.restaurantName || "R").charAt(0)}
                </div>
              )}
            </div>

            <div style={{ padding: '1.5rem', textAlign: 'center', width: '100%' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                {summary.restaurantName || summary.nomFichier.replace('.json', '')}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                {summary.nomFichier.includes('franchise') ? 'Franchise ETK360' : 'Boutique ETK360'}
              </p>
            </div>
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
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
