import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { cardService } from '../../../services/cardService';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const nomFichier = searchParams.get('name');

    if (!nomFichier || !nomFichier.endsWith('.json')) {
      return NextResponse.json({ success: false, message: "Format de fichier rejeté." }, { status: 400 });
    }

    // Le miracle : Lecture brute en Streaming, sans passer par les parseurs capricieux de Next.js
    const contenuBrut = await req.text();

    let data;
    try {
      data = JSON.parse(contenuBrut);
    } catch (e) {
      return NextResponse.json({ success: false, message: "Le fichier ne contient pas un JSON valide." }, { status: 400 });
    }

    const storeName = data.title || nomFichier.replace('.json', '');

    // Enregistrement direct dans la base de données PostgreSQL
    await cardService.createCard({
      store_name: storeName,
      content: data
    });

    // On force la mise à jour des pages en cache
    revalidatePath('/importer-cartes');
    revalidatePath('/bibliotheque');
    revalidatePath('/menu');

    return NextResponse.json({ success: true, message: `✅ Fichier "${nomFichier}" importé avec succès dans la base de données !` });

  } catch (error) {
    console.error("Crash API:", error);
    return NextResponse.json({ success: false, message: "Erreur Système Critique" }, { status: 500 });
  }
}
