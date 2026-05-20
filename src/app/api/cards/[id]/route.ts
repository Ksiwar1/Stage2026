import { NextRequest } from 'next/server';
import { cardController } from '../../../../controllers/cardController';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return cardController.getOne(req, { params });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return cardController.update(req, { params });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return cardController.delete(req, { params });
}
