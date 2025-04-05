'use client';

import { SWRConfig } from 'swr';
import { PublisherProvider } from '@/contexts/PublisherContext';
import { DateRangeProvider } from '@/contexts/DateRangeContext';
import { FunderProvider } from '@/contexts/FunderContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => fetch(url).then((res) => res.json()),
        revalidateOnFocus: false,
      }}
    >
      <FunderProvider>
        <DateRangeProvider>
          <PublisherProvider>
            {children}
          </PublisherProvider>
        </DateRangeProvider>
      </FunderProvider>
    </SWRConfig>
  );
}
