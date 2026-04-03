import styles from "../page.module.css";
import Link from "next/link";
import UploadButton from "../../components/UploadButton";

export default function ImporterCartes() {
  return (
    <main className={`${styles.main} ${styles.heroImageBg}`}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Importer des Cartes</h1>
        <p className={styles.description}>
          Envoyez vos fichiers JSON locaux vers la mémoire du système via notre interface sécurisée. Les fichiers importés seront automatiquement stockés et consultables dans votre Bibliothèque.
        </p>
        <div style={{ marginTop: '1.5rem' }}>
          <Link href="/menu" className={styles.backButton}><span>&lt;-</span> Retour au tableau de bord</Link>
        </div>
      </div>

      <UploadButton />

    </main>
  );
}
