import { NextRequest, NextResponse } from 'next/server';
import { cardService } from '../services/cardService';

export const cardController = {
  /**
   * GET /api/cards
   */
  async getAll(req: NextRequest) {
    try {
      const cards = await cardService.getAllCards();
      return NextResponse.json(cards, { status: 200 });
    } catch (error) {
      console.error('Erreur getAllCards:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des cartes' }, { status: 500 });
    }
  },

  /**
   * GET /api/cards/:id
   */
  async getOne(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await params;
      const card = await cardService.getCardById(id);
      if (!card) {
        return NextResponse.json({ error: 'Carte non trouvée' }, { status: 404 });
      }
      return NextResponse.json(card, { status: 200 });
    } catch (error) {
      console.error('Erreur getCardById:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération de la carte' }, { status: 500 });
    }
  },

  /**
   * POST /api/cards
   */
  async create(req: NextRequest) {
    try {
      const body = await req.json();
      
      if (!body.store_name || !body.content) {
        return NextResponse.json({ error: 'store_name et content sont requis' }, { status: 400 });
      }

      const newCard = await cardService.createCard({
        store_name: body.store_name,
        content: body.content,
      });

      return NextResponse.json(newCard, { status: 201 });
    } catch (error) {
      console.error('Erreur createCard:', error);
      return NextResponse.json({ error: 'Erreur lors de la création de la carte' }, { status: 500 });
    }
  },

  /**
   * PUT /api/cards/:id
   */
  async update(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await params;
      const body = await req.json();

      // Vérifier si la carte existe avant de l'update
      const existing = await cardService.getCardById(id);
      if (!existing) {
        return NextResponse.json({ error: 'Carte non trouvée' }, { status: 404 });
      }

      const updatedCard = await cardService.updateCard(id, {
        store_name: body.store_name,
        content: body.content,
      });

      return NextResponse.json(updatedCard, { status: 200 });
    } catch (error) {
      console.error('Erreur updateCard:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour de la carte' }, { status: 500 });
    }
  },

  /**
   * DELETE /api/cards/:id
   */
  async delete(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await params;
      const existing = await cardService.getCardById(id);
      if (!existing) {
        return NextResponse.json({ error: 'Carte non trouvée' }, { status: 404 });
      }

      await cardService.deleteCard(id);
      return NextResponse.json({ message: 'Carte supprimée avec succès' }, { status: 200 });
    } catch (error) {
      console.error('Erreur deleteCard:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression de la carte' }, { status: 500 });
    }
  },
};
