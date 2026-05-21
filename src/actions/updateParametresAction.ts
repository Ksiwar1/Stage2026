'use server';

import { cardService } from '../services/cardService';

export async function updateParametresAction(
  cardId: string, 
  updates: { 
    languages: string[], 
    primaryColor: string, 
    secondaryColor: string,
    categoryOrder: string[]
  }
) {
  try {
    const card = await cardService.getCardById(cardId);
    if (!card) {
      return { success: false, error: "Carte introuvable" };
    }

    const data = card.content;

    // Update Languages
    if (!data.opt) data.opt = {};
    data.opt.languages = updates.languages;

    // Update Colors
    if (!data.theme) data.theme = {};
    data.theme.primary = updates.primaryColor;
    data.theme.secondary = updates.secondaryColor;
    data.theme.palette = [
      updates.primaryColor,
      updates.secondaryColor,
      updates.primaryColor,
      data.theme.text || updates.primaryColor,
      data.theme.onPrimary || '#ffffff',
      updates.secondaryColor
    ]; // Maintain compatibility with older palette array

    // Update Category Order
    // Handle modern AST workflow structure
    if (data.workflow && Object.keys(data.workflow).length > 0) {
      updates.categoryOrder.forEach((catId, index) => {
        if (data.workflow[catId]) {
          data.workflow[catId].rank = index;
        }
        if (data.categories && data.categories[catId]) {
          data.categories[catId].rank = index;
        }
      });
    } else if (data.categories) {
      // Handle legacy categories
      updates.categoryOrder.forEach((catId, index) => {
        if (data.categories[catId]) {
          data.categories[catId].rank = index;
        }
      });
    }

    await cardService.updateCard(
      cardId, 
      { content: data },
      'UPDATE_PARAMETRES',
      `Modification des paramètres (Langues: ${updates.languages.join(', ')})`
    );
    
    return { success: true };
  } catch (error: any) {
    console.error("Erreur updateParametresAction:", error);
    return { success: false, error: error.message };
  }
}
