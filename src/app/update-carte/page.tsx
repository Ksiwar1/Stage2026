import styles from "../page.module.css";
import Link from "next/link";

export default function UpdateCarte() {
  return (
    <main className={`${styles.main} ${styles.heroImageBg}`}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Update Carte</h1>
        <p className={styles.description}>
          Portail de modification et supervision des statuts de vos cartes.
        </p>
        <button className={styles.button_primary}>Chercher une carte</button>
        <div style={{ marginTop: '1.5rem' }}>
          <Link href="/menu" className={styles.backButton}><span>&lt;-</span> Retour au tableau de bord</Link>
        </div>
      </div>
    </main>
  );
}
