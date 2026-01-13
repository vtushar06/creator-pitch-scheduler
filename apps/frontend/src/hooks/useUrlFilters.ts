import { useSearchParams } from 'react-router-dom';
import { useMemo, useCallback } from 'react';

export type TimeWindow = 'all' | 'morning' | 'afternoon' | 'evening';
export type SortOption = 'earliest' | 'latest';

export interface UrlFilters {
  date: string;
  status?: string;
  window: TimeWindow;
  sort: SortOption;
  page: number;
}

export const useUrlFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo((): UrlFilters => {
    const today = new Date().toISOString().split('T')[0];
    const date = searchParams.get('date') || today;
    const status = searchParams.get('status') || undefined;
    const window = (searchParams.get('window') || 'all') as TimeWindow;
    const sort = (searchParams.get('sort') || 'earliest') as SortOption;
    const page = parseInt(searchParams.get('page') || '1', 10);

    return { date, status, window, sort, page };
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

      if (updates.sort !== undefined) {
        if (updates.sort === 'earliest') {
          newParams.delete('sort');
        } else {
          newParams.set('sort', updates.sort);
        }
      }

      if (updates.page !== undefined) {
        if (updates.page === 1) {
          newParams.delete('page');
        } else {
          newParams.set('page', updates.page.toString());
        }
      }

      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  return { filters, setFilters };
};
