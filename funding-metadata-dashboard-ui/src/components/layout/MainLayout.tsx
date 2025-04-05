'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { useDateRange } from '@/contexts/DateRangeContext';

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function MainLayout({
  children,
  className = '',
}: MainLayoutProps) {
  const { startYear, endYear } = useDateRange();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevDateRange, setPrevDateRange] = useState<string | null>(null);
  
  useEffect(() => {
    const currentDateRange = `${startYear}-${endYear}`;
    
    if (prevDateRange && currentDateRange !== prevDateRange) {
      setIsTransitioning(true);
      
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
    
    setPrevDateRange(currentDateRange);
  }, [startYear, endYear, prevDateRange]);

  return (
    <>
      <div className="w-full h-[3.5rem] sm:h-[4rem]" aria-hidden="true" />
      
      <div 
        className={`
          w-full 
          transition-opacity 
          duration-300 
          ${isTransitioning ? 'opacity-95' : 'opacity-100'}
          ${className}
        `}
      >
        {children}
      </div>
    </>
  );
}
