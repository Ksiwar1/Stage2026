'use server';

import { revalidatePath } from 'next/cache';
import { cardService } from '../../services/cardService';

export async function deleteCarteAction(cardId: string) {
  try {
    if (!cardId) {
       return { success: false, error: "Identifiant invalide." };
    }

    // Supprimer de la base de données PostgreSQL
    const deleted = await cardService.deleteCard(cardId);
    
    if (deleted) {
      // Mettre à jour la bibliothèque instantanément
      revalidatePath('/bibliotheque');
      revalidatePath('/menu');
      revalidatePath('/');
      revalidatePath('/historique');

      return { success: true };
    } else {
      return { success: false, error: "Carte introuvable dans la base de données." };
    }
  } catch (error: any) {
    console.error("Erreur de suppression:", error);
    return { success: false, error: error.message };
  }
}
