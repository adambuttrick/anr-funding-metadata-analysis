'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import useSWR from 'swr';
import { useDateRange } from '@/contexts/DateRangeContext';
import { useFunder } from '@/contexts/FunderContext';
import { Funder as ApiFunder } from '@/lib/api';

type Funder = ApiFunder;

export default function useHeaderData() {
  const { selectedFunder, setSelectedFunder, setFunderData } = useFunder();
  const { startYear, endYear, setStartYear, setEndYear } = useDateRange();
  
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  const fundersCacheKey = 'funders';
  const { data: fundersResponse } = useSWR(fundersCacheKey, api.getFunders);
  const funders = useMemo<Funder[]>(() => fundersResponse?.data ?? [], [fundersResponse]);
  
  const handleFunderChange = useCallback((funderId: string) => {
    setSelectedFunder(funderId);
    const selectedFunderData = funders.find(f => f.id === funderId) || null;
    setFunderData(selectedFunderData);
  }, [funders, setSelectedFunder, setFunderData]);
  
  useEffect(() => {
    if (funders.length > 0 && !selectedFunder) {
      handleFunderChange(funders[0].id);
    }
  }, [funders, selectedFunder, handleFunderChange]);
  
  useEffect(() => {
    if (funders.length > 0) {
      const yearsSet = new Set<number>();
      
      funders.forEach(funder => {
        if (funder.stats && funder.stats.yearly) {
          Object.keys(funder.stats.yearly).forEach(yearStr => {
            const year = parseInt(yearStr, 10);
            if (!isNaN(year)) {
              yearsSet.add(year);
            }
          });
        }
      });
      
      const years = Array.from(yearsSet).sort((a, b) => b - a);
      
      setAvailableYears(years);
      if (years.length > 0 && !availableYears.length) {
        if (years.length === 1) {
          setStartYear(years[0]);
          setEndYear(years[0]);
        } else {
          setStartYear(years[years.length - 1]);
          setEndYear(years[0]);
        }
      }
    }
  }, [funders, availableYears.length, setEndYear, setStartYear]);
  
  const funderStatsCacheKey = selectedFunder ? `funders/${selectedFunder}/stats?startYear=${startYear}&endYear=${endYear}` : null;
  useSWR(
    funderStatsCacheKey,
    () => {
      if (!selectedFunder) return null;
      return api.getFunderStats(selectedFunder, startYear, endYear);
    }
  );
  const handleStartYearChange = useCallback((year: number) => {
    if (year >= endYear && availableYears.length > 1) {
      const nextYearIndex = availableYears.findIndex(y => y === year) - 1;
      if (nextYearIndex >= 0) {
        setEndYear(availableYears[nextYearIndex]);
      }
    }
    
    setStartYear(year);
  }, [endYear, availableYears, setEndYear, setStartYear]);
  
  const handleEndYearChange = useCallback((year: number) => {
    if (year <= startYear && availableYears.length > 1) {
      const prevYearIndex = availableYears.findIndex(y => y === year) + 1;
      if (prevYearIndex < availableYears.length) {
        setStartYear(availableYears[prevYearIndex]);
      }
    }
    
    setEndYear(year);
  }, [startYear, availableYears, setStartYear, setEndYear]);
  
  return {
    funders,
    selectedFunder,
    handleFunderChange,
    availableYears,
    startYear,
    endYear,
    handleStartYearChange,
    handleEndYearChange
  };
}
