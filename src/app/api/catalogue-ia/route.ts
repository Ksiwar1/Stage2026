import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseETK360Hierarchy } from '../../../lib/softaveraParser';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Le paramètre 'id' est requis (ex: ?id=carte4_bsb_franchise)" }, 
      { status: 400 }
    );
  }

  const fileName = id.endsWith('.json') ? id : `${id}.json`;
  const filePath = path.join(process.cwd(), '.softavera', 'carte', fileName);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { success: false, error: `Le catalogue ${fileName} est introuvable sur le serveur.` }, 
      { status: 404 }
    );
  }

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Extraction 100% Séquentielle via le Parseur Arborescent
    const tree = parseETK360Hierarchy(data);

    return NextResponse.json({
      success: true,
      catalogueId: id,
      totalCategories: tree.length,
      data: tree
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erreur serveur lors de la lecture ou conversion du JSON ETK360.", message: error.message }, 
      { status: 500 }
    );
  }
}
