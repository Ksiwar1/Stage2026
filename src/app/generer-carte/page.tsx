'use client'; // On passe le composant en mode interactif

import styles from "../page.module.css";
import Link from "next/link";
import { useState } from "react";
import { genererUneNouvelleCarte } from "../actions/genererCarteAction";

export default function GenererCarte() {
  const [resultat, setResultat] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const codeGenere = await genererUneNouvelleCarte(formData);
    setResultat(codeGenere);
  };

  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Générateur IA</h1>
        <p className={styles.description}>
          L'intelligence artificielle est branchée sur vos cartes existantes dans la bibliothèque. Tapez un sujet et laissez la magie opérer.
        </p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', flexDirection: 'column', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
          <input 
            type="text" 
            name="sujet" 
            placeholder="Ex : Carte VIP pour les clients..." 
            required 
            style={{ padding: '1rem', borderRadius: '8px', border: 'none', fontSize: '1.1rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
          />
          <button type="submit" className={styles.button_primary}>Générer par IA</button>
        </form>
      </div>

      {resultat && (
        <div className={styles.grid} style={{ marginTop: '2rem', justifyContent: 'center' }}>
          <div className={styles.card} style={{ flexBasis: '100%', maxWidth: '100%' }}>
            <h2>🎉 Réponse de l'IA basée sur la mémoire :</h2>
            <pre style={{ background: "rgba(0,0,0,0.5)", padding: "1rem", borderRadius: "8px", color: "#a1a1aa", marginTop: "1rem" }}>
              <code>{resultat}</code>
            </pre>
            <p style={{ marginTop: '1rem', color: '#ff8a00' }}>Vérifiez le terminal de votre serveur Next.js pour voir le PROMPT EXACT complet qui a été envoyé à l'IA !</p>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        <Link href="/menu" className={styles.card}>
          <h2><span>&lt;-</span> Retour au menu</h2>
        </Link>
      </div>
    </main>
  );
}
