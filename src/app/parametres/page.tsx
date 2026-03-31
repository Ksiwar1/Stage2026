import styles from "../page.module.css";
import Link from "next/link";

export default function Parametres() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Paramètres</h1>
        <p className={styles.description}>
          Configurez ici l'application, vos intégrations ou vos préférences globales.
        </p>
        <button className={styles.button_primary}>Sauvegarder</button>
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
