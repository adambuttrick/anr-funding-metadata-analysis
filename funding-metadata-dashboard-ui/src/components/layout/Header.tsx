'use client';

import { useState, useEffect } from 'react';
import useHeaderData from '../header/useHeaderData';
import HeaderControls from '../header/HeaderControls';
import MobileMenu from '../header/MobileMenu';

export const HEADER_HEIGHT = {
  default: '3.5rem',
  sm: '4rem'
};

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  
  const { 
    funders,
    selectedFunder,
    handleFunderChange,
    availableYears,
    startYear,
    endYear,
    handleStartYearChange,
    handleEndYearChange
  } = useHeaderData();
  
  // Apply Z-index fix for header
  useEffect(() => {
    const timer = setTimeout(() => {
      const headerElement = document.querySelector('header');
      if (headerElement) {
        headerElement.style.transform = 'translateZ(0)';
      }
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  return (
    <header className="fixed left-0 right-0 top-0 z-40 bg-white shadow-sm h-[3.5rem] sm:h-[4rem] w-full" style={{ width: '100vw', transform: 'translateZ(0)', willChange: 'transform' }}>
      <div className="mx-auto flex max-w-screen-2xl flex-row px-2 py-2 sm:px-3 sm:py-3 md:px-4 xl:px-6 h-[3.5rem] sm:h-[4rem] items-center justify-between" style={{ width: '100%', maxWidth: 'calc(100vw - 1px)', transform: 'translateZ(0)', overflow: 'visible' }}>
        <div className="flex flex-row items-center space-x-2 sm:space-x-3 md:space-x-4 w-full" style={{ minWidth: 0 }}>
          <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold tracking-tight text-black truncate shrink-1" style={{ minWidth: 0 }}>
            Funding Metadata Dashboard
          </h1>
          
          {/* Desktop controls */}
          <HeaderControls 
            funders={funders}
            selectedFunderId={selectedFunder}
            onFunderChange={handleFunderChange}
            startYear={startYear}
            endYear={endYear}
            availableYears={availableYears}
            onStartYearChange={handleStartYearChange}
            onEndYearChange={handleEndYearChange}
          />

          {/* Mobile menu toggle button */}
          <MobileMenu isOpen={menuOpen} onToggle={toggleMenu}>
            <HeaderControls 
              funders={funders}
              selectedFunderId={selectedFunder}
              onFunderChange={handleFunderChange}
              startYear={startYear}
              endYear={endYear}
              availableYears={availableYears}
              onStartYearChange={handleStartYearChange}
              onEndYearChange={handleEndYearChange}
              isMobile={true}
            />
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
