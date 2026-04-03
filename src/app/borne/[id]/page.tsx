import fs from 'fs';
import path from 'path';
import KioskSimulator from '../../../components/KioskSimulator';
import { parseETK360Hierarchy } from '../../../lib/softaveraParser';

export default async function BornePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fileName = id.endsWith('.json') ? id : `${id}.json`;
  const filePath = path.join(process.cwd(), '.softavera', 'carte', fileName);

  if (!fs.existsSync(filePath)) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <h1>❌ Impossible de charger la borne. Le fichier {fileName} n'existe pas.</h1>
      </div>
    );
  }

  let data;
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    data = JSON.parse(fileContent);
  } catch (e) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <h1>❌ Le fichier {fileName} est corrompu ou illisible.</h1>
      </div>
    );
  }

  // Lancement du nouveau Parseur IA qui respecte l'ordre absolu du JSON
  const tree = parseETK360Hierarchy(data);

  if (!tree || tree.length === 0) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', flexDirection: 'column' }}>
        <h1 style={{ color: '#991b1b' }}>⚠️ Ce Catalogue ETK360 est invalide.</h1>
        <p>Le parseur n'a trouvé aucune catégorie ni workflow fonctionnel.</p>
      </div>
    );
  }

  const rawTitle = fileName.replace('.json', '').replace('carte_', '').replace(/^[0-9_]+/, '').replace(/_/g, ' ');
  const restaurantName = rawTitle ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1) : "Borne Interactive";

  // Renvoi de la "Base Propre" vers le composant Visuel
  return <KioskSimulator restaurantName={restaurantName} tree={tree} />;
}
