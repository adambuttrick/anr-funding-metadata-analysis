import { MetadataPerformance } from '../lib/metrics';
import { Publisher, MetadataStats } from '../lib/api';

export interface PerformanceCardProps {
  funderId?: string;
}

export interface PerformanceCardContent {
  performance: MetadataPerformance;
  dataSource: string;
  publicationCount: number;
}

export interface PerformanceCardState {
  publisherData: Publisher | null;
  publisherLoading: boolean;
  previousContent: PerformanceCardContent | null;
  visualLoading: boolean;
}

export interface PublisherRelationship {
  id: string;
  publication_count: number;
  attributes?: {
    name: string;
  };
}

export interface FunderData {
  stats: {
    aggregate?: MetadataStats & {
      records_in_funder_data?: number;
    };
    yearly?: {
      [year: string]: MetadataStats;
    };
    by_publisher?: {
      [publisherId: string]: MetadataStats;
    };
  };
  relationships?: {
    publishers?: PublisherRelationship[];
  };
}

export type ComputePerformanceFunction = (
  data: FunderData | null,
  publisherData: Publisher | null,
  selectedPublisher: Publisher | null,
  funderId?: string,
  startYear?: number,
  endYear?: number
) => PerformanceCardContent | null;
