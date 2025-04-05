'use client';

import React, { ReactNode, useState, useEffect, useRef } from 'react';
import Container from './Container';

interface CardContainerProps {
  children: ReactNode;
  title?: string;
  isLoading?: boolean;
  minHeight?: string;
  className?: string;
  titleClassName?: string;
  preserveHeight?: boolean;
}

export default function CardContainer({
  children,
  title,
  isLoading = false,
  minHeight = '16rem',
  className = '',
  titleClassName = '',
  preserveHeight = true,
}: CardContainerProps) {
  const prevChildrenRef = useRef<ReactNode>(null);
  const prevTitleRef = useRef<string | undefined>(undefined);
  const [contentVisible, setContentVisible] = useState(!isLoading);

  useEffect(() => {
    if (!isLoading) {
      prevChildrenRef.current = children;
      prevTitleRef.current = title;
    }
  }, [children, title, isLoading]);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setContentVisible(false);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setContentVisible(true);
    }
  }, [isLoading]);

  const cardStyles = `
    bg-white
    border
    border-gray-200
    shadow-sm
    p-6
    ${className}
  `;

  const renderContent = () => {
    if (!isLoading) {
      return (
        <div className="transition-opacity duration-500 ease-in-out opacity-100">
          {title && <h2 className={`text-2xl font-bold mb-4 ${titleClassName}`}>{title}</h2>}
          {children}
        </div>
      );
    }
    
    if (prevChildrenRef.current) {
      return (
        <div className="relative transition-opacity duration-500 ease-in-out">
          <div className="absolute inset-0 bg-white bg-opacity-60 z-10"></div>
          
          <div className={`opacity-70 transition-opacity duration-500 ease-in-out ${contentVisible ? 'opacity-70' : 'opacity-40'}`}>
            {prevTitleRef.current && <h2 className={`text-2xl font-bold mb-4 ${titleClassName}`}>{prevTitleRef.current}</h2>}
            {prevChildrenRef.current}
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <Container
      isLoading={isLoading}
      minHeight={minHeight}
      preserveHeight={preserveHeight}
      className={cardStyles}
    >
      {renderContent()}
    </Container>
  );
}
