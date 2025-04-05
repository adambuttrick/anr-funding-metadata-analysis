'use client';

import React from 'react';
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CARD_BACKGROUND, CHART_COLORS, TEXT_COLORS, BORDER_COLORS } from '@/constants/colors';
import { ChartVisualizationProps } from '@/types/charts';

export function ChartVisualization({
  displayData,
  publisherDataList,
  showAggregate,
  frontPublisherId,
  selectedPublisher,
  transitionPhase,
  setSelectedPublisher,
  setFrontPublisherId,
  selectedPublishers
}: ChartVisualizationProps) {
  return (
    <div 
      className={`h-[280px] w-full transition-all ${
        transitionPhase === 'prepare' ? 'duration-100 opacity-95' :
        transitionPhase === 'fade-out' ? 'duration-150 opacity-75 blur-[0.5px] scale-[0.995]' : 
        transitionPhase === 'animating' ? 'duration-200 opacity-90 blur-[0.25px]' : 
        transitionPhase === 'fade-in' ? 'duration-150 opacity-100 scale-[1]' : 'opacity-100'
      }`}
      style={{
        willChange: transitionPhase !== 'idle' ? 'opacity, filter, transform' : 'auto',
        backfaceVisibility: 'hidden'
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={displayData.map(item => {
            const mergedPoint: Record<string, unknown> = { ...item };
            if (!showAggregate) {
              delete mergedPoint.value;
            }
            publisherDataList.forEach((publisher, index) => {
              const publisherPoint = publisher.data.find(p => p.date === item.date);
              if (publisherPoint) {
                mergedPoint[`publisher_${publisher.id || index}`] = publisherPoint.value || 0;
              }
            });
            
            return mergedPoint;
          })}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          onClick={(data) => {
            if (data && data.activePayload && data.activePayload.length > 0) {
              const clickedSeries = data.activePayload[0].dataKey;
              
              if (clickedSeries === 'value') {
                setSelectedPublisher(null);
                setFrontPublisherId(null);
              } else if (clickedSeries.startsWith('publisher_')) {
                const publisherId = clickedSeries.replace('publisher_', '');
                const publisher = selectedPublishers.find(p => p.id === publisherId || publisherId === String(selectedPublishers.indexOf(p)));
                if (publisher) {
                  setSelectedPublisher(publisher);
                  setFrontPublisherId(publisher.id || null);
                }
              }
            }
          }}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CARD_BACKGROUND} stopOpacity={CHART_COLORS.GRADIENT.START_OPACITY} />
              <stop offset="100%" stopColor={CARD_BACKGROUND} stopOpacity={CHART_COLORS.GRADIENT.END_OPACITY} />
            </linearGradient>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.PRIMARY} stopOpacity={CHART_COLORS.GRADIENT.START_OPACITY} />
              <stop offset="100%" stopColor={CHART_COLORS.PRIMARY} stopOpacity={0.3} />
            </linearGradient>
            {/* Gradient for selected aggregate */}
            <linearGradient id="selectedBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.PRIMARY} stopOpacity={0.9} />
              <stop offset="100%" stopColor={CHART_COLORS.PRIMARY} stopOpacity={0.5} />
            </linearGradient>
            {/* Create gradient definitions for each publisher - both regular and selected versions */}
            {publisherDataList.map((publisher, index) => (
              <React.Fragment key={`gradients-${publisher.id || index}`}>
                <linearGradient 
                  id={`publisherGradient-${publisher.id || index}`} 
                  x1="0" y1="0" x2="0" y2="1"
                >
                  <stop offset="0%" stopColor={publisher.color || CHART_COLORS.SECONDARY} stopOpacity={CHART_COLORS.GRADIENT.START_OPACITY} />
                  <stop offset="100%" stopColor={publisher.color || CHART_COLORS.SECONDARY} stopOpacity={0.3} />
                </linearGradient>
                <linearGradient 
                  id={`selectedPublisherGradient-${publisher.id || index}`} 
                  x1="0" y1="0" x2="0" y2="1"
                >
                  <stop offset="0%" stopColor={publisher.color || CHART_COLORS.SECONDARY} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={publisher.color || CHART_COLORS.SECONDARY} stopOpacity={0.5} />
                </linearGradient>
              </React.Fragment>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={BORDER_COLORS.GRID} />
          <XAxis
            dataKey="date"
            axisLine={true}
            tickLine={true}
            tick={{ fill: TEXT_COLORS.SECONDARY, fontSize: 12 }}
            padding={{ left: 10, right: 10 }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(value) => `${value}%`}
            axisLine={true}
            tickLine={true}
            tick={{ fill: TEXT_COLORS.SECONDARY, fontSize: 12 }}
          />
          <Tooltip
            content={(props) => {
              const { active, payload } = props;

              if (active && payload && payload.length) {
                const date = payload[0]?.payload?.date;
                return (
                  <div className="rounded-lg bg-white p-3 shadow-lg">
                    <p className="text-xs font-medium text-gray-500 mb-2">{date}</p>
                    <div className="flex flex-col gap-1.5">
                      {showAggregate && payload.find((p) => p.dataKey === 'value') && (
                        <div 
                          className={`flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded ${!selectedPublisher ? 'bg-gray-50' : ''}`}
                          onClick={() => {
                            setSelectedPublisher(null);
                            setFrontPublisherId(null);
                          }}
                        >
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.PRIMARY }}></span>
                          <p className="text-xs">Aggregate: {payload.find((p) => p.dataKey === 'value')?.value?.toLocaleString() || '0'}%</p>
                        </div>
                      )}
                      {publisherDataList.map((publisher, index) => {
                        const dataKey = `publisher_${publisher.id || index}`;
                        const value = payload.find((p) => p.dataKey === dataKey)?.value;
                        if (value !== undefined) {
                          return (
                            <div 
                              key={dataKey} 
                              className={`flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded ${selectedPublisher?.id === publisher.id ? 'bg-gray-50' : ''}`}
                              onClick={() => {
                                const actualPublisher = selectedPublishers.find(p => p.id === publisher.id);
                                if (actualPublisher) {
                                  setSelectedPublisher(actualPublisher);
                                  setFrontPublisherId(publisher.id || null);
                                }
                              }}
                            >
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: publisher.color || CHART_COLORS.SECONDARY }}></span>
                              <p className="text-xs">{publisher.name}: {value?.toLocaleString()}%</p>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          {/* Aggregate data */}
          {showAggregate && (
            <Area
              type="monotone"
              dataKey="value"
              fill={frontPublisherId === null && selectedPublisher === null ? "url(#selectedBarGradient)" : "url(#barGradient)"}
              stroke="#4ECDC4"
              strokeWidth={frontPublisherId === null && selectedPublisher === null ? 4 : 2}
              strokeDasharray={frontPublisherId === null && selectedPublisher === null ? '' : undefined}
              dot={false}
              activeDot={{
                r: 4,
                fill: '#4ECDC4',
                stroke: '#fff',
                strokeWidth: 2,
              }}
              animationDuration={450}
              animationEasing="ease-out"
              isAnimationActive={transitionPhase !== 'animating' && transitionPhase !== 'prepare'}
              name="Aggregate"
              style={{
                zIndex: frontPublisherId === null && selectedPublisher === null ? 10 : 1,
                opacity: frontPublisherId !== null || (selectedPublisher !== null && frontPublisherId !== null) ? 0.65 : 1
              }}
            />
          )}
          
          {/* Publisher data areas */}
          {publisherDataList.map((publisher, index) => {
            const dataKey = `publisher_${publisher.id || index}`;
            const isOnTop = frontPublisherId === publisher.id;
            return (
              <Area
                key={dataKey}
                type="monotone"
                dataKey={dataKey}
                fill={isOnTop ? `url(#selectedPublisherGradient-${publisher.id || index})` : `url(#publisherGradient-${publisher.id || index})`}
                stroke={publisher.color || '#3B82F6'}
                strokeWidth={isOnTop ? 4 : 2}
                strokeDasharray={isOnTop ? '' : undefined}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: publisher.color || '#3B82F6',
                  stroke: '#fff',
                  strokeWidth: 2,
                }}
                animationDuration={600}
                animationEasing="ease-out"
                isAnimationActive={transitionPhase !== 'animating'}
                name={publisher.name}
                style={{
                  zIndex: isOnTop ? 10 : 1,
                  opacity: frontPublisherId !== null && !isOnTop ? 0.65 : 1
                }}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
