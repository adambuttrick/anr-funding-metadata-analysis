'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api, Publisher } from '@/lib/api';
import { PublisherDataType } from '@/types/charts';
import { processPublisherYearlyStats } from '@/lib/metrics';
import { CHART_COLORS } from '@/constants/colors';

interface UsePublisherSelectionOptions {
  initialPublisherData?: PublisherDataType;
  startYear: number;
  endYear: number;
  selectedFunder: string | null;
  maxPublishers?: number;
  setSelectedPublisher?: (publisher: Publisher | null) => void;
}

export function usePublisherSelection({
  initialPublisherData,
  startYear,
  endYear,
  selectedFunder,
  maxPublishers = 10,
  setSelectedPublisher
}: UsePublisherSelectionOptions) {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [filteredPublishers, setFilteredPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPublishers, setSelectedPublishers] = useState<Publisher[]>([]);
  const [showAggregate, setShowAggregate] = useState(true);
  const [publisherDataList, setPublisherDataList] = useState<PublisherDataType[]>(
    initialPublisherData ? [initialPublisherData] : []
  );
  const [frontPublisherId, setFrontPublisherId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const publisherColors = CHART_COLORS.PUBLISHER_SERIES;

  const fetchPublishers = useCallback(async () => {
    try {
      setLoading(true);
      let allPublishers: Publisher[] = [];
      
      if (selectedFunder) {
        const publisherResponse = await api.getFunderPublishers(selectedFunder, startYear, endYear);
        allPublishers = publisherResponse.data;
      }

      const uniquePublishers = Array.from(new Map(
        allPublishers.map(pub => [pub.id, pub])
      ).values());

      setPublishers(uniquePublishers);
      setFilteredPublishers(uniquePublishers);
    } catch (err) {
      console.error('Failed to fetch publishers:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedFunder, startYear, endYear]);

  useEffect(() => {
    if (initialPublisherData) {
      setPublisherDataList(prev => {
        const exists = prev.some(p => p.id === initialPublisherData.id);
        if (exists) return prev;
        return [...prev, initialPublisherData];
      });
    }
  }, [initialPublisherData]);

  useEffect(() => {
    fetchPublishers();
  }, [fetchPublishers]);
  useEffect(() => {
    if (publisherDataList.length === 0) return;
    
    const updateData = () => {
      setPublisherDataList(currentDataList => {
        const updatedList = currentDataList.map(publisherData => {
          const publisher = selectedPublishers.find(p => p.id === publisherData.id);
          
          if (publisher) {
            try {
              const { chartData, stats: updatedStats } = processPublisherYearlyStats(publisher, startYear, endYear);
              
              return {
                ...publisherData,
                data: chartData,
                stats: updatedStats
              };
            } catch (error) {
              console.error(`Error updating stats for publisher ${publisherData.name}:`, error);
              return publisherData;
            }
          }
          
          return publisherData;
        });
        
        const hasChanged = JSON.stringify(updatedList) !== JSON.stringify(currentDataList);
        return hasChanged ? updatedList : currentDataList;
      });
    };
    
    updateData();
  }, [startYear, endYear]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPublishers(publishers);
      return;
    }
    
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    setLoading(true);
    
    debounceTimeout.current = setTimeout(async () => {
      try {
        if (searchTerm.trim().length >= 2) {
          const searchResponse = await api.searchPublishers(searchTerm);
          setFilteredPublishers(searchResponse.data);
        } else {
          const filtered = publishers.filter(publisher => 
            publisher.attributes.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
          setFilteredPublishers(filtered);
        }
      } catch (error) {
        console.error('Error searching publishers:', error);
        const filtered = publishers.filter(publisher => 
          publisher.attributes.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredPublishers(filtered);
      } finally {
        setLoading(false);
      }
    }, 300);
    
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [searchTerm, publishers]);

  useEffect(() => {
    if (publisherDataList.length === 0 && !showAggregate) {
      setShowAggregate(true);
    }
  }, [publisherDataList.length, showAggregate]);

  const handlePublisherSelect = (publisher: Publisher) => {
    const isAlreadySelected = selectedPublishers.some(p => p.id === publisher.id);
    
    if (isAlreadySelected) {
      setSelectedPublishers(prev => prev.filter(p => p.id !== publisher.id));
      setPublisherDataList(prev => prev.filter(p => p.id !== publisher.id));
      return;
    }
    
    const totalSelections = publisherDataList.length + (showAggregate ? 1 : 0);
    if (totalSelections >= maxPublishers) {
      console.warn(`Maximum of ${maxPublishers} data series can be compared at once`);
      return;
    }
    
    setSelectedPublishers(prev => [...prev, publisher]);
    
    try {
      const { chartData, stats: publisherStats } = processPublisherYearlyStats(publisher, startYear, endYear);
      const colorIndex = publisherDataList.length % publisherColors.length;
      
      setPublisherDataList(prev => [
        ...prev, 
        {
          id: publisher.id,
          name: publisher.attributes.name,
          data: chartData,
          stats: publisherStats,
          color: publisherColors[colorIndex]
        }
      ]);
    } catch (error) {
      console.error('Error processing publisher data:', error);
      setSelectedPublishers(prev => prev.filter(p => p.id !== publisher.id));
    }
  };
  
  const handleRemovePublisher = (publisherId?: string) => {
    if (!publisherId) {
      if (publisherDataList.length > 0) {
        const isTogglingOff = showAggregate;
        setShowAggregate(!showAggregate);
        
        if (isTogglingOff && publisherDataList.length > 0) {
          const firstPublisherId = publisherDataList[0].id;
          const firstPublisher = selectedPublishers.find(p => p.id === firstPublisherId);
          if (firstPublisher) {
          }
        }
      }
    } else {
      if (setSelectedPublisher && publisherId === frontPublisherId) {
        setSelectedPublisher(null);
      }
      
      setSelectedPublishers(prev => prev.filter(p => p.id !== publisherId));
      setPublisherDataList(prev => prev.filter(p => p.id !== publisherId));
      
      if (frontPublisherId === publisherId) {
        setFrontPublisherId(null);
      }
      
      const updatedPublisherList = publisherDataList.filter(p => p.id !== publisherId);
      if (updatedPublisherList.length === 0 && setSelectedPublisher) {
        setSelectedPublisher(null);
      }
      
      if (publisherDataList.length === 1 && !showAggregate) {
        setShowAggregate(true);
      }
    }
  };

  const handleClearAll = () => {
    setSelectedPublishers([]);
    setPublisherDataList([]);
    setShowAggregate(true);
    setFrontPublisherId(null);
    
    if (setSelectedPublisher) {
      setSelectedPublisher(null);
    }
  };

  return {
    publishers,
    filteredPublishers,
    loading,
    selectedPublishers,
    showAggregate,
    publisherDataList,
    frontPublisherId,
    searchTerm,
    setSearchTerm,
    setFrontPublisherId,
    fetchPublishers,
    handlePublisherSelect,
    handleRemovePublisher,
    handleClearAll,
    setShowAggregate
  };
}
