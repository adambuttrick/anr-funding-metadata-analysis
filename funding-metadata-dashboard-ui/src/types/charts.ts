import { Publisher } from '@/lib/api';

export interface PublisherDataType {
  id?: string;
  name: string;
  data: Array<{
    date: string;
    value: number;
  }>;
  stats?: {
    peakDate?: string;
    amount?: number;
    change?: number;
  };
  color?: string;
}

export interface ChartCardProps {
  title: string;
  data: Array<{
    date: string;
    value: number;
  }>;
  stats?: {
    peakDate?: string;
    amount?: number;
    change?: number;
  };
  publisherData?: PublisherDataType;
  showPublisherSelector?: boolean;
}

export interface ChartVisualizationProps {
  displayData: Array<{date: string; value: number}>;
  publisherDataList: PublisherDataType[];
  showAggregate: boolean;
  frontPublisherId: string | null;
  selectedPublisher: Publisher | null;
  transitionPhase: 'idle' | 'prepare' | 'fade-out' | 'animating' | 'fade-in';
  setSelectedPublisher: (publisher: Publisher | null) => void;
  setFrontPublisherId: (id: string | null) => void;
  selectedPublishers: Publisher[];
}

export interface PublisherSelectorProps {
  publishers: Publisher[];
  selectedPublishers: Publisher[];
  publisherDataList: PublisherDataType[];
  showAggregate: boolean;
  loading: boolean;
  onPublisherSelect: (publisher: Publisher) => void;
  onRemovePublisher: (publisherId?: string) => void;
  onClearAll: () => void;
  onToggleAggregate: () => void;
  onSearch?: (searchTerm: string) => void;
}

export interface StatsTableProps {
  stats?: {
    peakDate?: string;
    amount?: number;
    change?: number;
  };
  publisherDataList: PublisherDataType[];
  showAggregate: boolean;
  selectedPublisher: Publisher | null;
  selectedPublishers: Publisher[];
  onPublisherSelect: (publisher: Publisher | null) => void;
  onRemovePublisher: (publisherId?: string) => void;
  setFrontPublisherId: (id: string | null) => void;
}
