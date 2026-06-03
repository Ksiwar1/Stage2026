import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/session';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // 1. Ignorer les requêtes d'API internes et les ressources statiques
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api/') ||
    path === '/favicon.ico' ||
    path.includes('.')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('session')?.value;
  const session = sessionCookie ? await decrypt(sessionCookie) : null;

  // 2. Si l'utilisateur n'est pas connecté
  if (!session) {
    // Rediriger vers /login s'il tente d'accéder à une page protégée
    if (path !== '/login' && path !== '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // 3. Si l'utilisateur est déjà connecté et tente d'accéder à /login ou à l'accueil /
  if (path === '/login' || path === '/') {
    if (session.role === 'CLIENT') {
      return NextResponse.redirect(new URL(`/update-carte/${session.cardId}`, request.url));
    }
    return NextResponse.redirect(new URL('/menu', request.url));
  }

  // 4. Contrôle d'accès restrictif pour le rôle CLIENT
  if (session.role === 'CLIENT') {
    const cardId = session.cardId;

    if (!cardId) {
      // Déconnecter si le compte client est invalide (pas de carte associée)
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      return response;
    }

    // Le client peut accéder UNIQUEMENT à l'éditeur et au simulateur de sa propre carte
    const isEditingOwnCard = path.startsWith(`/update-carte/${cardId}`);
    const isSimulatingOwnCard = path.startsWith(`/borne/${cardId}`);

    if (!isEditingOwnCard && !isSimulatingOwnCard) {
      // Bloquer et rediriger vers son espace d'édition dédié
      return NextResponse.redirect(new URL(`/update-carte/${cardId}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/menu/:path*',
    '/generer-carte/:path*',
    '/bibliotheque/:path*',
    '/importer-cartes/:path*',
    '/parametres/:path*',
    '/update-carte/:path*',
    '/borne/:path*'
  ]
};
