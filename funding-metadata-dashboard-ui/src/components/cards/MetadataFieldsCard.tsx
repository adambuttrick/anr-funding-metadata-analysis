'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFunderData } from '../../hooks/useFunderData';
import { calculateMetadataPerformance, calculateMetadataPerformanceForDateRange, calculatePublisherMetadataPerformance, getPublisherAggregateStats } from '../../lib/metrics';
import { Tooltip } from '@/components/ui/Tooltip';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { usePublisher } from '@/contexts/PublisherContext';
import { useDateRange } from '@/contexts/DateRangeContext';
import { Publisher, api } from '@/lib/api';
import { CHART_COLORS, DOI_ASSERTION, TEXT_COLORS } from '@/constants/colors';
import { CardContainer } from '@/components/layout';
import { 
  MetadataFieldsCardProps, 
  MetadataField, 
  DoiAssertionPieChartProps, 
  MetadataContent, 
  formatPercentage 
} from '@/types/metadata';

function DoiAssertionPieChart({ doiAssertionStats }: DoiAssertionPieChartProps) {
  const pieData = [
    { name: 'Crossref', value: doiAssertionStats.crossref, color: DOI_ASSERTION.CROSSREF },
    { name: 'Publisher', value: doiAssertionStats.publisher, color: DOI_ASSERTION.PUBLISHER },
    { name: 'Not Asserted', value: doiAssertionStats.notAsserted, color: DOI_ASSERTION.NOT_ASSERTED }
  ];
  
  const renderCustomLegend = () => {
    return (
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-xs sm:text-sm md:gap-x-4">
        {pieData.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center min-w-0 px-1">
            <div 
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 rounded-sm flex-shrink-0" 
              style={{ backgroundColor: entry.color }}
            />
            <span 
              className="truncate" 
              style={{ color: entry.name === 'Not Asserted' ? TEXT_COLORS.MUTED : 'inherit' }}
            >
              {entry.name}{' '}
              <span className="font-medium">
                {Math.round(entry.value)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-lg p-3 mt-3 border border-gray-200 shadow-sm">
      <h4 className="text-sm font-medium text-gray-600 mb-2">Funder DOI Asserted By</h4>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={1}
              stroke="#fff"
              label={false}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      {renderCustomLegend()}
    </div>
  );
}

export default function MetadataFieldsCard({ funderId }: MetadataFieldsCardProps) {
  const { data, loading, error } = useFunderData(funderId);
  const { selectedPublisher } = usePublisher();
  const { startYear, endYear } = useDateRange();
  const [publisherData, setPublisherData] = useState<Publisher | null>(null);
  const [publisherLoading, setPublisherLoading] = useState(false);
  const [previousContent, setPreviousContent] = useState<MetadataContent | null>(null);
  const [visualLoading, setVisualLoading] = useState(loading || publisherLoading);
  useEffect(() => {
    async function fetchPublisherData() {
      if (selectedPublisher) {
        try {
          setPublisherLoading(true);
          const response = await api.getPublisherStats(selectedPublisher.id, startYear, endYear);
          setPublisherData(response.data);
        } catch (err) {
          console.error('Failed to fetch publisher stats:', err);
        } finally {
          setPublisherLoading(false);
        }
      }
    }
    
    fetchPublisherData();
  }, [selectedPublisher, startYear, endYear]);

  const computeMetrics = useCallback(() => {
    if (!data?.stats.aggregate && !selectedPublisher) return null;

    let metrics;
    let dataSource = 'Funder';
    
    if (selectedPublisher && publisherData) {
      const publisherMetrics = funderId && publisherData.stats.by_funder[funderId]
        ? calculatePublisherMetadataPerformance(publisherData, funderId, startYear, endYear)
        : getPublisherAggregateStats(publisherData, startYear, endYear);
        
      if (publisherMetrics) {
        metrics = publisherMetrics;
        dataSource = 'Publisher';
      } else if (data?.stats.aggregate) {
        metrics = calculateMetadataPerformance(data.stats.aggregate);
      } else {
        return null;
      }
    } else if (data?.stats.aggregate) {
      if (data.stats.yearly && Object.keys(data.stats.yearly).length > 0) {
        const rangeStats = calculateMetadataPerformanceForDateRange(data.stats.yearly, startYear, endYear);
        metrics = calculateMetadataPerformance(rangeStats);
      } else {
        metrics = calculateMetadataPerformance(data.stats.aggregate);
      }
    } else {
      return null;
    }

    return { metrics, dataSource };
  }, [data, publisherData, selectedPublisher, funderId, startYear, endYear]);

  useEffect(() => {
    if (!loading && !publisherLoading) {
      const newContent = computeMetrics();
      if (newContent) {
        setPreviousContent(newContent);
      }
    }
  }, [data, publisherData, loading, publisherLoading, selectedPublisher, startYear, endYear, computeMetrics]);
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    // Don't immediately show loading state when data is being fetched
    // Only show loading if it takes more than 500ms to get new data
    if (loading || publisherLoading) {
      // Keep previous content visible during loading
      timer = setTimeout(() => {
        // Only set visual loading if we don't have previous content to display
        setVisualLoading(!previousContent);
      }, 500);
    } else {
      // Short delay before showing new content for smoother transition
      timer = setTimeout(() => {
        setVisualLoading(false);
      }, 100);
    }
    return () => clearTimeout(timer);
  }, [loading, publisherLoading, previousContent]);

  // Always use previous content during loading to prevent flashing
  const content = (!loading && !publisherLoading) ? computeMetrics() : previousContent;
  
  if ((loading || publisherLoading) && !previousContent) {
    return <CardContainer isLoading={true} minHeight="24rem" preserveHeight={true}><div /></CardContainer>;
  }
  
  if (error && !previousContent) {
    return <CardContainer>Error loading metadata stats</CardContainer>;
  }
  
  if (!content) {
    return <CardContainer isLoading={true} minHeight="24rem" preserveHeight={true}><div /></CardContainer>;
  }

  const { metrics, dataSource } = content;
  
  if (!metrics) {
    return <CardContainer>No metadata metrics available</CardContainer>;
  }
  
  const barChartFields = [
    { 
      name: 'Funder DOI',
      description: 'Percentage of publications with a valid Funder DOI',
      value: metrics.breakdown.funderDoi,
      color: CHART_COLORS.PUBLISHER_SERIES[0] // blue-500
    },
    { 
      name: 'Award Code',
      description: 'Percentage of publications with a matching award code in our database',
      value: metrics.breakdown.awardCode,
      color: CHART_COLORS.PUBLISHER_SERIES[4] // emerald-500
    },
    { 
      name: 'Funder Name',
      description: 'Percentage of publications with a funder name that matches our records',
      value: metrics.breakdown.funderName,
      color: CHART_COLORS.PUBLISHER_SERIES[2] // violet-500
    }
  ];
  
  return (
    <CardContainer 
      isLoading={visualLoading}
      preserveHeight={true}
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-sm text-gray-500">Funding Metadata Fields</h3>
          <p className="text-xs text-gray-500">Completeness metrics - {dataSource}</p>
        </div>
        
        {/* Bar chart metrics */}
        <div className="space-y-3">
          {barChartFields.map((field: MetadataField) => (
            <div key={field.name} className="space-y-1">
              <Tooltip content={field.description}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-600 hover:text-gray-900 cursor-help transition-colors">
                    {field.name}
                  </span>
                  <span className="font-medium text-black">
                    {formatPercentage(field.value)}
                  </span>
                </div>
              </Tooltip>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${field.value}%`,
                    backgroundColor: field.color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        
        {/* Divider */}
        <div className="border-t border-gray-200 my-8"></div>
        
        {/* DOI Assertion section */}
        <div>
          {/* Pie chart sub-card */}
          <DoiAssertionPieChart doiAssertionStats={metrics.breakdown.doiAssertion} />
        </div>
      </div>
    </CardContainer>
  );
}
