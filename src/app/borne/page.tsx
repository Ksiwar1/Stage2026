import styles from "../page.module.css";
import Link from "next/link";
import { getCartesVisualSummary } from "../../lib/memory";
import CarteGrid from "../../components/CarteGrid";
import LogoMarquee from '../../components/LogoMarquee';

/**
 * Page d'index des bornes (`/borne`).
 *
 * Liste toutes les cartes disponibles ; un clic ouvre la borne correspondante
 * `/borne/<id>`. Réutilise `CarteGrid` (dont `CarteVisuelle` pointe par défaut
 * vers `/borne/`), comme le fait `/update-carte`.
 */
export default async function BorneIndex() {
  const cartes = await getCartesVisualSummary();

  return (
    <main className={`${styles.main} ${styles.heroImageBg}`}>
      <div className={styles.hero} style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
        <h1 className={styles.title}>Bornes</h1>
        <p className={styles.description}>
          Sélectionnez une carte pour lancer sa borne de commande.
        </p>

        <div style={{ marginTop: '3rem', width: '100%', maxWidth: '1200px', margin: '3rem auto 0' }}>
          <CarteGrid cartes={cartes} baseRoute="/borne/" />
        </div>

        <div style={{ marginTop: '4rem' }}>
          <Link href="/menu" className={styles.backButton}><span>&lt;-</span> Retour au tableau de bord</Link>
        </div>
      </div>
      <LogoMarquee />
    </main>
  );
}
