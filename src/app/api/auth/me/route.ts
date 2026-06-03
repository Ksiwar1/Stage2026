import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decrypt } from '../../../../lib/session';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    const session = sessionCookie ? await decrypt(sessionCookie) : null;

    if (!session) {
      return NextResponse.json({ loggedIn: false });
    }

    return NextResponse.json({
      loggedIn: true,
      email: session.email,
      role: session.role,
      cardId: session.cardId
    });
  } catch (error) {
    return NextResponse.json({ loggedIn: false, error: 'Failed to retrieve session' }, { status: 500 });
  }
}
