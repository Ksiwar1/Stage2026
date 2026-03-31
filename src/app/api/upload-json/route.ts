import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const nomFichier = searchParams.get('name');

    if (!nomFichier || !nomFichier.endsWith('.json')) {
      return NextResponse.json({ success: false, message: "Format de fichier rejeté." }, { status: 400 });
    }

    // Le miracle : Lecture brute en Streaming, sans passer par les parseurs capricieux de Next.js
    const contenuBrut = await req.text();

    const directoryPath = path.join(process.cwd(), '.softavera', 'carte');
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    const filePath = path.join(directoryPath, nomFichier);
    fs.writeFileSync(filePath, contenuBrut, 'utf-8');

    // On force la mise à jour des pages en cache
    revalidatePath('/importer-cartes');
    revalidatePath('/bibliotheque');
    revalidatePath('/menu');

    return NextResponse.json({ success: true, message: `✅ Fichier "${nomFichier}" pulvérisé dans la mémoire avec succès !` });

  } catch (error) {
    console.error("Crash API:", error);
    return NextResponse.json({ success: false, message: "Erreur Système Critique" }, { status: 500 });
  }
}
