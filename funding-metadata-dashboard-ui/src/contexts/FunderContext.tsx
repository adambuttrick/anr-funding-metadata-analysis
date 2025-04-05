'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Funder } from '@/lib/api';

interface FunderContextType {
  selectedFunder: string;
  setSelectedFunder: (funderId: string) => void;
  funderData: Funder | null;
  setFunderData: (funder: Funder | null) => void;
  hasSelectedFunder: boolean;
  showFunderSelectionModal: boolean;
  setShowFunderSelectionModal: (show: boolean) => void;
}

const FunderContext = createContext<FunderContextType | undefined>(undefined);

export function FunderProvider({ children }: { children: ReactNode }) {
  const [selectedFunder, setSelectedFunder] = useState<string>('');
  const [funderData, setFunderData] = useState<Funder | null>(null);
  const [showFunderSelectionModal, setShowFunderSelectionModal] = useState<boolean>(true);
  
  const hasSelectedFunder = selectedFunder !== '';

  return (
    <FunderContext.Provider value={{
      selectedFunder,
      setSelectedFunder,
      funderData,
      setFunderData,
      hasSelectedFunder,
      showFunderSelectionModal,
      setShowFunderSelectionModal
    }}>
      {children}
    </FunderContext.Provider>
  );
}

export function useFunder() {
  const context = useContext(FunderContext);
  if (context === undefined) {
    throw new Error('useFunder must be used within a FunderProvider');
  }
  return context;
}
