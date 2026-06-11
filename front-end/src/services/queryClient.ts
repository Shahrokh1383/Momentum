import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/query-persist-client-core';
import { createDexiePersister } from '@/db/queryPersister';

const createQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        // Cache data for 5 minutes for offline reading
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      },
    },
  });

  // Persist cache to IndexedDB via Dexie
  persistQueryClient({
    queryClient,
    persister: createDexiePersister(),
    // Only persist successful queries
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        return query.state.status === 'success';
      },
    },
  });

  return queryClient;
};

export const queryClient = createQueryClient();