export const CARD_BACKGROUND = '#E5F0F0';

export const CHART_COLORS = {
  PRIMARY: '#4ECDC4',
  SECONDARY: '#3B82F6',
  
  PUBLISHER_SERIES: [
    '#3B82F6',
    '#F97316',
    '#8B5CF6',
    '#EC4899',
    '#10B981',
    '#F59E0B',
    '#6366F1'
  ],
  
  GRADIENT: {
    START_OPACITY: 0.8,
    END_OPACITY: 0.2
  }
};

export const DOI_ASSERTION = {
  CROSSREF: CHART_COLORS.PUBLISHER_SERIES[0],    // blue-500
  PUBLISHER: CHART_COLORS.PUBLISHER_SERIES[4],   // emerald-500
  NOT_ASSERTED: '#f5f5f5'                        // gray-100
};

export const DOI_ASSERTED_BY = {
  CROSSREF: '#3B82F6',
  PUBLISHER: '#85b2f9',
  NOT_ASSERTED: '#f5f5f5'
};

export const TEXT_COLORS = {
  PRIMARY: '#000000',
  SECONDARY: '#8F8F8F',
  MUTED: '#9ca3af'
};

export const BORDER_COLORS = {
  DEFAULT: '#f5f5f5',
  GRID: '#f5f5f5'
};
