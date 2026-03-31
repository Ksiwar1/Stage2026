import styles from "./page.module.css";

export default function Home() {
  // testss
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Bonjour</h1>
        <p className={styles.description}>
          Bienvenue sur votre nouveau projet Next.js.
        </p>
      </div>
    </main>
  );
}  