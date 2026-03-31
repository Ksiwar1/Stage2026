import styles from "../page.module.css";
import Link from "next/link";
import { getCartesMemory } from "../../lib/memory"; // Import direct du code NodeJS

// Ceci est un Server Component. Il peut lire le dossier sans aucun problème !
export default async function Bibliotheque() {
  const cartesMemoire = getCartesMemory();

  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>La Mémoire (Cartes déjà faites)</h1>
        <p className={styles.description}>
          Voici la mémoire de votre application (les fichiers JS stockés en dur). 
          Ces fichiers nourrissent l'Intelligence Artificielle de référence (RAG).
        </p>
      </div>
      
      <div className={styles.grid}>
        {cartesMemoire.length === 0 ? (
          <p>Aucune carte en mémoire. Glissez vos fichiers JS dans le dossier src/data/cartes.</p>
        ) : (
          cartesMemoire.map((carte, index) => (
            <div key={index} className={styles.card} style={{ flexBasis: "100%", maxWidth: "100%", width: "100%" }}>
              <h2>Fichier : {carte.nomFichier}</h2>
              <pre style={{ 
                background: "rgba(0,0,0,0.5)", 
                padding: "1rem", 
                borderRadius: "8px",
                overflowX: "auto",
                fontFamily: "monospace",
                color: "#a1a1aa",
                marginTop: "1rem",
                textAlign: "left"
              }}>
                <code>{carte.contenu}</code>
              </pre>
            </div>
          ))
        )}

        <Link href="/menu" className={styles.card} style={{ marginTop: "2rem" }}>
          <h2>
            <span>&lt;-</span> Retour au menu
          </h2>
          <p>Revenir au tableau de bord principal.</p>
        </Link>
      </div>
    </main>
  );
}
