import styles from "../page.module.css";
import Link from "next/link";

export default function Historique() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Historique</h1>
        <p className={styles.description}>
          Retrouvez ici la traçabilité complète de l'activité liée à vos cartes.
        </p>
        <button className={styles.button_primary}>Rafraîchir les logs</button>
      </div>
      <div className={styles.grid}>
        <Link href="/menu" className={styles.card}>
          <h2>
            <span>&lt;-</span> Retour au menu
          </h2>
          <p>Revenir au tableau de bord principal.</p>
        </Link>
      </div>
    </main>
  );
}
