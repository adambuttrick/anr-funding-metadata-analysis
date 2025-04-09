import { useState, useEffect } from 'react';
import { api, Funder } from '@/lib/api';
import { useDateRange } from '@/contexts/DateRangeContext';

export function useFunderData(funderId?: string) {
  const [data, setData] = useState<Funder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { startYear, endYear } = useDateRange();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        if (funderId) {
          const response = await api.getFunderStats(funderId, startYear, endYear);
          setData(response.data);
        } else {
          setData(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch funder data'));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [funderId, startYear, endYear]);

  return { data, loading, error };
}
