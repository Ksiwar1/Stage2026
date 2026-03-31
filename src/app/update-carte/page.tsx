import styles from "../page.module.css";
import Link from "next/link";

export default function UpdateCarte() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Update Carte</h1>
        <p className={styles.description}>
          Portail de modification et supervision des statuts de vos cartes.
        </p>
        <button className={styles.button_primary}>Chercher une carte</button>
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
