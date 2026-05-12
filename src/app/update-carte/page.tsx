import styles from "../page.module.css";
import Link from "next/link";
import { getCartesVisualSummary } from "../../lib/memory";
import CarteGrid from "../../components/CarteGrid";

export default async function UpdateCarte() {
  const cartes = await getCartesVisualSummary();

  return (
    <main className={`${styles.main} ${styles.heroImageBg}`}>
      <div className={styles.hero} style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
        <h1 className={styles.title}>Update Carte</h1>
        <p className={styles.description}>
          Sélectionnez une carte pour modifier sa structure ou la publier.
        </p>

        <div style={{ marginTop: '3rem', width: '100%', maxWidth: '1200px', margin: '3rem auto 0' }}>
          <CarteGrid cartes={cartes} baseRoute="/update-carte/" />
        </div>

        <div style={{ marginTop: '4rem' }}>
          <Link href="/menu" className={styles.backButton}><span>&lt;-</span> Retour au tableau de bord</Link>
        </div>
      </div>
    </main>
  );
}
