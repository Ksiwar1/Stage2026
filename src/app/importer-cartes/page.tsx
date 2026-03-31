import styles from "../page.module.css";
import Link from "next/link";

export default function ImporterCartes() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Importer des cartes</h1>
        <p className={styles.description}>
          Chargez rapidement vos lots de cartes depuis un fichier de données CSV ou Excel.
        </p>
        <button className={styles.button_primary}>Sélectionner un fichier (.csv)</button>
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
