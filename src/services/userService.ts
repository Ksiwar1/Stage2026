import prisma from '../lib/db';
import crypto from 'crypto';

export const userService = {
  /**
   * Hacher un mot de passe en utilisant PBKDF2
   */
  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  },

  /**
   * Vérifier si un mot de passe correspond au hachage stocké
   */
  verifyPassword(password: string, stored: string): boolean {
    const parts = stored.split(':');
    if (parts.length !== 2) return false;
    const [salt, hash] = parts;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  },

  /**
   * Récupérer un utilisateur par son adresse e-mail
   */
  async getUserByEmail(email: string) {
    try {
      const users = await prisma.$queryRaw<any[]>`
        SELECT * FROM "PFE"."utilisateur" WHERE email = ${email}
      `;
      return users[0] || null;
    } catch (e) {
      console.error('Error fetching user by email:', e);
      return null;
    }
  },

  /**
   * Récupérer un utilisateur par son identifiant unique (UUID)
   */
  async getUserById(id: string) {
    try {
      const users = await prisma.$queryRaw<any[]>`
        SELECT * FROM "PFE"."utilisateur" WHERE id = ${id}::uuid
      `;
      return users[0] || null;
    } catch (e) {
      console.error('Error fetching user by id:', e);
      return null;
    }
  },

  /**
   * Créer un nouvel utilisateur
   */
  async createUser(email: string, passwordPlain: string, role: string = 'CLIENT', cardId: string | null = null) {
    try {
      const hashedPassword = this.hashPassword(passwordPlain);
      const cardUuid = cardId ? cardId : null;
      
      const result = await prisma.$queryRaw<any[]>`
        INSERT INTO "PFE"."utilisateur" (email, password, role, card_id)
        VALUES (${email}, ${hashedPassword}, ${role}, ${cardUuid})
        RETURNING *;
      `;
      return result[0] || null;
    } catch (e) {
      console.error('Error creating user:', e);
      return null;
    }
  }
};
