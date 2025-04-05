'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export interface YearRangeSelectorProps {
  startYear: number;
  endYear: number;
  availableYears: number[];
  onStartYearChange: (year: number) => void;
  onEndYearChange: (year: number) => void;
}

export default function YearRangeSelector({ 
  startYear, 
  endYear, 
  availableYears, 
  onStartYearChange, 
  onEndYearChange 
}: YearRangeSelectorProps) {
  // Filter years for end year dropdown (must be greater than start year)
  const endYearOptions = availableYears.filter(year => year > startYear).sort((a, b) => a - b);
  
  // Filter years for start year dropdown (must be less than end year)
  const startYearOptions = availableYears.filter(year => year < endYear).sort((a, b) => a - b);
  
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const startRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (startRef.current && !startRef.current.contains(event.target as Node)) {
        setStartOpen(false);
      }
      if (endRef.current && !endRef.current.contains(event.target as Node)) {
        setEndOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className="flex flex-nowrap items-center gap-1 sm:gap-2">
      <span className="text-xs sm:text-sm font-medium text-gray-500 whitespace-nowrap">Year Range:</span>
      {/* Start year dropdown */}
      <div className="relative" ref={startRef}>
        <button
          type="button"
          onClick={() => setStartOpen(!startOpen)}
          className="flex items-center justify-between rounded-lg bg-white px-1 sm:px-2 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-gray-700 shadow-sm transition-colors hover:text-gray-900 border border-gray-500 hover:border-gray-800 w-[60px] sm:w-[70px]"
        >
          <span className="text-center">{startYear}</span>
          <ChevronDownIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" aria-hidden="true" />
        </button>

        {startOpen && (
          <div className="absolute top-full mt-1 right-0 left-0 z-[100] w-full min-w-[60px] sm:min-w-[70px] bg-white rounded-lg shadow-lg border border-gray-200">
            <ul className="py-1 max-h-[200px] overflow-y-auto">
              {startYearOptions.map(year => (
                <li 
                  key={year}
                  className={`px-2 py-1.5 sm:py-2 hover:bg-gray-100 cursor-pointer text-xs sm:text-sm text-center ${year === startYear ? 'bg-gray-50 text-black font-medium' : ''}`}
                  onClick={() => {
                    onStartYearChange(year);
                    setStartOpen(false);
                  }}
                >
                  {year}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <span className="text-gray-400 mx-0.5 sm:mx-1">—</span>
      
      {/* End year dropdown */}
      <div className="relative" ref={endRef}>
        <button
          type="button"
          onClick={() => setEndOpen(!endOpen)}
          className="flex items-center justify-between rounded-lg bg-white px-1 sm:px-2 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-gray-700 shadow-sm transition-colors hover:text-gray-900 border border-gray-500 hover:border-gray-800 w-[60px] sm:w-[70px]"
        >
          <span className="text-center">{endYear}</span>
          <ChevronDownIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" aria-hidden="true" />
        </button>

        {endOpen && (
          <div className="absolute top-full mt-1 right-0 left-0 z-[100] w-full min-w-[60px] sm:min-w-[70px] bg-white rounded-lg shadow-lg border border-gray-200">
            <ul className="py-1 max-h-[200px] overflow-y-auto">
              {endYearOptions.map(year => (
                <li 
                  key={year}
                  className={`px-2 py-1.5 sm:py-2 hover:bg-gray-100 cursor-pointer text-xs sm:text-sm text-center ${year === endYear ? 'bg-gray-50 text-black font-medium' : ''}`}
                  onClick={() => {
                    onEndYearChange(year);
                    setEndOpen(false);
                  }}
                >
                  {year}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
