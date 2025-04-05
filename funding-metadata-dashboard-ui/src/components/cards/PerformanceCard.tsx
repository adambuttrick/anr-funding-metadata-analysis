'use client';

import { useFunderData } from '../../hooks/useFunderData';
import { calculateMetadataPerformance, calculateMetadataPerformanceForDateRange } from '../../lib/metrics';
import { getPublisherAggregateStats } from '../../lib/metrics';
import { usePublisher } from '@/contexts/PublisherContext';
import { useDateRange } from '@/contexts/DateRangeContext';
import { api } from '@/lib/api';
import { useEffect, useState, useCallback } from 'react';
import { CardContainer } from '@/components/layout';
import { 
  PerformanceCardProps, 
  PerformanceCardState,
  FunderData,
  ComputePerformanceFunction 
} from '@/types/performance';

export default function PerformanceCard({ funderId }: PerformanceCardProps) {
  const { data, loading, error } = useFunderData(funderId) as { data: FunderData | null, loading: boolean, error: Error | unknown };
  const { selectedPublisher } = usePublisher();
  const { startYear, endYear } = useDateRange();
  
  const [state, setState] = useState<PerformanceCardState>({
    publisherData: null,
    publisherLoading: false,
    previousContent: null,
    visualLoading: loading || false
  });

  useEffect(() => {
    async function fetchPublisherData() {
      if (selectedPublisher) {
        try {
          setState(prev => ({ ...prev, publisherLoading: true }));
          const response = await api.getPublisherStats(selectedPublisher.id, startYear, endYear);
          setState(prev => ({ ...prev, publisherData: response.data }));
        } catch (err) {
          console.error('Failed to fetch publisher stats:', err);
        } finally {
          setState(prev => ({ ...prev, publisherLoading: false }));
        }
      }
    }
    
    fetchPublisherData();
  }, [selectedPublisher, startYear, endYear]);

  const computePerformance: ComputePerformanceFunction = useCallback(() => {
    if (!data?.stats.aggregate && !selectedPublisher) return null;

    let performance;
    let dataSource = 'Funder Overall';
    let publicationCount = 0;
    
    if (selectedPublisher && state.publisherData) {
      if (funderId && state.publisherData.stats.by_funder[funderId]) {
        if (state.publisherData.stats.by_funder[funderId].yearly && 
            Object.keys(state.publisherData.stats.by_funder[funderId].yearly).length > 0 && 
            startYear !== undefined && 
            endYear !== undefined) {
          const rangeStats = calculateMetadataPerformanceForDateRange(
            state.publisherData.stats.by_funder[funderId].yearly, 
            startYear, 
            endYear
          );
          performance = calculateMetadataPerformance(rangeStats);
        } else {
          performance = calculateMetadataPerformance(state.publisherData.stats.by_funder[funderId].aggregate);
        }
        dataSource = `${selectedPublisher.attributes.name}`;
        publicationCount = selectedPublisher.relationships.publications.total;
      } else {
        performance = getPublisherAggregateStats(state.publisherData, startYear, endYear);
        if (performance) {
          dataSource = `${selectedPublisher.attributes.name}`;
          publicationCount = selectedPublisher.relationships.publications.total;
        } else if (data?.stats.aggregate) {
          performance = calculateMetadataPerformance(data.stats.aggregate);
          publicationCount = data?.relationships?.publishers?.reduce((sum, pub) => sum + pub.publication_count, 0) || 0;
          dataSource = 'Funder Overall';
        } else {
          return null;
        }
      }
    } else if (data?.stats.aggregate) {
      if (data.stats.yearly && Object.keys(data.stats.yearly).length > 0) {
        const rangeStats = calculateMetadataPerformanceForDateRange(data.stats.yearly, startYear, endYear);
        performance = calculateMetadataPerformance(rangeStats);
      } else {
        performance = calculateMetadataPerformance(data.stats.aggregate);
      }
      publicationCount = data?.stats?.aggregate?.records_in_funder_data || 
                        data?.relationships?.publishers?.reduce((sum, pub) => sum + pub.publication_count, 0) || 0;
    } else {
      return null;
    }

    return { performance, dataSource, publicationCount };
  }, [data, state.publisherData, selectedPublisher, funderId, startYear, endYear]);

  useEffect(() => {
    if (!loading && !state.publisherLoading) {
      const newContent = computePerformance(data, state.publisherData, selectedPublisher, funderId, startYear, endYear);
      if (newContent) {
        setState(prev => ({ ...prev, previousContent: newContent }));
      }
    }
  }, [data, state.publisherData, loading, state.publisherLoading, selectedPublisher, startYear, endYear, computePerformance, funderId]);
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading || state.publisherLoading) {
      timer = setTimeout(() => {
        setState(prev => ({ ...prev, visualLoading: !prev.previousContent }));
      }, 500);
    } else {
      timer = setTimeout(() => {
        setState(prev => ({ ...prev, visualLoading: false }));
      }, 100);
    }
    return () => clearTimeout(timer);
  }, [loading, state.publisherLoading]);

  const content = (!loading && !state.publisherLoading) 
    ? computePerformance(data, state.publisherData, selectedPublisher, funderId, startYear, endYear) 
    : state.previousContent;
  
  if ((loading || state.publisherLoading) && !state.previousContent) {
    return <CardContainer isLoading={true} minHeight="12rem" preserveHeight={true}><div /></CardContainer>;
  }
  
  if (error && !state.previousContent) {
    return <CardContainer>Error loading performance data</CardContainer>;
  }
  
  if (!content) {
    return <CardContainer isLoading={true} minHeight="12rem" preserveHeight={true}><div /></CardContainer>;
  }

  const { performance, dataSource, publicationCount } = content;
  
  const formattedRecords = (num: number) => Intl.NumberFormat('en-US', { 
    notation: 'compact',
    maximumFractionDigits: 1 
  }).format(num);

  return (
    <CardContainer 
      title="Performance" 
      titleClassName="text-center"
      isLoading={state.visualLoading}
      preserveHeight={true}
    >
      <div className="flex flex-col items-center text-center">
        <div className="text-6xl font-bold mb-2">{performance.overall}%</div>
        <div className="text-gray-500">{dataSource}</div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-center text-sm">
          <span className="font-medium mr-2">Publications:</span>
          <span className="bg-blue-100 px-2 py-1 rounded">
            {formattedRecords(publicationCount)}
          </span>
        </div>
      </div>
    </CardContainer>
  );
}
