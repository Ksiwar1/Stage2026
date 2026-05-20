import { NextResponse } from 'next/server';
import { parseETK360Hierarchy } from '../../../lib/softaveraParser';
import { cardService } from '../../../services/cardService';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Le paramètre 'id' est requis (ex: ?id=carte4_bsb_franchise)" }, 
      { status: 400 }
    );
  }

  const cardId = id.endsWith('.json') ? id.replace('.json', '') : id;

  try {
    const card = await cardService.getCardById(cardId);
    if (!card) {
      return NextResponse.json(
        { success: false, error: `Le catalogue ${cardId} est introuvable sur le serveur.` }, 
        { status: 404 }
      );
    }

    const data = card.content;

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
