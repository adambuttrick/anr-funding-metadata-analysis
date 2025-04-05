'use client';

import React from 'react';
import { usePublisher } from '@/contexts/PublisherContext';
import { useDateRange } from '@/contexts/DateRangeContext';
import { useFunder } from '@/contexts/FunderContext';
import { CardContainer } from '@/components/layout';
import { ChartCardProps } from '@/types/charts';
import { ChartVisualization } from './ChartVisualization';
import { PublisherSelector } from './PublisherSelector';
import { StatsTable } from './StatsTable';
import { useChartAnimation } from '@/hooks/useChartAnimation';
import { usePublisherSelection } from '@/hooks/usePublisherSelection';

export default function ChartCard({ 
  title, 
  data, 
  stats, 
  publisherData: initialPublisherData, 
  showPublisherSelector = false 
}: ChartCardProps) {
  const { selectedPublisher, setSelectedPublisher } = usePublisher();
  const { startYear, endYear } = useDateRange();
  const { selectedFunder } = useFunder();
  const {
    filteredPublishers,
    loading,
    selectedPublishers,
    showAggregate,
    publisherDataList,
    frontPublisherId,
    setFrontPublisherId,
    fetchPublishers,
    handlePublisherSelect,
    handleRemovePublisher,
    handleClearAll,
    setShowAggregate,
    setSearchTerm
  } = usePublisherSelection({
    initialPublisherData,
    startYear,
    endYear,
    selectedFunder,
    maxPublishers: 10,
    setSelectedPublisher
  });
  
  const {
    displayData,
    isTransitioning,
    transitionPhase
  } = useChartAnimation({
    data,
    startYear,
    endYear,
    onFetchData: showPublisherSelector ? fetchPublishers : undefined
  });
  
  const dateRangeDisplay = `${startYear} — ${endYear}`;

  const handleToggleAggregate = () => {
    setShowAggregate(!showAggregate);
  };

  return (
    <CardContainer className="overflow-hidden" minHeight="28rem" isLoading={isTransitioning}>
      <div className="mb-4">
        <div className="w-full overflow-hidden">
          <div className="flex items-center gap-3 flex-nowrap">
            <h2 className="text-xl font-semibold text-black">{title}</h2>
            <span className="text-sm sm:text-base font-medium text-gray-600 whitespace-nowrap shrink-0">
              {dateRangeDisplay}
            </span>
          </div>
        </div>
      </div>

      <ChartVisualization 
        displayData={displayData}
        publisherDataList={publisherDataList}
        showAggregate={showAggregate}
        frontPublisherId={frontPublisherId}
        selectedPublisher={selectedPublisher}
        transitionPhase={transitionPhase}
        setSelectedPublisher={setSelectedPublisher}
        setFrontPublisherId={setFrontPublisherId}
        selectedPublishers={selectedPublishers}
      />

      {showPublisherSelector && (
        <PublisherSelector
          publishers={filteredPublishers}
          selectedPublishers={selectedPublishers}
          publisherDataList={publisherDataList}
          showAggregate={showAggregate}
          loading={loading}
          onPublisherSelect={handlePublisherSelect}
          onRemovePublisher={handleRemovePublisher}
          onClearAll={handleClearAll}
          onToggleAggregate={handleToggleAggregate}
          onSearch={setSearchTerm}
        />
      )}

      <StatsTable
        stats={stats}
        publisherDataList={publisherDataList}
        showAggregate={showAggregate}
        selectedPublisher={selectedPublisher}
        selectedPublishers={selectedPublishers}
        onPublisherSelect={setSelectedPublisher}
        onRemovePublisher={handleRemovePublisher}
        setFrontPublisherId={setFrontPublisherId}
      />
    </CardContainer>
  );
}
