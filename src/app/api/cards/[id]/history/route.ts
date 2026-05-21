import { NextResponse } from 'next/server';
import { cardService } from '../../../../../services/cardService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const history = await cardService.getCardHistory(id, 5);
    return NextResponse.json(history, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching card history:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'historique', details: error.message },
      { status: 500 }
    );
  }
}
