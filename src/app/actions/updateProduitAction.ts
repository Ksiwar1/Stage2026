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
    let parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    if (!parsedData || !parsedData.items) {
      return { success: false, error: "La structure de la carte est invalide ou 'items' est manquant." };
    }

    if (Array.isArray(parsedData.items)) {
        item = parsedData.items.find((i: any) => i.id === itemId);
    } else {
        item = parsedData.items[itemId];
    }

    if (!item) {
        console.error("Item Not Found. ItemId:", itemId, "Available Items:", Object.keys(parsedData.items));
        return { success: false, error: "Produit introuvable dans la carte. ID: " + itemId };
    }

    const finalData = parsedData;

    // Mise à jour du nom
    if (item.displayName?.dflt !== undefined) {
        if (typeof item.displayName.dflt === 'string') {
            item.displayName.dflt = updates.name;
        } else if (typeof item.displayName.dflt === 'object') {
            item.displayName.dflt.nameDef = updates.name;
        }
    } else if (item.title !== undefined) {
        item.title = updates.name;
    } else if (item.t !== undefined) {
        item.t = updates.name;
    } else {
        // Fallback
        item.title = updates.name;
    }

    // Mise à jour du prix
    if (item.price?.dflt !== undefined) {
        if (typeof item.price.dflt === 'number') {
            item.price.dflt = updates.price;
        } else if (typeof item.price.dflt === 'object') {
            item.price.dflt.ttc = updates.price;
        }
    } else if (item.price !== undefined) {
        if (typeof item.price === 'number') {
            item.price = updates.price;
        } else if (typeof item.price === 'object') {
            item.price.ttc = updates.price;
        }
    } else if (item.p !== undefined) {
        item.p = updates.price;
    } else {
        // Fallback: create price.dflt
        item.price = { dflt: updates.price };
    }

    // Mise à jour de l'image
    if (typeof item.img === 'string') {
        item.img = updates.img;
    } else if (item.img && typeof item.img.dflt === 'string') {
        item.img.dflt = updates.img;
    } else {
        if (!item.img) item.img = {};
        if (!item.img.dflt) item.img.dflt = {};
        item.img.dflt.img = updates.img;
    }

    // Mettre à jour la base de données
    await cardService.updateCard(
      cardId, 
      { content: finalData }, 
      'UPDATE_PRODUIT', 
      `Modification du produit "${updates.name}" (Prix: ${updates.price}€)`
    );

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
