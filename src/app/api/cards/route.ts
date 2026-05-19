import { NextRequest } from 'next/server';
import { cardController } from '../../../controllers/cardController';

export async function GET(req: NextRequest) {
  return cardController.getAll(req);
}

export async function POST(req: NextRequest) {
  return cardController.create(req);
}
