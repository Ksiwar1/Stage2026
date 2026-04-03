'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Menu.module.css';

export default function Menu() {
  const pathname = usePathname();

  const navLinks = [
    { title: 'Accueil', path: '/' },
    { title: 'Tableau de bord', path: '/menu' }
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

        {/* Liens de Navigation */}
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
      </div>
    </nav>
  );
}
