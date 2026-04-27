'use client';

import styles from "../page.module.css";
import Link from 'next/link';
import { useLanguage } from '../../lib/LanguageContext';

export default function MenuPage() {
  const { t } = useLanguage();

  return (
    <main className={`${styles.main} ${styles.heroImageBg}`}>
      <div className={styles.hero}>
        <h1 className={styles.title}>{t('dashboard_title')}</h1>
        <p className={styles.description}>
          {t('dashboard_desc')}
        </p>
      </div>
      
      <div className={styles.grid}>
        <Link href="/generer-carte" className={styles.card}>
          <h2>{t('card_generate_title')} <span>-&gt;</span></h2>
          <p>{t('card_generate_desc')}</p>
        </Link>
        <Link href="/bibliotheque" className={styles.card}>
          <h2>{t('card_library_title')} <span>-&gt;</span></h2>
          <p>{t('card_library_desc')}</p>
        </Link>
        <Link href="/importer-cartes" className={styles.card}>
          <h2>{t('card_import_title')} <span>-&gt;</span></h2>
          <p>{t('card_import_desc')}</p>
        </Link>
        <Link href="/update-carte" className={styles.card}>
          <h2>{t('card_update_title')} <span>-&gt;</span></h2>
          <p>{t('card_update_desc')}</p>
        </Link>
        <Link href="/historique" className={styles.card}>
          <h2>{t('card_history_title')} <span>-&gt;</span></h2>
          <p>{t('card_history_desc')}</p>
        </Link>
        <Link href="/parametres" className={styles.card}>
          <h2>{t('card_settings_title')} <span>-&gt;</span></h2>
          <p>{t('card_settings_desc')}</p>
        </Link>
      </div>
    </main>
  );
}
