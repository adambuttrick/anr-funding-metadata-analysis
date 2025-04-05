'use client';

import { useRef, useEffect } from 'react';
import { XMarkIcon, Bars3Icon } from '@heroicons/react/24/outline';

export interface MobileMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export default function MobileMenu({ isOpen, onToggle, children }: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && isOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-menu-toggle]')) {
          onToggle();
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  return (
    <>
      <button
        type="button"
        data-menu-toggle
        onClick={onToggle}
        className="md:hidden ml-auto flex items-center justify-center rounded-lg bg-white px-2 py-1 text-gray-700 shadow-sm border border-gray-500 hover:text-gray-900 hover:border-gray-800 min-h-[30px] min-w-[30px]"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Bars3Icon className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {isOpen && (
        <div 
          ref={menuRef}
          className="md:hidden absolute top-full left-0 right-0 z-50 bg-white shadow-md border-t border-gray-200 p-3"
        >
          <div className="flex flex-col space-y-4">
            {children}
          </div>
        </div>
      )}
    </>
  );
}
