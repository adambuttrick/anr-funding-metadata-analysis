'use client';

import FunderSelector from './FunderSelector';
import YearRangeSelector from './YearRangeSelector';

import { Funder as ApiFunder } from '@/lib/api';

type Funder = ApiFunder;

export interface HeaderControlsProps {
  funders: Funder[];
  selectedFunderId: string | null;
  onFunderChange: (funderId: string) => void;
  startYear: number;
  endYear: number;
  availableYears: number[];
  onStartYearChange: (year: number) => void;
  onEndYearChange: (year: number) => void;
  isMobile?: boolean;
}

export default function HeaderControls({ 
  funders, 
  selectedFunderId, 
  onFunderChange, 
  startYear, 
  endYear, 
  availableYears, 
  onStartYearChange, 
  onEndYearChange,
  isMobile = false
}: HeaderControlsProps) {
  if (isMobile) {
    return (
      <>
        {/* Funder selection */}
        <div className="w-full">
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Funder:</label>
            <div className="relative w-full">
              <select
                value={selectedFunderId || ''}
                onChange={(e) => onFunderChange(e.target.value)}
                className="block w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm"
              >
                {funders.map((funder) => (
                  <option key={funder.id} value={funder.id}>
                    {funder.attributes.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Year Range */}
        <div className="w-full">
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Year Range:</label>
            <div className="flex items-center gap-2">
              <div className="relative w-full max-w-[100px]">
                <select
                  value={startYear}
                  onChange={(e) => onStartYearChange(Number(e.target.value))}
                  className="block w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm"
                >
                  {availableYears
                    .filter(year => year < endYear)
                    .sort((a, b) => a - b)
                    .map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))
                  }
                </select>
              </div>
              
              <span className="text-gray-400">—</span>
              
              <div className="relative w-full max-w-[100px]">
                <select
                  value={endYear}
                  onChange={(e) => onEndYearChange(Number(e.target.value))}
                  className="block w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm"
                >
                  {availableYears
                    .filter(year => year > startYear)
                    .sort((a, b) => a - b)
                    .map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))
                  }
                </select>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="hidden md:flex items-center gap-2 sm:gap-3 flex-nowrap shrink-0 ml-auto">
      <FunderSelector 
        funders={funders}
        selectedFunderId={selectedFunderId}
        onFunderChange={onFunderChange}
        className="flex-shrink-0"
      />
      
      <div className="flex-shrink-0 min-h-[26px] sm:min-h-[30px] mr-4 md:mr-6 lg:mr-8" style={{ position: 'relative', zIndex: 49, overflow: 'visible' }}>
        <YearRangeSelector 
          startYear={startYear}
          endYear={endYear}
          availableYears={availableYears}
          onStartYearChange={onStartYearChange}
          onEndYearChange={onEndYearChange}
        />
      </div>
    </div>
  );
}
