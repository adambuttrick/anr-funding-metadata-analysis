'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DateRangeContextType {
  startYear: number;
  endYear: number;
  setStartYear: (year: number) => void;
  setEndYear: (year: number) => void;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const currentYear = new Date().getFullYear();
  const [startYear, setStartYear] = useState<number>(currentYear - 5);
  const [endYear, setEndYear] = useState<number>(currentYear);

  return (
    <DateRangeContext.Provider value={{ startYear, endYear, setStartYear, setEndYear }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (context === undefined) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
}
