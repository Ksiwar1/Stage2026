'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../lib/LanguageContext';
import styles from './Menu.module.css';

export default function Menu() {
  const pathname = usePathname();
  const { lang, setLang, t, allowedLanguages, setAllowedLanguages } = useLanguage();

  const navLinks = [
    { title: t('nav_home'), path: '/' },
    { title: t('nav_dashboard'), path: '/menu' }
  ];

  useEffect(() => {
    // Read global site settings
    const saved = localStorage.getItem("softavera_support_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Handle Languages
        if (parsed.overrideLanguages && parsed.overrideLanguages.length > 0) {
          setAllowedLanguages(parsed.overrideLanguages);
        }

        // Handle Colors
        if (parsed.overridePrimaryColor) {
          document.documentElement.style.setProperty('--site-primary', parsed.overridePrimaryColor);
        } else {
          document.documentElement.style.removeProperty('--site-primary');
        }
        
        if (parsed.overrideSecondaryColor) {
          document.documentElement.style.setProperty('--site-secondary', parsed.overrideSecondaryColor);
        } else {
          document.documentElement.style.removeProperty('--site-secondary');
        }
      } catch (e) {
        console.error("Failed to load site settings", e);
      }
    }
  }, [setAllowedLanguages]);

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>

        {/* Le Logo Officiel Softavera */}
        <Link href="/" className={styles.logo}>
          <img 
            src="https://softavera.com/assets/logos/softavera/logo-softavera1.png" 
            alt="Logo Softavera" 
            height="55" 
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
          {allowedLanguages.length > 1 && (
            <div className={styles.langSelector}>
              {allowedLanguages.includes('FR') && (
                <button 
                  className={`${styles.langBtn} ${lang === 'FR' ? styles.activeLang : ''}`} 
                  onClick={() => setLang('FR')}
                >
                  FR
                </button>
              )}
              {allowedLanguages.includes('EN') && (
                <button 
                  className={`${styles.langBtn} ${lang === 'EN' ? styles.activeLang : ''}`} 
                  onClick={() => setLang('EN')}
                >
                  EN
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}
