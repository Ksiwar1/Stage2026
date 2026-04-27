'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../lib/LanguageContext';
import styles from './Menu.module.css';

export default function Menu() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();

  const navLinks = [
    { title: t('nav_home'), path: '/' },
    { title: t('nav_dashboard'), path: '/menu' }
  ];

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>

        {/* Le Logo Officiel Softavera */}
        <Link href="/" className={styles.logo}>
          <img 
            src="https://softavera.com/assets/logos/softavera/logo-softavera1.png" 
            alt="Logo Softavera" 
            height="45" 
            style={{ objectFit: 'contain' }} 
          />
        </Link>

        {/* Liens de Navigation & Langue */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className={styles.links}>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`${styles.link} ${pathname === link.path ? styles.active : ''}`}
              >
                {link.title}
              </Link>
            ))}
          </div>

          {/* Lang Selector */}
          <div className={styles.langSelector}>
            <button 
              className={`${styles.langBtn} ${lang === 'FR' ? styles.activeLang : ''}`} 
              onClick={() => setLang('FR')}
            >
              FR
            </button>
            <button 
              className={`${styles.langBtn} ${lang === 'EN' ? styles.activeLang : ''}`} 
              onClick={() => setLang('EN')}
            >
              EN
            </button>
          </div>
        </div>

      </div>
    </nav>
  );
}
