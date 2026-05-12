'use server';

import fs from 'fs';
import path from 'path';

export async function updateParametresAction(
  nomFichier: string, 
  updates: { 
    languages: string[], 
    primaryColor: string, 
    secondaryColor: string,
    categoryOrder: string[]
  }
) {
  try {
    const filePath = path.join(process.cwd(), '.softavera', 'carte', nomFichier);
    if (!fs.existsSync(filePath)) {
      return { success: false, error: "Fichier introuvable" };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

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

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    
    return { success: true };
  } catch (error: any) {
    console.error("Erreur updateParametresAction:", error);
    return { success: false, error: error.message };
  }
}
