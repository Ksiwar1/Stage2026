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
    return result[0];
  },

  /**
   * Mettre à jour une carte
   */
  async updateCard(id: string, data: { store_name?: string; content?: any }) {
    if (data.store_name !== undefined && data.content !== undefined) {
      const jsonContent = JSON.stringify(data.content);
      const result = await prisma.$queryRaw<any[]>`
        UPDATE "PFE"."carte"
        SET store_name = ${data.store_name}, content = ${jsonContent}::jsonb, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *;
      `;
      return result[0];
    } else if (data.store_name !== undefined) {
      const result = await prisma.$queryRaw<any[]>`
        UPDATE "PFE"."carte"
        SET store_name = ${data.store_name}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *;
      `;
      return result[0];
    } else if (data.content !== undefined) {
      const jsonContent = JSON.stringify(data.content);
      const result = await prisma.$queryRaw<any[]>`
        UPDATE "PFE"."carte"
        SET content = ${jsonContent}::jsonb, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *;
      `;
      return result[0];
    }
    return null;
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
