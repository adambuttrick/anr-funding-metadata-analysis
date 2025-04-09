import { useState, useEffect } from 'react';
import { api, Publisher } from '@/lib/api';

export function usePublisherData(publisherId: string) {
  const [data, setData] = useState<Publisher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await api.getPublisherStats(publisherId);
        setData(response.data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch publisher data'));
      } finally {
        setLoading(false);
      }
    }

    if (publisherId) {
      fetchData();
    }
  }, [publisherId]);

  return { data, loading, error };
}
