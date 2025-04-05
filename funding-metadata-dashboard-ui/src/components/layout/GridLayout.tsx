'use client';

import React, { ReactNode } from 'react';

interface GridLayoutProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function GridLayout({
  children,
  columns = 3,
  gap = 'md',
  className = '',
}: GridLayoutProps) {
  const gapSizes = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const gridColumns = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div 
      className={`
        grid 
        ${gridColumns[columns]} 
        ${gapSizes[gap]} 
        w-full 
        transition-all 
        duration-300 
        ${className}
      `}
    >
      {children}
    </div>
  );
}
