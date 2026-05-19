'use server';

import { revalidatePath } from 'next/cache';
import { cardService } from '../../services/cardService';

// Fini le FormData hasardeux ! On reçoit une simple chaîne de caractères JSON
export async function saveJsonCarte(nomFichier: string, contenuBrut: string) {
  try {
    if (!nomFichier.endsWith('.json')) {
      return { success: false, message: "Le fichier doit être au format .json" };
    }

    // Parsing du contenu brut
    let data;
    try {
      data = JSON.parse(contenuBrut);
    } catch (e) {
      return { success: false, message: "❌ Le fichier ne contient pas un JSON valide." };
    }

    const storeName = data.title || nomFichier.replace('.json', '');

    // Enregistrement direct dans la base de données PostgreSQL
    await cardService.createCard({
      store_name: storeName,
      content: data
    });

    // Rafraîchissement Next.js 
    revalidatePath('/importer-cartes');
    revalidatePath('/bibliotheque');

    return { success: true, message: `✅ Le fichier "${nomFichier}" a été importé et sauvegardé avec succès dans la base de données !` };

  } catch (error) {
    console.error("Erreur serveur pendant l'upload :", error);
    return { success: false, message: "❌ Une erreur système est survenue côté serveur." };
  }
}
