import { useSearchParams } from 'react-router-dom';
import { useMemo, useCallback } from 'react';

export type TimeWindow = 'all' | 'morning' | 'afternoon' | 'evening';

export interface UrlFilters {
  date: string;
  status?: string;
  window: TimeWindow;
}

export const useUrlFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo((): UrlFilters => {
    const today = new Date().toISOString().split('T')[0];
    const date = searchParams.get('date') || today;
    const status = searchParams.get('status') || undefined;
    const window = (searchParams.get('window') || 'all') as TimeWindow;

    return { date, status, window };
  }, [searchParams]);

  const setFilters = useCallback(
    (updates: Partial<UrlFilters>) => {
      const newParams = new URLSearchParams(searchParams);

      if (updates.date !== undefined) {
        newParams.set('date', updates.date);
      }

      if (updates.status !== undefined) {
        if (updates.status === '') {
          newParams.delete('status');
        } else {
          newParams.set('status', updates.status);
        }
      }

      if (updates.window !== undefined) {
        if (updates.window === 'all') {
          newParams.delete('window');
        } else {
          newParams.set('window', updates.window);
        }
      }

      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  return { filters, setFilters };
};
