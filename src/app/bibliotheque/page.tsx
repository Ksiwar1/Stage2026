import styles from "../page.module.css";
import Link from "next/link";
import { getCartesVisualSummary } from "../../lib/memory"; 
import SyncButton from "../../components/SyncButton";
import CarteVisuelle from "../../components/CarteVisuelle";

// Ceci est un Server Component. Il peut lire le dossier sans aucun problème !
export default async function Bibliotheque() {
  const cartesMemoire = getCartesVisualSummary();

  return (
    <main className={`${styles.main} ${styles.heroImageBg}`}>
      <div className={styles.hero}>
        <h1 className={styles.title}>La Mémoire (Cartes déjà faites)</h1>
        <p className={styles.description}>
          Voici la mémoire de votre application (les fichiers JS stockés en dur). 
          Ces fichiers nourrissent l'Intelligence Artificielle de référence (RAG).
        </p>

        <SyncButton />

        <Link href="/menu" className={styles.backButton}>
          <span>&lt;-</span> Retour au tableau de bord
        </Link>
      </div>
      
      <div className={styles.grid}>
        {cartesMemoire.length === 0 ? (
          <p>Aucune carte en mémoire. Lancez une synchronisation ou importez des fichiers JSON (enregistrés dans <code>.softavera/carte/</code>).</p>
        ) : (
          cartesMemoire.map((summary, index) => (
            <CarteVisuelle key={index} summary={summary} />
          ))
        )}
      </div>
    </main>
  );
}
