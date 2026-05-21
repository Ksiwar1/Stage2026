import styles from "../page.module.css";
import Link from "next/link";
import { cardService } from "../../services/cardService";
import HistoryAccordion from "./HistoryAccordion";
import LogoMarquee from '../../components/LogoMarquee';


export const dynamic = 'force-dynamic';

export default async function Historique() {
  // Fetch all cards from PostgreSQL
  const cartes = await cardService.getAllCards();

  return (
    <main className={`${styles.main} ${styles.heroImageBg}`} style={{ minHeight: '100vh', padding: '10rem 1.5rem 4rem 1.5rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        
        {/* En-tête de page */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
            <div>
                <h1 style={{ fontSize: '2.5rem', color: 'var(--foreground)', margin: 0, fontWeight: 800, letterSpacing: '-0.03em' }}>
                  Historique & Logs
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginTop: '0.5rem', maxWidth: '500px' }}>
                  Traçabilité complète des modifications de vos cartes. Cliquez sur une carte pour voir ses 5 dernières modifications.
                </p>
            </div>
            <Link href="/menu" style={{ 
                padding: '0.6rem 1.2rem', 
                background: 'rgba(255, 255, 255, 0.1)', 
                backdropFilter: 'blur(10px)',
                color: 'var(--foreground)', 
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

        {!cartes || cartes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '24px', border: '2px dashed var(--card-border)', backdropFilter: 'blur(10px)' }}>
             <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginBottom: '1rem' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
             <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Aucune carte n'a été trouvée dans la base de données.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {cartes.map((carte) => (
               <HistoryAccordion key={carte.id} card={carte} />
            ))}
          </div>
        )}
      </div>
      <LogoMarquee />
    </main>
  );
}
