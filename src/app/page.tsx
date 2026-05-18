'use client';

import styles from "./page.module.css";
import Link from 'next/link';
import { useLanguage } from '../lib/LanguageContext';

const PARTNER_LOGOS = [
  "https://softavera.com/assets/logos/partners/black/five.png",
  "https://softavera.com/assets/logos/partners/black/burger.png",
  "https://softavera.com/assets/logos/partners/black/burg-add.png",
  "https://softavera.com/assets/logos/partners/black/contine.png",
  "https://softavera.com/assets/logos/partners/black/gur.png",
  "https://softavera.com/assets/logos/partners/black/hot.png",
  "https://softavera.com/assets/logos/partners/black/IT.png",
  "https://softavera.com/assets/logos/partners/black/quic.png",
  "https://softavera.com/assets/logos/partners/black/spot.png",
  "https://softavera.com/assets/logos/partners/black/steak.png",
  "https://softavera.com/assets/logos/partners/black/tacos.png",
  "https://softavera.com/assets/logos/partners/black/time.png",
];

export default function Home() {
  const { t } = useLanguage();

  return (
    <main className={styles.main}>
      <div className={styles.heroBackground}>
        <div className={styles.heroContent}>
          
          {/* Main Title & Subtitle */}
          <h1 className={styles.title}>{t('home_title')}</h1>
          <p className={styles.description}>
            {t('home_subtitle')}
          </p>

          {/* Action Buttons */}
          <div className={styles.buttonGroup}>
            <Link href="/menu" className={styles.btnPrimary}>
              {t('home_cta_primary')}
            </Link>
            <Link href="/historique" className={styles.btnSecondary}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              {t('home_cta_secondary')}
            </Link>
          </div>

          {/* Trust/Statistics Line */}
          <div className={styles.statsContainer}>
            <div className={styles.statBlock}>
              <div className={styles.statNumber}>&lt; 2 min</div>
              <div className={styles.statLabel}>{t('stat_clients')}</div>
            </div>
            <div className={styles.statBlock}>
              <div className={styles.statNumber} style={{ color: '#10b981' }}>100%</div>
              <div className={styles.statLabel}>{t('stat_orders')}</div>
            </div>
            <div className={styles.statBlock}>
              <div className={styles.statNumber}>Immédiat</div>
              <div className={styles.statLabel}>{t('stat_uptime')}</div>
            </div>
          </div>
        </div>

        {/* Partner Logos Marquee (Pleine Largeur) */}
        <div className={styles.marqueeContainer}>
          <div className={styles.marqueeContent}>
            {/* Premier set */}
            {PARTNER_LOGOS.map((logo, index) => (
              <img key={`logo-1-${index}`} src={logo} alt={`Partenaire Softavera ${index + 1}`} className={styles.marqueeLogo} />
            ))}
            {/* Deuxième set (dupliqué pour scroll infini) */}
            {PARTNER_LOGOS.map((logo, index) => (
              <img key={`logo-2-${index}`} src={logo} alt={`Partenaire Softavera duplicate ${index + 1}`} className={styles.marqueeLogo} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}