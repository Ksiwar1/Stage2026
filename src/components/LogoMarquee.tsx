'use client';
import React from 'react';
import styles from './LogoMarquee.module.css';

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

export default function LogoMarquee() {
  return (
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
  );
}
