import { type Persister } from '@tanstack/query-persist-client-core';
import { db } from './momentum-db';

export const createDexiePersister = (): Persister => {
  const CACHE_KEY = 'react-query-cache';

  return {
    persistClient: async (client) => {
      try {
        await db.table('queryCache').put({
          id: CACHE_KEY,
          data: client,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('[QueryPersister] Failed to persist cache:', error);
      }
    },

    restoreClient: async () => {
      try {
        const cached = await db.table('queryCache').get(CACHE_KEY);
        return cached?.data || null;
      } catch (error) {
        console.error('[QueryPersister] Failed to restore cache:', error);
        return null;
      }
    },

    removeClient: async () => {
      try {
        await db.table('queryCache').delete(CACHE_KEY);
      } catch (error) {
        console.error('[QueryPersister] Failed to remove cache:', error);
      }
    }
  };
};