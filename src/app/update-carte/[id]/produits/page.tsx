import Link from 'next/link';
import ProductEditorClient from './ProductEditorClient';
import styles from "../../../page.module.css";
import { cardService } from '../../../../services/cardService';
import { parseETK360Hierarchy } from '../../../../lib/softaveraParser';

export default async function ProduitsEditorPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const cardId = params.id.endsWith('.json') ? params.id.replace('.json', '') : params.id;
  
  let items = {};
  let parsedHierarchy: any[] = [];
  let error = null;

  try {
    const card = await cardService.getCardById(cardId);
    if (card) {
      items = card.content.items || {};
      parsedHierarchy = parseETK360Hierarchy(card.content);
    } else {
      error = "Carte introuvable dans la base de données.";
    }
  } catch (err: any) {
    error = "Erreur de lecture: " + err.message;
  }

  return (
    <main className={`${styles.main}`} style={{ padding: '10rem 2rem 4rem 2rem', background: 'var(--background)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1.5rem' }}>
           <Link href={`/update-carte/${cardId}`} style={{ padding: '0.5rem 1rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', textDecoration: 'none', color: 'var(--foreground)', fontWeight: 600, boxShadow: 'var(--shadow-sm)' }}>
             &larr; Retour au Dashboard
           </Link>
           <div>
             <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--foreground)', letterSpacing: '-0.02em' }}>Catalogue Produits</h1>
             <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>ID: {cardId}</div>
           </div>
        </div>

        {error ? (
          <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b', padding: '1.5rem', borderRadius: '12px' }}>
            {error}
          </div>
        ) : (
          <ProductEditorClient items={items} parsedHierarchy={parsedHierarchy} nomFichier={cardId} />
        )}
      </div>
    </main>
  );
}
