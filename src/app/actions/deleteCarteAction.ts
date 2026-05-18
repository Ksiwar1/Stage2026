'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { addLog } from '../../lib/logger';

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
      revalidatePath('/historique');

      // Supprimer l'historique de cette carte dans logs.json pour qu'elle disparaisse complètement
      const logFilePath = path.join(process.cwd(), '.softavera', 'logs.json');
      if (fs.existsSync(logFilePath)) {
         try {
             let logs = JSON.parse(fs.readFileSync(logFilePath, 'utf-8'));
             const originalLength = logs.length;
             logs = logs.filter((log: any) => log.nomFichier !== fileName);
             if (logs.length !== originalLength) {
                 fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
             }
         } catch (e) {
             console.error("Erreur lors de la purge des logs:", e);
         }
      }

      return { success: true };
    } else {
      return { success: false, error: "Fichier introuvable sur le disque." };
    }
  } catch (error: any) {
    console.error("Erreur de suppression:", error);
    return { success: false, error: error.message };
  }
}
