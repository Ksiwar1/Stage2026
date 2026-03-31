'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Menu.module.css';

export default function Menu() {
  const pathname = usePathname();

  const navLinks = [
    { title: 'Accueil', path: '/' },
    { title: 'Tableau de bord', path: '/menu' },
    { title: 'Paramètres', path: '/parametres' },
  ];

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
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
    </nav>
  );
}
