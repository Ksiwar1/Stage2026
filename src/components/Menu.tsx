'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../lib/LanguageContext';
import styles from './Menu.module.css';
import { logoutAction } from '../app/actions/auth';

export default function Menu() {
  const pathname = usePathname();
  const { lang, setLang, t, allowedLanguages, setAllowedLanguages } = useLanguage();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [session, setSession] = useState<{ loggedIn: boolean; role?: string; cardId?: string } | null>(null);

  // Load session on pathname changes
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json();
        return { loggedIn: false };
      })
      .then(data => setSession(data))
      .catch(() => setSession({ loggedIn: false }));
  }, [pathname]);

  // Load theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('site-theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('site-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const navLinks = session?.loggedIn && session?.role === 'CLIENT' 
    ? [] 
    : [
        { title: t('nav_home'), path: '/' },
        { title: t('nav_dashboard'), path: '/menu' }
      ];

  useEffect(() => {
    // Read global site settings from API
    fetch('/api/settings')
      .then(res => {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return res.json();
        }
        throw new TypeError('Oops, we haven\'t got JSON!');
      })
      .then(parsed => {
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
      })
      .catch(e => console.error("Failed to load site settings from DB", e));
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
            className={styles.logoImg}
            suppressHydrationWarning
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

          {/* Theme Selector */}
          <div className={styles.langSelector} style={{ marginRight: '0.5rem' }}>
            <button 
              className={`${styles.langBtn} ${theme === 'dark' ? styles.activeLang : ''}`} 
              onClick={() => theme === 'light' && toggleTheme()}
              title="Mode Sombre"
            >
              🌙 Noir
            </button>
            <button 
              className={`${styles.langBtn} ${theme === 'light' ? styles.activeLang : ''}`} 
              onClick={() => theme === 'dark' && toggleTheme()}
              title="Mode Clair"
            >
              ☀️ Blanc
            </button>
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

          {/* Logout Button if logged in */}
          {session?.loggedIn && (
            <button 
              onClick={async () => {
                await logoutAction();
                window.location.href = '/login';
              }}
              className={styles.langBtn}
              style={{ 
                marginLeft: '1rem', 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: '#fca5a5', 
                border: '1px solid rgba(239, 68, 68, 0.2)',
                cursor: 'pointer'
              }}
              title="Déconnexion"
            >
              🚪 Déconnexion
            </button>
          )}
        </div>

      </div>
    </nav>
  );
}

// trigger rebuild
