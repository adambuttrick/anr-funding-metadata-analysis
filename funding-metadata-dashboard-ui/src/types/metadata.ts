import { MetadataPerformance } from '@/lib/metrics';

/**
 * Props for the MetadataFieldsCard component
 */
export interface MetadataFieldsCardProps {
  funderId?: string;
}

/**
 * Interface for metadata field display information
 */
export interface MetadataField {
  name: string;
  description: string;
  value: number;
  color: string;
}

/**
 * Interface for DOI assertion statistics
 */
export interface DoiAssertionStats {
  crossref: number;
  publisher: number;
  notAsserted: number;
}

/**
 * Props for the DoiAssertionPieChart component
 */
export interface DoiAssertionPieChartProps {
  doiAssertionStats: DoiAssertionStats;
}

/**
 * Interface for metadata content state
 */
export interface MetadataContent {
  metrics: MetadataPerformance | null;
  dataSource: string;
}

/**
 * Helper function to format percentage values
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}
