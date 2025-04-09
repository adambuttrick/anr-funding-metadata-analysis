'use client';

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { StatsTableProps } from '@/types/charts';

export function StatsTable({
  stats,
  publisherDataList,
  showAggregate,
  selectedPublisher,
  selectedPublishers,
  onPublisherSelect,
  onRemovePublisher,
  setFrontPublisherId
}: StatsTableProps) {
  if (!stats && !publisherDataList.some(p => p.stats)) {
    return null;
  }

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      {/* Stats table with headers */}
      <div className="w-full rounded-lg overflow-hidden shadow-sm">
        <div className="max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          <table className="w-full border-collapse bg-white">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="w-1/3 text-left px-4 py-3 text-sm font-medium text-gray-600">Publisher</th>
                <th className="w-1/5 text-left text-sm font-medium text-gray-600 px-4 py-3">Peak date</th>
                <th className="w-1/5 text-left text-sm font-medium text-gray-600 px-4 py-3">Peak amount</th>
                <th className="w-1/5 text-left text-sm font-medium text-gray-600 px-4 py-3">Raise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Aggregate data row */}
              {showAggregate && stats && (
                <tr
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${!selectedPublisher ? 'bg-gray-50' : ''}`}
                  onClick={() => {
                    onPublisherSelect(null);
                    setFrontPublisherId(null);
                  }}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="group relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemovePublisher();
                          }}
                          className="text-gray-400 hover:text-gray-700 transition-colors"
                          aria-label="Remove aggregate data"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                          Remove aggregate
                        </span>
                      </div>
                      <span className="min-w-3 h-3 rounded-full bg-[#4ECDC4]"></span>
                      <span className="text-sm font-medium">Aggregate</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-base font-medium">{stats?.peakDate}</td>
                  <td className="py-4 px-4 text-base font-medium">{stats?.amount?.toLocaleString()}%</td>
                  <td className="py-4 px-4">
                    <div className="inline-flex items-center justify-center rounded-full bg-[#4ECDC4]/20 text-[#008080] px-4 py-1.5 text-sm font-medium">
                      +{stats?.change?.toLocaleString()} / +{((stats?.change || 0) / (stats?.amount || 1) * 100).toFixed(1)}%
                    </div>
                  </td>
                </tr>
              )}

              {/* Publisher data rows */}
              {publisherDataList.map((publisher, index) => (
                publisher.stats && (
                  <tr
                    key={publisher.id || `publisher-${index}`}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedPublisher?.id === publisher.id ? 'bg-gray-50' : ''}`}
                    onClick={() => {
                      const actualPublisher = selectedPublishers.find(p => p.id === publisher.id);
                      if (actualPublisher) {
                        onPublisherSelect(actualPublisher);
                        setFrontPublisherId(publisher.id || null);
                      }
                    }}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="group relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemovePublisher(publisher.id);
                            }}
                            className="text-gray-400 hover:text-gray-700 transition-colors"
                            aria-label={`Remove ${publisher.name}`}
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                            Remove {publisher.name}
                          </span>
                        </div>
                        <span className="min-w-3 h-3 rounded-full" style={{ backgroundColor: publisher.color || '#3B82F6' }}></span>
                        <span className="text-sm font-medium truncate" style={{ color: publisher.color || '#3B82F6' }} title={publisher.name}>{publisher.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-base font-medium" style={{ color: publisher.color || '#3B82F6' }}>{publisher.stats.peakDate}</td>
                    <td className="py-4 px-4 text-base font-medium" style={{ color: publisher.color || '#3B82F6' }}>{publisher.stats.amount?.toLocaleString()}%</td>
                    <td className="py-4 px-4">
                      <div
                        className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-medium"
                        style={{
                          backgroundColor: `${publisher.color || '#3B82F6'}20`,
                          color: publisher.color || '#3B82F6'
                        }}
                      >
                        +{publisher.stats.change?.toLocaleString()} / +{((publisher.stats.change || 0) / (publisher.stats.amount || 1) * 100).toFixed(1)}%
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
