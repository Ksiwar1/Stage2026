import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ success: false, message: "URL manquante." }, { status: 400 });

    const response = await fetch(url);
    if (!response.ok) return NextResponse.json({ success: false, message: "URL distante inaccessible." }, { status: 400 });

    // Forcer le parse pour s'assurer que l'URL cible bien du JSON formatté
    const jsonContent = await response.json(); 
    
    // Extraire un nom de l'URL
    const urlParts = url.split('/');
    let nomFichier = urlParts[urlParts.length - 1];
    
    // S'il n'y a pas d'extension, on ajoute un horodatage pour ne pas tout écraser
    if (!nomFichier.includes('.')) nomFichier += `_${Date.now()}.json`;
    if (!nomFichier.endsWith('.json')) nomFichier += '.json';
    
    const safeName = nomFichier.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();

    const importDir = path.join(process.cwd(), '.softavera', 'carte');
    if (!fs.existsSync(importDir)) fs.mkdirSync(importDir, { recursive: true });

    const targetPath = path.join(importDir, safeName);
    fs.writeFileSync(targetPath, JSON.stringify(jsonContent, null, 2), 'utf8');

    return NextResponse.json({ success: true, message: `✅ Carte distante importée (${safeName})` });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Échec du Parse/Fetch URL distante JSON: " + error.message }, { status: 500 });
  }
}
