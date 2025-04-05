'use client';

import React, { useRef, useEffect, useState } from 'react';
import { PlusIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PublisherSelectorProps } from '@/types/charts';

export function PublisherSelector({
  publishers,
  selectedPublishers,
  publisherDataList,
  showAggregate,
  loading,
  onPublisherSelect,
  onClearAll,
  onToggleAggregate,
  onSearch
}: PublisherSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <div className="mt-6 border-t border-gray-200 pt-4 mb-4">
      <div className="flex justify-end">
        <div className="flex flex-wrap items-center gap-2">
          {publisherDataList.length > 0 && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1 px-3 py-2 bg-white rounded-md shadow-sm text-sm text-red-600 hover:text-red-800 transition-colors border border-red-500 hover:border-red-700"
            >
              <span>Clear</span>
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
          <div className="relative" ref={dropdownRef}>
            {!dropdownOpen ? (
              <button
                onClick={() => {
                  setDropdownOpen(true);
                  setSearchTerm('');
                }}
                className="flex items-center justify-between gap-1 px-3 py-2 bg-white rounded-md shadow-sm text-sm text-gray-700 hover:text-gray-900 transition-colors border border-gray-500 hover:border-gray-800 w-full sm:w-[180px]"
                disabled={loading}
              >
                <div className="flex items-center min-w-0">
                  <span className="mr-1">Add publisher</span>
                  <div className="min-w-[40px] flex justify-center">
                    {(publisherDataList.length > 0 || showAggregate) && (
                      <span className="text-xs bg-gray-200 text-black px-1.5 py-0.5 rounded-full">
                        {publisherDataList.length + (showAggregate ? 1 : 0)}/10
                      </span>
                    )}
                  </div>
                </div>
                <PlusIcon className="h-4 w-4 flex-shrink-0" />
              </button>
            ) : (
              <div className="w-full sm:w-[180px] flex items-center">
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-4 w-4 text-black" />
                  </div>
                  <input
                    type="text"
                    className="block w-full h-[38px] pl-10 pr-3 py-2 border border-black rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-gray-500 focus:border-gray-700 sm:text-sm text-black"
                    placeholder="Search publishers..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (onSearch) {
                        onSearch(e.target.value);
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>
            )}
            
            {/* Publisher selector dropdown */}
            {dropdownOpen && (
              <div className="absolute top-full mt-1 right-0 z-20 w-full sm:w-80">
                <div className="bg-white rounded-lg shadow-lg z-10 border border-gray-200 overflow-hidden">
                  {loading ? (
                    <div className="p-4 text-center text-sm text-gray-500">Loading publishers...</div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {publishers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          {searchTerm ? 'No matching publishers found' : 'No publishers available'}
                        </div>
                      ) : (
                        <ul className="py-1">
                          {/* Toggle aggregate data */}
                          <li 
                            className={`px-4 py-3 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100 ${showAggregate ? 'bg-gray-50' : ''}`}
                            onClick={() => {
                              onToggleAggregate();
                              setDropdownOpen(false);
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <div className="font-medium">Show aggregate data</div>
                              {showAggregate && (
                                <span className="text-xs bg-gray-200 text-black px-2 py-0.5 rounded-full">Active</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Toggle the aggregate view across all publishers
                            </div>
                          </li>
                          
                          {/* Publisher options */}
                          {publishers.map((publisher) => {
                            const isAlreadySelected = selectedPublishers.some(p => p.id === publisher.id);
                            const maxPublishersReached = (publisherDataList.length + (showAggregate ? 1 : 0)) >= 10;
                            return (
                              <li 
                                key={publisher.id}
                                className={`px-4 py-3 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 ${isAlreadySelected ? 'bg-gray-50' : ''} ${maxPublishersReached && !isAlreadySelected ? 'opacity-50 pointer-events-none' : ''}`}
                                onClick={() => {
                                  onPublisherSelect(publisher);
                                  setDropdownOpen(false);
                                }}
                                title={maxPublishersReached && !isAlreadySelected ? 'Maximum of 10 data series can be compared at once' : undefined}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="font-medium">{publisher.attributes.name}</div>
                                  {isAlreadySelected && (
                                    <span className="text-xs bg-gray-200 text-black px-2 py-0.5 rounded-full">Selected</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {publisher.relationships.publications.total.toLocaleString()} publications
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
