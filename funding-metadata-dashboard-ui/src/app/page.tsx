'use client';

import { useEffect, useState } from 'react';
import ChartCard from '@/components/charts/ChartCard';
import MetadataFieldsCard from '@/components/cards/MetadataFieldsCard';
import PerformanceCard from '@/components/cards/PerformanceCard';
import FunderSelectionModal from '@/components/modals/FunderSelectionModal';
import { processYearlyStats } from '@/lib/metrics';
import { useDateRange } from '@/contexts/DateRangeContext';
import { useFunder } from '@/contexts/FunderContext';

export default function Home() {
  const { startYear, endYear } = useDateRange();
  const { selectedFunder, funderData, hasSelectedFunder } = useFunder();
  const [chartData, setChartData] = useState<Array<{ date: string; value: number }>>([]);
  const [chartStats, setChartStats] = useState<{ peakDate: string; amount: number; change: number } | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedFunder) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const fetchData = async () => {
      try {        
        if (funderData) {
          const { chartData, stats } = processYearlyStats(funderData, startYear, endYear);
          setChartData(chartData);
          setChartStats(stats);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedFunder, funderData, startYear, endYear]);
  return (
    <>
      {/* Funder Selection Modal */}
      <FunderSelectionModal />
      
      <div className="grid gap-6 relative">
        
        <div className="grid gap-6 md:grid-cols-12">
          {/* Left Column */}
          <div className="grid gap-6 md:col-span-8">
            {loading ? (
              <div className="card bg-[#E5F0F0] p-6 flex items-center justify-center h-[300px]">
                <p>Loading chart data...</p>
              </div>
            ) : (
              <ChartCard
                title={`Completeness Trend ${hasSelectedFunder ? `- ${funderData?.attributes?.name || ''}` : ''}`}
                data={chartData}
                stats={chartStats}
                showPublisherSelector={hasSelectedFunder}
              />
            )}
          </div>
          {/* Right Column */}
          <div className="grid gap-6 md:col-span-4">
            {hasSelectedFunder ? (
              <>
                <PerformanceCard funderId={selectedFunder} />
                <MetadataFieldsCard funderId={selectedFunder} />
              </>
            ) : (
              <>
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200 h-[200px] flex items-center justify-center">
                  <p className="text-gray-400 text-center">Select a funder to view performance metrics</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200 h-[200px] flex items-center justify-center">
                  <p className="text-gray-400 text-center">Select a funder to view metadata field statistics</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
