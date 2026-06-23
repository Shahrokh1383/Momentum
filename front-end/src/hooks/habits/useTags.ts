import { useQuery } from '@tanstack/react-query';
import { tagService } from '@/services/user/tagService';
import { useState, useEffect } from 'react';

export const useTags = () => {
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: tagService.getAll,
  });

  return { tags, isLoading };
};

// Custom hook for debounced autocomplete
export const useTagAutocomplete = (query: string) => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['tags', 'autocomplete', debouncedQuery],
    queryFn: () => tagService.autocomplete(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 1000 * 60,
  });

  return { suggestions, isLoading };
};