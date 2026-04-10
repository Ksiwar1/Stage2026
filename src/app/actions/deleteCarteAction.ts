'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';

export async function deleteCarteAction(fileName: string) {
  try {
    if (!fileName || fileName.includes('..') || fileName.includes('/')) {
       return { success: false, error: "Nom de fichier invalide." };
    }

    const filepath = path.join(process.cwd(), '.softavera', 'carte', fileName);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      
      // Mettre à jour la bibliothèque instantanément
      revalidatePath('/bibliotheque');
      revalidatePath('/menu');
      revalidatePath('/');
      
      return { success: true };
    } else {
      return { success: false, error: "Fichier introuvable sur le disque." };
    }
  } catch (error: any) {
    console.error("Erreur de suppression:", error);
    return { success: false, error: error.message };
  }
}
