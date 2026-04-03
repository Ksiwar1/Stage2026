import styles from "../page.module.css";
import Link from 'next/link';

export default function MenuPage() {
  return (
    <main className={`${styles.main} ${styles.heroImageBg}`}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Tableau de bord</h1>
        <p className={styles.description}>
          Accédez directement aux différentes fonctionnalités de votre application depuis votre centre de contrôle dynamique.
        </p>
      </div>
      
      <div className={styles.grid}>
        <Link href="/generer-carte" className={styles.card}>
          <h2>Générer une carte <span>-&gt;</span></h2>
          <p>Module intuitif pour configurer et créer de nouvelles cartes personnalisées dans le système.</p>
        </Link>
        <Link href="/bibliotheque" className={styles.card}>
          <h2>Bibliothèque <span>-&gt;</span></h2>
          <p>Consultez l'ensemble de vos cartes existantes, gérez vos archives de manière simplifiée.</p>
        </Link>
        <Link href="/importer-cartes" className={styles.card}>
          <h2>Importer des cartes <span>-&gt;</span></h2>
          <p>Upload de base de données : intégration en masse de cartes via fichiers CSV ou Excel.</p>
        </Link>
        <Link href="/update-carte" className={styles.card}>
          <h2>Update Carte <span>-&gt;</span></h2>
          <p>Interface pour mettre à jour instantanément les informations et modifier le statut de vos cartes.</p>
        </Link>
        <Link href="/historique" className={styles.card}>
          <h2>Historique <span>-&gt;</span></h2>
          <p>Retrouvez et auditez toutes les traces d'activité, les logs, et les opérations générées.</p>
        </Link>
        <Link href="/parametres" className={styles.card}>
          <h2>Paramètres <span>-&gt;</span></h2>
          <p>Gérez vos préférences utilisateurs, votre identité visuelle, et la configuration de l'application.</p>
        </Link>
      </div>
    </main>
  );
}
