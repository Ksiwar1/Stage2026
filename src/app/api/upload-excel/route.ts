import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { genererArchitectureAction, enrichirCarteAction } from '../../actions/genererCarteAction';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, message: "Aucun fichier reçu." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Lire le fichier Excel
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    // Extraire les données de toutes les feuilles au format CSV
    let excelSummary = "";
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = xlsx.utils.sheet_to_csv(sheet);
      excelSummary += `### Feuille : ${sheetName}\n${csv}\n\n`;
    }

    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    const storeName = fileNameWithoutExt.slice(0, 30);

    // Phase 1: Générer l'architecture intermédiaire
    const promptSujet = `Voici les données extraites d'un fichier Excel de menu :\n\n${excelSummary}`;
    const formData1 = new FormData();
    formData1.append("sujet", promptSujet);
    formData1.append("restaurantName", storeName);
    formData1.append("ai_type", "gemini");
    formData1.append("sourceInspiration", "generique");

    const res1 = await genererArchitectureAction(formData1);
    if (!res1.success || !res1.architectureJson) {
      return NextResponse.json({ 
        success: false, 
        message: `Erreur lors de la génération de l'architecture par l'IA : ${res1.error || 'inconnue'}` 
      }, { status: 500 });
    }

    // Phase 2: Convertir en format ETK360 et sauvegarder
    const formData2 = new FormData();
    formData2.append("sujet", promptSujet);
    formData2.append("restaurantName", storeName);
    formData2.append("sourceInspiration", "generique");
    formData2.append("sauvegarder", "on");

    const finalJsonStr = await enrichirCarteAction(
      formData2, 
      res1.architectureJson, 
      "generique", 
      []
    );
    const finalResult = JSON.parse(finalJsonStr);

    if (!finalResult.success) {
      return NextResponse.json({ 
        success: false, 
        message: `Erreur lors de l'enrichissement et sauvegarde de la carte : ${finalResult.error || 'inconnue'}` 
      }, { status: 500 });
    }

    // Forcer la mise à jour des pages de l'application
    revalidatePath('/importer-cartes');
    revalidatePath('/bibliotheque');
    revalidatePath('/menu');

    return NextResponse.json({ 
      success: true, 
      message: `✅ Fichier Excel "${file.name}" importé, converti et sauvegardé avec succès !` 
    });

  } catch (error: any) {
    console.error("Erreur import Excel:", error);
    return NextResponse.json({ 
      success: false, 
      message: `Erreur système lors du traitement du fichier Excel : ${error.message || 'inconnue'}` 
    }, { status: 500 });
  }
}
