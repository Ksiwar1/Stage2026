import { NextResponse } from 'next/server';
import { settingsService } from '../../../services/settingsService';

export async function GET() {
  try {
    const settings = await settingsService.getGlobalSettings();
    if (settings) {
      return NextResponse.json(settings);
    }
    return NextResponse.json({
      overrideLanguages: [],
      overridePrimaryColor: "",
      overrideSecondaryColor: "",
      siteMenuOrder: ['generer', 'bibliotheque', 'importer', 'update', 'historique', 'parametres']
    });
  } catch (error) {
    console.error('API /api/settings GET error:', error);
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const success = await settingsService.updateGlobalSettings(body);
    if (success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  } catch (error) {
    console.error('API /api/settings POST error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
