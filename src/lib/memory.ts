import fs from 'fs';
import path from 'path';

export interface MemoryFile {
  nomFichier: string;
  contenu: string;
}

export function getCartesMemory(): MemoryFile[] {
  const directoryPath = path.join(process.cwd(), '.softavera', 'carte');
  
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  // Lecture de tous les fichiers JS, TS ou JSON dans le dossier
  const files = fs.readdirSync(directoryPath).filter(file => 
    file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.ts')
  );
  
  return files.map(file => {
    const filePath = path.join(directoryPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      nomFichier: file,
      contenu: content
    };
  });
}

// Fonction utilitaire clé en main pour fabriquer le "Prompt" de l'IA (Few-Shot Injection)
export function getPromptSystemForAI(): string {
  const memory = getCartesMemory();
  const memoryStrings = memory.map(f => `--- DÉBUT FICHIER: ${f.nomFichier} ---\n${f.contenu}\n--- FIN FICHIER ---`).join('\n\n');

  return `Tu es un générateur de cartes expert pour une application Next.js.
Voici la base de données (mémoire intégrée) des cartes existantes du projet :

${memoryStrings}

Instruction absolue : Quand on te demandera de générer une nouvelle carte, tu DOIS te baser exactement sur les structures ci-dessus. Ta réponse ne doit contenir QUE le code (le fichier JS équivalent) de la nouvelle carte demandée, sans aucune explication ou blabla supplémentaire.`;
}

export interface VisualCardSummary {
  nomFichier: string;
  type: 'ETK360_CATALOG' | 'SOFTAVERA_CARD' | 'UNKNOWN' | 'ERROR';
  itemCount: number;
  previewImages: string[];
  titre?: string;
  statut?: string;
  logoUrl?: string;
  restaurantName?: string;
}

export function getCartesVisualSummary(): VisualCardSummary[] {
  const directoryPath = path.join(process.cwd(), '.softavera', 'carte');
  if (!fs.existsSync(directoryPath)) return [];

  const files = fs.readdirSync(directoryPath).filter(file => file.endsWith('.json'));
  const summaries: VisualCardSummary[] = [];

  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Détecter ETK360 (gros JSON avec "items")
      if (data && typeof data === 'object' && data.items && typeof data.items === 'object') {
        const itemIds = Object.keys(data.items);
        const images: string[] = [];
        
        // Extraction max 4 images
        for (let i = 0; i < Math.min(20, itemIds.length); i++) {
          if (images.length >= 4) break;
          const item = data.items[itemIds[i]];
          if (item?.img?.dflt?.img) {
             images.push(item.img.dflt.img);
          }
        }

        let logoUrl = null;
        let restaurantName = null;
        if (data.shoplist && typeof data.shoplist === 'object') {
           const firstShop = Object.values(data.shoplist)[0] as any;
           if (firstShop) {
              restaurantName = firstShop.Company || data.title;
              if (firstShop.img && firstShop.img !== 'no-pictures.svg' && firstShop.img !== 'undefined') {
                 logoUrl = firstShop.img.startsWith('http') ? firstShop.img : `https://beta-catalogue.etk360.com/${firstShop.img}`;
              }
           }
        }

        summaries.push({
          nomFichier: file,
          type: 'ETK360_CATALOG',
          itemCount: itemIds.length,
          previewImages: images,
          logoUrl: logoUrl || undefined,
          restaurantName: restaurantName || data.title
        });
      } 
      // Détecter Softavera standard
      else if (data && data.titre && data.statut) {
        summaries.push({
          nomFichier: file,
          type: 'SOFTAVERA_CARD',
          itemCount: 0,
          previewImages: [],
          titre: data.titre,
          statut: data.statut
        });
      } 
      else {
        summaries.push({
          nomFichier: file,
          type: 'UNKNOWN',
          itemCount: 0,
          previewImages: []
        });
      }

    } catch (e) {
      summaries.push({
        nomFichier: file,
        type: 'ERROR',
        itemCount: 0,
        previewImages: []
      });
    }
  }

  return summaries;
}
