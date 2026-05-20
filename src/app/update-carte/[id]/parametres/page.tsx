import Link from 'next/link';
import ParametresEditorClient from './ParametresEditorClient';
import { cardService } from '../../../../services/cardService';

export default async function ParametresPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const cardId = params.id.endsWith('.json') ? params.id.replace('.json', '') : params.id;

  let data: any = null;
  let error = null;

  try {
    const card = await cardService.getCardById(cardId);
    if (card) {
      data = card.content;
    } else {
      error = "Carte introuvable dans la base de données.";
    }
  } catch (err: any) {
    error = "Erreur de lecture: " + err.message;
  }

  if (error || !data) {
    return (
      <main style={{ padding: '4rem 2rem', background: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1.5rem', borderRadius: '12px' }}>
            {error || "Données introuvables."}
          </div>
        </div>
      </main>
    );
  }

  // Extract Categories
  const categories = Object.keys(data.categories || {})
    .filter(id => data.categories[id]?.title && data.categories[id]?.isVisible !== false)
    .map(id => ({
      id,
      title: data.categories[id].title,
      rank: data.workflow?.[id]?.rank !== undefined ? data.workflow[id].rank : (data.categories[id].rank || 0)
    }))
    .sort((a, b) => a.rank - b.rank);

  // Extract Languages
  const languages = data.opt?.languages || ['FR', 'EN'];

  // Extract Colors
  let primaryColor = 'var(--site-primary, #10b981)';
  let secondaryColor = '#059669';
  if (data.theme) {
    primaryColor = data.theme.primary || (data.theme.palette && data.theme.palette[0]) || primaryColor;
    secondaryColor = data.theme.secondary || (data.theme.palette && data.theme.palette[1]) || secondaryColor;
  }

  const title = data.title || params.id.replace(/_/g, ' ');

  return (
    <main style={{ padding: '4rem 2rem', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3rem', gap: '1.5rem' }}>
           <Link href={`/update-carte/${cardId}`} style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', textDecoration: 'none', color: '#0f172a', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
             &larr; Retour au Dashboard
           </Link>
           <div>
             <h1 style={{ margin: 0, fontSize: '2rem', color: '#0f172a', letterSpacing: '-0.02em' }}>Paramètres Globaux</h1>
             <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem' }}>{title}</div>
           </div>
        </div>

        <ParametresEditorClient 
          nomFichier={cardId}
          initialCategories={categories}
          initialLanguages={languages}
          initialPrimaryColor={primaryColor}
          initialSecondaryColor={secondaryColor}
        />
      </div>
    </main>
  );
}
