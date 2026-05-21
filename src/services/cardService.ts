import prisma from '../lib/db';

export const cardService = {
  /**
   * Récupérer toutes les cartes
   */
  async getAllCards() {
    return await prisma.$queryRaw<any[]>`SELECT * FROM "PFE"."carte" ORDER BY created_at DESC`;
  },

  /**
   * Récupérer une carte par ID
   */
  async getCardById(id: string) {
    const cards = await prisma.$queryRaw<any[]>`SELECT * FROM "PFE"."carte" WHERE id = ${id}`;
    return cards[0] || null;
  },

  /**
   * Créer une nouvelle carte
   */
  async createCard(data: { store_name: string; content: any }) {
    const jsonContent = JSON.stringify(data.content);
    const result = await prisma.$queryRaw<any[]>`
      INSERT INTO "PFE"."carte" (id, store_name, content, created_at, updated_at)
      VALUES (gen_random_uuid(), ${data.store_name}, ${jsonContent}::jsonb, NOW(), NOW())
      RETURNING *;
    `;
    if (result && result.length > 0) {
      await cardService.saveHistory(result[0].id, result[0].content, 'CREATE', 'Création initiale de la carte.');
      return result[0];
    }
    return null;
  },

  /**
   * Sauvegarder l'historique d'une carte
   */
  async saveHistory(id_carte: string, content: any, action: string = 'UPDATE', details: string = 'Modification enregistrée en base de données.') {
    const jsonContent = JSON.stringify(content);
    await prisma.$queryRaw<any[]>`
      INSERT INTO "PFE"."historique" (id_carte, cart, date_modification, action, details)
      VALUES (${id_carte}, ${jsonContent}::jsonb, NOW(), ${action}, ${details})
    `;
  },

  /**
   * Mettre à jour une carte
   */
  async updateCard(id: string, data: { store_name?: string; content?: any }, action: string = 'UPDATE', details: string = 'Modification enregistrée en base de données.') {
    let result: any[] = [];
    if (data.store_name !== undefined && data.content !== undefined) {
      const jsonContent = JSON.stringify(data.content);
      result = await prisma.$queryRaw<any[]>`
        UPDATE "PFE"."carte"
        SET store_name = ${data.store_name}, content = ${jsonContent}::jsonb, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *;
      `;
    } else if (data.store_name !== undefined) {
      result = await prisma.$queryRaw<any[]>`
        UPDATE "PFE"."carte"
        SET store_name = ${data.store_name}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *;
      `;
    } else if (data.content !== undefined) {
      const jsonContent = JSON.stringify(data.content);
      result = await prisma.$queryRaw<any[]>`
        UPDATE "PFE"."carte"
        SET content = ${jsonContent}::jsonb, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *;
      `;
    }

    if (result && result.length > 0) {
      // Sauvegarde dans l'historique à chaque modification réussie
      await cardService.saveHistory(id, result[0].content, action, details);
      return result[0];
    }
    return null;
  },

  /**
   * Récupérer l'historique d'une carte spécifique
   */
  async getCardHistory(id_carte: string, limit: number = 5) {
    // Cast limit to integer explicitely to avoid Prisma conversion issues
    const limitNum = Number(limit);
    return await prisma.$queryRaw<any[]>`
      SELECT * FROM "PFE"."historique"
      WHERE id_carte = ${id_carte}
      ORDER BY date_modification DESC
      LIMIT ${limitNum}
    `;
  },

  /**
   * Supprimer une carte
   */
  async deleteCard(id: string) {
    const result = await prisma.$queryRaw<any[]>`
      DELETE FROM "PFE"."carte"
      WHERE id = ${id}
      RETURNING *;
    `;
    return result[0];
  },
};
