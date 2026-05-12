'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { addLog } from '../../lib/logger';

export async function updateProduitAction(fileName: string, itemId: string, updates: { name: string, price: number, img: string }) {
  try {
    if (!fileName || fileName.includes('..') || fileName.includes('/')) {
       return { success: false, error: "Nom de fichier invalide." };
    }

    const filepath = path.join(process.cwd(), '.softavera', 'carte', fileName);

    if (!fs.existsSync(filepath)) {
      return { success: false, error: "Fichier introuvable sur le disque." };
    }

    const content = fs.readFileSync(filepath, 'utf-8');
    const data = JSON.parse(content);

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

    // Réécrire le fichier
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    // Revalider le cache pour que le changement soit visible sur le Dashboard et le Simulateur
    revalidatePath(`/update-carte/${fileName.replace('.json', '')}`);
    revalidatePath(`/update-carte/${fileName.replace('.json', '')}/produits`);
    revalidatePath(`/borne/${fileName.replace('.json', '')}`);
    revalidatePath(`/historique`);

    addLog(fileName, 'UPDATE', `Modification du produit "${updates.name}" (Prix: ${updates.price}€)`);

    return { success: true, updatedItem: item };

  } catch (error: any) {
    console.error("Erreur de sauvegarde:", error);
    return { success: false, error: error.message };
  }
}
