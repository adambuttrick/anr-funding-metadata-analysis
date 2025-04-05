'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

import { Funder as ApiFunder } from '@/lib/api';

type Funder = ApiFunder;

export interface FunderSelectorProps {
  funders: Funder[];
  selectedFunderId: string | null;
  onFunderChange: (funderId: string) => void;
  className?: string;
}

export default function FunderSelector({ 
  funders, 
  selectedFunderId, 
  onFunderChange,
  className = ''
}: FunderSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedFunder = funders.find(f => f.id === selectedFunderId);

  return (
    <div className={`relative ${className}`} ref={selectorRef}>
      <div className="flex items-center gap-1 sm:gap-2 flex-nowrap">
        <span className="text-xs sm:text-sm font-medium text-gray-500 whitespace-nowrap">Funder:</span>
        <div className="relative w-[140px] sm:w-[180px] md:w-[220px] lg:w-[260px]">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex w-full items-center justify-between rounded-lg bg-white px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-gray-700 shadow-sm transition-colors hover:text-gray-900 border border-gray-500 hover:border-gray-800 min-h-[26px] sm:min-h-[30px]"
          >
            <span className="truncate max-w-[calc(100%-20px)] min-w-[100px] min-h-[18px] block" style={{ minWidth: '100px' }}>
              {selectedFunder?.attributes.name || 'Loading...'}
            </span>
            <ChevronDownIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" aria-hidden="true" />
          </button>
        </div>
      </div>

      {dropdownOpen && (
        <div className="absolute top-full mt-1 right-0 left-0 z-[100] w-full min-w-[180px] sm:min-w-[220px] md:min-w-[280px] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {funders.length === 0 ? (
              <div className="p-3 text-center text-xs sm:text-sm text-gray-500">No funders available</div>
            ) : (
              <ul className="py-1">
                {funders.map((funder) => (
                  <li 
                    key={funder.id}
                    className={`px-4 py-3 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 ${funder.id === selectedFunderId ? 'bg-gray-50' : ''}`}
                    onClick={() => {
                      onFunderChange(funder.id);
                      setDropdownOpen(false);
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{funder.attributes.name}</div>
                      {funder.id === selectedFunderId && (
                        <span className="text-xs bg-gray-200 text-black px-2 py-0.5 rounded-full">Selected</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {funder.relationships?.publishers?.length?.toLocaleString() || 0} publishers
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
