'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { userService } from '../../services/userService';
import { encrypt } from '../../lib/session';
import prisma from '../../lib/db';

export type ActionResponse = {
  success: boolean;
  error?: string;
};

/**
 * Action serveur de connexion
 */
export async function loginAction(formData: FormData): Promise<ActionResponse> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Veuillez saisir votre e-mail et votre mot de passe.' };
  }

  // 1. Rechercher l'utilisateur par e-mail
  let user = await userService.getUserByEmail(email);
  
  if (!user) {
    // Si l'utilisateur n'est pas trouvé, vérifier si l'identifiant est un nom de restaurant
    const storeNameQuery = email.includes('@') ? email.split('@')[0] : email;
    const normalizedInput = storeNameQuery.toLowerCase().replace(/[^a-z0-9]/g, '');
    try {
      const cards = await prisma.$queryRaw<any[]>`
        SELECT id, store_name FROM "PFE"."carte" 
        WHERE LOWER(REGEXP_REPLACE(store_name, '[^a-zA-Z0-9]', '', 'g')) = ${normalizedInput} 
        LIMIT 1
      `;
      if (cards && cards.length > 0) {
        const card = cards[0];
        // Vérifier s'il y a déjà un utilisateur pour cette carte
        const usersForCard = await prisma.$queryRaw<any[]>`
          SELECT * FROM "PFE"."utilisateur" WHERE card_id = ${card.id} LIMIT 1
        `;
        if (usersForCard && usersForCard.length > 0) {
          user = usersForCard[0];
        } else {
          // Créer automatiquement un utilisateur client pour cette carte
          user = await userService.createUser(
            email, // nom du restaurant ou e-mail saisi
            'ClientPass123!',
            'CLIENT',
            card.id
          );
        }
      }
    } catch (e) {
      console.error('Error during fallback restaurant name authentication:', e);
    }
  }

  if (!user) {
    return { success: false, error: 'Identifiants de connexion incorrects.' };
  }

  // 2. Valider le mot de passe
  const isValid = userService.verifyPassword(password, user.password);
  if (!isValid) {
    return { success: false, error: 'Identifiants de connexion incorrects.' };
  }

  // 3. Générer le jeton de session
  const sessionData = {
    userId: user.id,
    email: user.email,
    role: user.role,
    cardId: user.card_id
  };
  const token = await encrypt(sessionData);

  // 4. Définir le cookie HTTP-only
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // Expiration dans 1 jour (86400 secondes)
    maxAge: 60 * 60 * 24
  });

  // 5. Redirection selon le rôle
  if (user.role === 'CLIENT') {
    if (user.card_id) {
      redirect(`/update-carte/${user.card_id}`);
    } else {
      return { success: false, error: 'Aucune carte de restaurant n\'est liée à ce compte. Veuillez contacter Softavera.' };
    }
  } else {
    redirect('/menu');
  }

  return { success: true };
}

/**
 * Action serveur de déconnexion
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  redirect('/login');
}
