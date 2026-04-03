import styles from "../page.module.css";
import Link from "next/link";

export default function Historique() {
  return (
    <main className={`${styles.main} ${styles.heroImageBg}`}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Historique</h1>
        <p className={styles.description}>
          Retrouvez ici la traçabilité complète de l'activité liée à vos cartes.
        </p>
        <button className={styles.button_primary}>Rafraîchir les logs</button>
        <div style={{ marginTop: '1.5rem' }}>
          <Link href="/menu" className={styles.backButton}><span>&lt;-</span> Retour au tableau de bord</Link>
        </div>
      </div>
    </main>
  );
}
