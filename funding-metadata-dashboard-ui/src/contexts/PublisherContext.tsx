'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Publisher } from '@/lib/api';

interface PublisherContextType {
  selectedPublisher: Publisher | null;
  setSelectedPublisher: (publisher: Publisher | null) => void;
}

const PublisherContext = createContext<PublisherContextType | undefined>(undefined);

export function PublisherProvider({ children }: { children: ReactNode }) {
  const [selectedPublisher, setSelectedPublisher] = useState<Publisher | null>(null);

  return (
    <PublisherContext.Provider value={{ selectedPublisher, setSelectedPublisher }}>
      {children}
    </PublisherContext.Provider>
  );
}

export function usePublisher() {
  const context = useContext(PublisherContext);
  if (context === undefined) {
    throw new Error('usePublisher must be used within a PublisherProvider');
  }
  return context;
}
