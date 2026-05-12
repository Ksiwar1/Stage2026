'use client';

import React, { useState, useEffect } from 'react';
import styles from "../page.module.css";
import Link from 'next/link';
import { useLanguage } from '../../lib/LanguageContext';

export default function MenuPage() {
  const { t } = useLanguage();
  const [isClient, setIsClient] = useState(false);
  const [order, setOrder] = useState<string[]>(['generer', 'bibliotheque', 'importer', 'update', 'historique', 'parametres']);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("softavera_support_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.siteMenuOrder && Array.isArray(parsed.siteMenuOrder)) {
          setOrder(parsed.siteMenuOrder);
        }
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  const cards = {
    generer: (
      <Link key="generer" href="/generer-carte" className={styles.card}>
        <h2>{t('card_generate_title')} <span>-&gt;</span></h2>
        <p>{t('card_generate_desc')}</p>
      </Link>
    ),
    bibliotheque: (
      <Link key="bibliotheque" href="/bibliotheque" className={styles.card}>
        <h2>{t('card_library_title')} <span>-&gt;</span></h2>
        <p>{t('card_library_desc')}</p>
      </Link>
    ),
    importer: (
      <Link key="importer" href="/importer-cartes" className={styles.card}>
        <h2>{t('card_import_title')} <span>-&gt;</span></h2>
        <p>{t('card_import_desc')}</p>
      </Link>
    ),
    update: (
      <Link key="update" href="/update-carte" className={styles.card}>
        <h2>{t('card_update_title')} <span>-&gt;</span></h2>
        <p>{t('card_update_desc')}</p>
      </Link>
    ),
    historique: (
      <Link key="historique" href="/historique" className={styles.card}>
        <h2>{t('card_history_title')} <span>-&gt;</span></h2>
        <p>{t('card_history_desc')}</p>
      </Link>
    ),
    parametres: (
      <Link key="parametres" href="/parametres" className={styles.card}>
        <h2>{t('card_settings_title')} <span>-&gt;</span></h2>
        <p>{t('card_settings_desc')}</p>
      </Link>
    )
  };

  return (
    <main className={`${styles.main} ${styles.heroImageBg}`}>
      <div className={styles.hero}>
        <h1 className={styles.title}>{t('dashboard_title')}</h1>
        <p className={styles.description}>
          {t('dashboard_desc')}
        </p>
      </div>
      
      {isClient ? (
        <div className={styles.grid}>
          {order.map((key) => cards[key as keyof typeof cards])}
        </div>
      ) : (
        <div className={styles.grid}>
          {['generer', 'bibliotheque', 'importer', 'update', 'historique', 'parametres'].map((key) => cards[key as keyof typeof cards])}
        </div>
      )}
    </main>
  );
}
