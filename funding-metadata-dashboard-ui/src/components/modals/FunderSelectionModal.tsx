'use client';

import { useState, useEffect, Fragment, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useFunder } from '@/contexts/FunderContext';
import { api, Funder } from '@/lib/api';
import useSWR from 'swr';

export default function FunderSelectionModal() {
  const { 
    showFunderSelectionModal, 
    setShowFunderSelectionModal, 
    setSelectedFunder, 
    setFunderData 
  } = useFunder();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filteredFunders, setFilteredFunders] = useState<Funder[]>([]);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const { data: fundersResponse, isLoading: isFundersLoading } = useSWR(
    searchQuery.trim() === '' ? 'funders' : null, 
    api.getFunders
  );
  
  useEffect(() => {
    if (searchQuery.trim() === '' && fundersResponse?.data) {
      setFilteredFunders(fundersResponse.data);
    }
  }, [fundersResponse, searchQuery]);
  
  useEffect(() => {
    if (searchQuery.trim() === '') {
      if (fundersResponse?.data) {
        setFilteredFunders(fundersResponse.data);
      }
      return;
    }
    
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    setIsSearching(true);
    
    debounceTimeout.current = setTimeout(async () => {
      try {
        if (searchQuery.trim().length >= 2) {
          const searchResponse = await api.searchFunders(searchQuery);
          setFilteredFunders(searchResponse.data);
        } else if (fundersResponse?.data) {
          const filtered = fundersResponse.data.filter(funder => 
            funder.attributes.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setFilteredFunders(filtered);
        }
      } catch (error) {
        console.error('Error searching funders:', error);
        if (fundersResponse?.data) {
          const filtered = fundersResponse.data.filter(funder => 
            funder.attributes.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setFilteredFunders(filtered);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);
    
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [searchQuery, fundersResponse]);
  
  const handleFunderSelect = (funder: Funder) => {
    setSelectedFunder(funder.id);
    setFunderData(funder);
    setShowFunderSelectionModal(false);
  };
  
  return (
    <Transition appear show={showFunderSelectionModal} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-50" 
        onClose={() => {}}
      >
        {/* Modal backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>
        
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Select a Funder
                </Dialog.Title>
                
                <div className="mt-4">
                  <p className="text-sm text-gray-500">
                    Please select a funder to view their funding metadata statistics.
                  </p>
                </div>
                
                {/* Search input */}
                <div className="mt-4">
                  <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full rounded-md border-0 py-3 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                      placeholder="Search funders..."
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                      >
                        <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Funders list */}
                <div className="mt-4 max-h-60 overflow-y-auto">
                  {isFundersLoading || isSearching ? (
                    <div className="py-3 text-center text-gray-500">Loading funders...</div>
                  ) : filteredFunders.length === 0 ? (
                    <div className="py-3 text-center text-gray-500">No funders match your search</div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {filteredFunders.map((funder) => (
                        <li 
                          key={funder.id}
                          className="py-3 px-2 hover:bg-gray-50 cursor-pointer rounded"
                          onClick={() => handleFunderSelect(funder)}
                        >
                          <div className="flex justify-between">
                            <p className="font-medium text-gray-900">{funder.attributes.name}</p>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {funder.relationships?.publishers?.length?.toLocaleString() || 0} publishers
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
