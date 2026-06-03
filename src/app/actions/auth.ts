'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { userService } from '../../services/userService';
import { encrypt } from '../../lib/session';

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

  // 1. Rechercher l'utilisateur
  const user = await userService.getUserByEmail(email);
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
