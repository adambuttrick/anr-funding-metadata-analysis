'use client';

import React, { ReactNode, useState, useLayoutEffect, useRef, useEffect } from 'react';
// import { CARD_BACKGROUND } from '@/constants/colors';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
  minHeight?: string;
  preserveHeight?: boolean;
}

export default function Container({
  children,
  className = '',
  isLoading = false,
  minHeight = '16rem',
  preserveHeight = true,
}: ContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<string | null>(null);
  const [prevLoading, setPrevLoading] = useState(isLoading);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useLayoutEffect(() => {
    if (preserveHeight && containerRef.current && !height) {
      const currentHeight = containerRef.current.offsetHeight;
      if (currentHeight > 0) {
        setHeight(`${currentHeight}px`);
      }
    }
  }, [preserveHeight, children, height]);

  useEffect(() => {
    if (prevLoading !== isLoading) {
      setIsTransitioning(true);
      
      const timer = setTimeout(() => {
        setPrevLoading(isLoading);
        
        const transitionTimer = setTimeout(() => {
          setIsTransitioning(false);
        }, 500);
        
        return () => clearTimeout(transitionTimer);
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, prevLoading]);

  const transitionClasses = 'transition-opacity duration-500 ease-in-out';
  
  const opacityClasses = isTransitioning 
    ? (isLoading ? 'opacity-70' : 'opacity-100') 
    : (isLoading ? 'opacity-70' : 'opacity-100');
  
  const baseStyles = `
    rounded-lg
    transition-all
    duration-500
    ease-in-out
    overflow-hidden
    ${transitionClasses}
    ${opacityClasses}
    ${isLoading ? 'animate-pulse bg-gray-100' : ''}
  `;

  return (
    <div 
      ref={containerRef}
      className={`${baseStyles} ${className}`}
      style={{
        minHeight: preserveHeight && height ? height : minHeight,
        transition: 'min-height 500ms ease-in-out, opacity 500ms ease-in-out'
      }}
    >
      {children}
    </div>
  );
}
