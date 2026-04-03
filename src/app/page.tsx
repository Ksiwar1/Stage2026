import styles from "./page.module.css";
import Link from 'next/link';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.heroBackground}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>Bienvenue</h1>
          <p className={styles.description}>
            Cartes Softavera
          </p>
        </div>
      </div>
    </main>
  );
}