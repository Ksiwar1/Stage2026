import Link from 'next/link';
import ProductEditorClient from './ProductEditorClient';
import styles from "../../../page.module.css";
import { cardService } from '../../../../services/cardService';

export default async function ProduitsEditorPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const cardId = params.id.endsWith('.json') ? params.id.replace('.json', '') : params.id;
  
  let items = {};
  let error = null;

  try {
    const card = await cardService.getCardById(cardId);
    if (card) {
      items = card.content.items || {};
    } else {
      error = "Carte introuvable dans la base de données.";
    }
  } catch (err: any) {
    error = "Erreur de lecture: " + err.message;
  }

  return (
    <main className={`${styles.main}`} style={{ padding: '2rem', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1.5rem' }}>
           <Link href={`/update-carte/${cardId}`} style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', textDecoration: 'none', color: '#0f172a', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
             &larr; Retour au Dashboard
           </Link>
           <div>
             <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a', letterSpacing: '-0.02em' }}>Catalogue Produits</h1>
             <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem' }}>ID: {cardId}</div>
           </div>
        </div>

        {error ? (
          <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b', padding: '1.5rem', borderRadius: '12px' }}>
            {error}
          </div>
        ) : (
          <ProductEditorClient items={items} nomFichier={cardId} />
        )}
      </div>
    </main>
  );
}
