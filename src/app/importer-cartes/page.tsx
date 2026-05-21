import styles from "../page.module.css";
import Link from "next/link";
import UploadButton from "../../components/UploadButton";

import LogoMarquee from '../../components/LogoMarquee';

export default function ImporterCartes() {
  return (
    <main className={styles.main}>
      
      {/* Contenu de la page avec Background "Bornes" */}
      <div className={styles.heroBackground} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingBottom: '0' }}>
        <div className={styles.heroContent} style={{ paddingTop: '10rem', margin: '0 auto', textAlign: 'center' }}>
          <h1 className={styles.title} style={{ color: 'var(--foreground)', margin: '0 auto' }}>Importer des Cartes</h1>
          <p className={styles.description} style={{ color: 'var(--text-muted)', margin: '1rem auto' }}>
            Envoyez vos fichiers JSON locaux vers la mémoire du système via notre interface sécurisée. Les fichiers importés seront automatiquement stockés et consultables dans votre Bibliothèque.
          </p>
          <div className={styles.buttonGroup} style={{ justifyContent: 'center' }}>
            <Link href="/menu" className={styles.btnSecondary} style={{ background: 'var(--glass-bg)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Retour au tableau de bord
            </Link>
          </div>
        </div>

        {/* Cadre d'importation juste en dessous du titre */}
        <div style={{ 
          marginTop: '3rem', 
          position: 'relative', 
          zIndex: 20,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          padding: '0 1.5rem',
          flex: 1 /* Permet de repousser la marquee vers le bas si besoin */
        }}>
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <UploadButton />
          </div>
        </div>

        {/* Partner Logos Marquee (En bas) */}
        <div style={{ 
          width: '100%', 
          zIndex: 10,
          marginTop: '4rem',
          paddingBottom: '2rem'
        }}>
          <LogoMarquee />
        </div>
      </div>

    </main>
  );
}
