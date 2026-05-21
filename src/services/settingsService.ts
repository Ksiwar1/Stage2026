import prisma from '../lib/db';

export const settingsService = {
  getGlobalSettings: async () => {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT settings FROM "PFE"."site_settings" WHERE id = 'global' LIMIT 1
      `;
      if (result && result.length > 0) {
        return result[0].settings;
      }
      return null;
    } catch (error) {
      console.error('Error fetching global settings:', error);
      return null;
    }
  },

  updateGlobalSettings: async (settings: any) => {
    try {
      const settingsJson = JSON.stringify(settings);
      await prisma.$queryRaw`
        INSERT INTO "PFE"."site_settings" (id, settings, updated_at)
        VALUES ('global', ${settingsJson}::jsonb, NOW())
        ON CONFLICT (id) 
        DO UPDATE SET settings = ${settingsJson}::jsonb, updated_at = NOW()
      `;
      return true;
    } catch (error) {
      console.error('Error updating global settings:', error);
      return false;
    }
  }
};
