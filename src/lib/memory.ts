import fs from 'fs';
import path from 'path';

export interface MemoryFile {
  nomFichier: string;
  contenu: string;
}

export function getCartesMemory(): MemoryFile[] {
  const directoryPath = path.join(process.cwd(), 'src/data/cartes');
  
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
