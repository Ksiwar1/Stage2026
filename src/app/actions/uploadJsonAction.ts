'use server';

import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

// Fini le FormData hasardeux ! On reçoit une simple chaîne de caractères JSON
export async function saveJsonCarte(nomFichier: string, contenuBrut: string) {
  try {
    if (!nomFichier.endsWith('.json')) {
      return { success: false, message: "Le fichier doit être au format .json" };
    }

    // Sécurisation du chemin (on garde le dossier caché pour éviter les crashs de redémarrage)
    const directoryPath = path.join(process.cwd(), '.softavera', 'carte');
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    const filePath = path.join(directoryPath, nomFichier);

    // Écriture du contenu texte brut directement
    fs.writeFileSync(filePath, contenuBrut, 'utf-8');

    // Rafraîchissement Next.js 
    revalidatePath('/importer-cartes');
    revalidatePath('/bibliotheque');

    return { success: true, message: `✅ Le fichier "${nomFichier}" a été lu et sauvegardé avec succès !` };

  } catch (error) {
    console.error("Erreur serveur pendant l'upload :", error);
    return { success: false, message: "❌ Une erreur système est survenue côté serveur." };
  }
}
