'use client';

import styles from "./page.module.css";
import Link from 'next/link';
import { useLanguage } from '../lib/LanguageContext';

export default function Home() {
  const { t } = useLanguage();

  return (
    <main className={styles.main}>
      <div className={styles.heroBackground}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>{t('home_welcome')}</h1>
          <p className={styles.description}>
            {t('home_desc')}
          </p>
        </div>
      </div>
    </main>
  );
}