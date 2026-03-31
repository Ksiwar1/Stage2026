import fs from 'fs';
import path from 'path';

// 1. Structure métier attendue dans chaque fichier JSON Softavera
export interface CarteSoftavera {
  id: string;
  titre: string;
  statut: "actif" | "inactif" | "archive";
  prix?: number;
}

// 2. Types de Retours (Gestion robuste des erreurs)
export type ParsingResult = 
  | { success: true; fichier: string; data: CarteSoftavera }
  | { success: false; fichier: string; error: string };

// 3. Fonction Serveur Principale : Lecture du système de fichiers
export function getAllCartesSoftavera(): ParsingResult[] {
  // Chemin absolu hyper sûr pour pointer hors de src (évite de faire redémarrer Next.js)
  const directoryPath = path.join(process.cwd(), '.softavera', 'carte');
  
  if (!fs.existsSync(directoryPath)) {
    // Si le dossier n'existe pas, on retourne un tableau vide plutôt que de faire exploser l'app
    return [];
  }

  const files = fs.readdirSync(directoryPath).filter(file => file.endsWith('.json'));
  const results: ParsingResult[] = [];

  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      let parsedData;
      // ÉTAPE A : Sécurisation du JSON (JSON.parse casse l'app s'il manque une virgule)
      try {
        parsedData = JSON.parse(fileContent);
      } catch (parseError) {
        results.push({ success: false, fichier: file, error: "❌ Erreur de Syntaxe (JSON mal formé, ex: virgule manquante)." });
        continue; // On isole l'erreur et on passe intelligemment au fichier suivant
      }
      
      // ÉTAPE B : Validation Typée (Vérification des champs obligatoires)
      if (!parsedData.id || !parsedData.titre || !parsedData.statut) {
         results.push({ success: false, fichier: file, error: "❌ Propriétés requises manquantes (id, titre ou statut manquant)." });
         continue;
      }

      // Si toutes les épreuves sont passées : Succès !
      results.push({ success: true, fichier: file, data: parsedData as CarteSoftavera });
      
    } catch (fsError) {
      results.push({ success: false, fichier: file, error: "⚠️ Erreur système lors de la lecture sur le disque." });
    }
  }

  return results; // Retourne le mix de succès et d'erreurs interceptées
}
