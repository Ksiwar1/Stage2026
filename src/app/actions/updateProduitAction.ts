'use server';

import { revalidatePath } from 'next/cache';
import { addLog } from '../../lib/logger';
import { cardService } from '../../services/cardService';

export async function updateProduitAction(cardId: string, itemId: string, updates: { name: string, price: number, img: string }) {
  try {
    if (!cardId) {
       return { success: false, error: "Identifiant invalide." };
    }

    const card = await cardService.getCardById(cardId);

    if (!card) {
      return { success: false, error: "Carte introuvable dans la base de données." };
    }

    const data = card.content;

    // Récupérer l'item existant pour ne pas casser sa structure (ex: modifier, options...)
    let item;
    if (Array.isArray(data.items)) {
        item = data.items.find((i: any) => i.id === itemId);
    } else {
        item = data.items[itemId];
    }

    if (!item) {
        return { success: false, error: "Produit introuvable dans la carte." };
    }

    // Mise à jour du nom
    if (item.displayName?.dflt) {
        item.displayName.dflt.nameDef = updates.name;
    } else {
        // Fallbacks au cas où
        if (item.title !== undefined) item.title = updates.name;
        if (item.t !== undefined) item.t = updates.name;
    }

    // Mise à jour du prix
    if (item.price?.dflt) {
        item.price.dflt.ttc = updates.price;
    } else if (item.price && typeof item.price === 'object') {
        item.price.ttc = updates.price;
    } else if (item.p !== undefined) {
        item.p = updates.price;
    }

    // Mise à jour de l'image
    if (!item.img) item.img = {};
    if (!item.img.dflt) item.img.dflt = {};
    item.img.dflt.img = updates.img;

    // Mettre à jour la base de données
    await cardService.updateCard(cardId, { content: data });

    // Revalider le cache pour que le changement soit visible sur le Dashboard et le Simulateur
    revalidatePath(`/update-carte/${cardId}`);
    revalidatePath(`/update-carte/${cardId}/produits`);
    revalidatePath(`/borne/${cardId}`);
    revalidatePath(`/historique`);

    addLog(cardId, 'UPDATE', `Modification du produit "${updates.name}" (Prix: ${updates.price}€)`);

    return { success: true, updatedItem: item };

  } catch (error: any) {
    console.error("Erreur de sauvegarde:", error);
    return { success: false, error: error.message };
  }
}
