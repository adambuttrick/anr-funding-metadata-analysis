import { Funder, Publisher, MetadataStats } from './api';

export interface YearlyChartData {
  date: string;
  value: number;
}

export interface MetadataPerformance {
  overall: number;
  totalRecords: number;
  breakdown: {
    funderDoi: number;
    awardCode: number;
    funderName: number;
    doiAssertion: {
      crossref: number;
      publisher: number;
      notAsserted: number;
      total: number;
    };
  };
}

export function calculateMetadataPerformance(stats: MetadataStats): MetadataPerformance {
  const funderDoi = stats.has_funder_doi['true'].percentage;
  const awardCode = stats.award_code_in_awards['true'].percentage;
  const funderName = stats.funder_name_in_funders['true'].percentage;
  
  const doiAssertion = {
    crossref: stats.funder_doi_asserted_by.crossref.percentage,
    publisher: stats.funder_doi_asserted_by.publisher.percentage,
    notAsserted: stats.funder_doi_asserted_by.not_asserted.percentage,
    total: stats.funder_doi_asserted_by.crossref.percentage + 
           stats.funder_doi_asserted_by.publisher.percentage
  };

  const overall = Math.round(
    (funderDoi + awardCode) / 2
  );

  const totalRecords = stats.has_funder_doi['true'].count + 
                      stats.has_funder_doi['false'].count;

  return {
    overall,
    totalRecords,
    breakdown: {
      funderDoi,
      awardCode,
      funderName,
      doiAssertion
    }
  };
}

export function calculateMetadataPerformanceForDateRange(stats: { [year: string]: MetadataStats }, startYear: number, endYear: number): MetadataStats {
  const yearsInRange = Object.keys(stats)
    .filter(year => {
      const yearNum = parseInt(year, 10);
      return yearNum >= startYear && yearNum <= endYear;
    });
  
  if (yearsInRange.length === 0) {
    return {
      funder_doi_asserted_by: {
        crossref: { count: 0, percentage: 0 },
        publisher: { count: 0, percentage: 0 },
        not_asserted: { count: 0, percentage: 0 }
      },
      has_funder_doi: {
        'true': { count: 0, percentage: 0 },
        'false': { count: 0, percentage: 0 }
      },
      award_code_in_awards: {
        'true': { count: 0, percentage: 0 },
        'false': { count: 0, percentage: 0 }
      },
      funder_name_in_funders: {
        'true': { count: 0, percentage: 0 },
        'false': { count: 0, percentage: 0 }
      }
    };
  }
  
  const aggregatedStats: MetadataStats = {
    funder_doi_asserted_by: {
      crossref: { count: 0, percentage: 0 },
      publisher: { count: 0, percentage: 0 },
      not_asserted: { count: 0, percentage: 0 }
    },
    has_funder_doi: {
      'true': { count: 0, percentage: 0 },
      'false': { count: 0, percentage: 0 }
    },
    award_code_in_awards: {
      'true': { count: 0, percentage: 0 },
      'false': { count: 0, percentage: 0 }
    },
    funder_name_in_funders: {
      'true': { count: 0, percentage: 0 },
      'false': { count: 0, percentage: 0 }
    }
  };
  
  yearsInRange.forEach(year => {
    const yearStats = stats[year];
    
    aggregatedStats.funder_doi_asserted_by.crossref.count += yearStats.funder_doi_asserted_by.crossref.count;
    aggregatedStats.funder_doi_asserted_by.publisher.count += yearStats.funder_doi_asserted_by.publisher.count;
    aggregatedStats.funder_doi_asserted_by.not_asserted.count += yearStats.funder_doi_asserted_by.not_asserted.count;
    
    aggregatedStats.has_funder_doi['true'].count += yearStats.has_funder_doi['true'].count;
    aggregatedStats.has_funder_doi['false'].count += yearStats.has_funder_doi['false'].count;
    
    aggregatedStats.award_code_in_awards['true'].count += yearStats.award_code_in_awards['true'].count;
    aggregatedStats.award_code_in_awards['false'].count += yearStats.award_code_in_awards['false'].count;
    
    aggregatedStats.funder_name_in_funders['true'].count += yearStats.funder_name_in_funders['true'].count;
    aggregatedStats.funder_name_in_funders['false'].count += yearStats.funder_name_in_funders['false'].count;
  });
  
  const totalDoiAssertions = aggregatedStats.funder_doi_asserted_by.crossref.count +
                           aggregatedStats.funder_doi_asserted_by.publisher.count +
                           aggregatedStats.funder_doi_asserted_by.not_asserted.count;
  
  if (totalDoiAssertions > 0) {
    aggregatedStats.funder_doi_asserted_by.crossref.percentage = Math.round((aggregatedStats.funder_doi_asserted_by.crossref.count / totalDoiAssertions) * 100);
    aggregatedStats.funder_doi_asserted_by.publisher.percentage = Math.round((aggregatedStats.funder_doi_asserted_by.publisher.count / totalDoiAssertions) * 100);
    aggregatedStats.funder_doi_asserted_by.not_asserted.percentage = Math.round((aggregatedStats.funder_doi_asserted_by.not_asserted.count / totalDoiAssertions) * 100);
  }
  
  const totalFunderDoi = aggregatedStats.has_funder_doi['true'].count + aggregatedStats.has_funder_doi['false'].count;
  if (totalFunderDoi > 0) {
    aggregatedStats.has_funder_doi['true'].percentage = Math.round((aggregatedStats.has_funder_doi['true'].count / totalFunderDoi) * 100);
    aggregatedStats.has_funder_doi['false'].percentage = Math.round((aggregatedStats.has_funder_doi['false'].count / totalFunderDoi) * 100);
  }
  
  const totalAwardCode = aggregatedStats.award_code_in_awards['true'].count + aggregatedStats.award_code_in_awards['false'].count;
  if (totalAwardCode > 0) {
    aggregatedStats.award_code_in_awards['true'].percentage = Math.round((aggregatedStats.award_code_in_awards['true'].count / totalAwardCode) * 100);
    aggregatedStats.award_code_in_awards['false'].percentage = Math.round((aggregatedStats.award_code_in_awards['false'].count / totalAwardCode) * 100);
  }
  
  const totalFunderName = aggregatedStats.funder_name_in_funders['true'].count + aggregatedStats.funder_name_in_funders['false'].count;
  if (totalFunderName > 0) {
    aggregatedStats.funder_name_in_funders['true'].percentage = Math.round((aggregatedStats.funder_name_in_funders['true'].count / totalFunderName) * 100);
    aggregatedStats.funder_name_in_funders['false'].percentage = Math.round((aggregatedStats.funder_name_in_funders['false'].count / totalFunderName) * 100);
  }
  
  return aggregatedStats;
}


export function processYearlyStats(funder: Funder, startYear?: number, endYear?: number): {
  chartData: YearlyChartData[];
  stats: {
    peakDate: string;
    amount: number;
    change: number;
  };
} {
  let years = Object.keys(funder.stats.yearly).sort();
  
  if (startYear !== undefined && endYear !== undefined) {
    years = years.filter(year => {
      const yearNum = parseInt(year, 10);
      return yearNum >= startYear && yearNum <= endYear;
    });
  }
  
  const chartData = years.map(year => {
    const yearStats = funder.stats.yearly[year];
    const performance = calculateMetadataPerformance(yearStats);
    
    return {
      date: year,
      value: performance.overall
    };
  });
  
  let peakValue = 0;
  let peakYear = '';
  
  chartData.forEach(item => {
    if (item.value > peakValue) {
      peakValue = item.value;
      peakYear = item.date;
    }
  });
  
  const firstYear = chartData[0]?.value || 0;
  const lastYear = chartData[chartData.length - 1]?.value || 0;
  const change = lastYear - firstYear;
  
  return {
    chartData,
    stats: {
      peakDate: peakYear,
      amount: peakValue,
      change: change > 0 ? change : 0
    }
  };
}


export function calculatePublisherMetadataPerformance(
  publisher: Publisher,
  funderId?: string,
  startYear?: number,
  endYear?: number
): MetadataPerformance | null {
  if (!funderId) {
    const funderIds = Object.keys(publisher.stats.by_funder);
    if (funderIds.length === 0) return null;
    funderId = funderIds[0];
  }

  if (!publisher.stats.by_funder[funderId]) return null;

  if (publisher.stats.by_funder[funderId].yearly && 
      Object.keys(publisher.stats.by_funder[funderId].yearly).length > 0 && 
      startYear !== undefined && 
      endYear !== undefined) {
    const rangeStats = calculateMetadataPerformanceForDateRange(
      publisher.stats.by_funder[funderId].yearly, 
      startYear, 
      endYear
    );
    return calculateMetadataPerformance(rangeStats);
  } else {
    const stats = publisher.stats.by_funder[funderId].aggregate;
    return calculateMetadataPerformance(stats);
  }
}

export function getPublisherAggregateStats(
  publisher: Publisher,
  startYear?: number,
  endYear?: number
): MetadataPerformance | null {
  const funderIds = Object.keys(publisher.stats.by_funder);
  if (funderIds.length === 0) return null;

  let totalRecords = 0;
  let weightedFunderDoi = 0;
  let weightedAwardCode = 0;
  let weightedFunderName = 0;
  let weightedCrossref = 0;
  let weightedPublisher = 0;
  let weightedNotAsserted = 0;

  funderIds.forEach(funderId => {
    let funderPerformance;
    if (publisher.stats.by_funder[funderId].yearly && 
        Object.keys(publisher.stats.by_funder[funderId].yearly).length > 0 && 
        startYear !== undefined && 
        endYear !== undefined) {
      const rangeStats = calculateMetadataPerformanceForDateRange(
        publisher.stats.by_funder[funderId].yearly, 
        startYear, 
        endYear
      );
      funderPerformance = calculateMetadataPerformance(rangeStats);
    } else {
      const funderStats = publisher.stats.by_funder[funderId].aggregate;
      funderPerformance = calculateMetadataPerformance(funderStats);
    }
    
    const records = funderPerformance.totalRecords;
    
    totalRecords += records;
    weightedFunderDoi += funderPerformance.breakdown.funderDoi * records;
    weightedAwardCode += funderPerformance.breakdown.awardCode * records;
    weightedFunderName += funderPerformance.breakdown.funderName * records;
    weightedCrossref += funderPerformance.breakdown.doiAssertion.crossref * records;
    weightedPublisher += funderPerformance.breakdown.doiAssertion.publisher * records;
    weightedNotAsserted += funderPerformance.breakdown.doiAssertion.notAsserted * records;
  });

  if (totalRecords === 0) return null;

  const funderDoi = weightedFunderDoi / totalRecords;
  const awardCode = weightedAwardCode / totalRecords;
  const funderName = weightedFunderName / totalRecords;
  const crossref = weightedCrossref / totalRecords;
  const publisherAsserted = weightedPublisher / totalRecords;
  const notAsserted = weightedNotAsserted / totalRecords;

  const overall = Math.round((funderDoi + awardCode) / 2);

  return {
    overall,
    totalRecords,
    breakdown: {
      funderDoi,
      awardCode,
      funderName,
      doiAssertion: {
        crossref,
        publisher: publisherAsserted,
        notAsserted,
        total: crossref + publisherAsserted
      }
    }
  };
}

export function processPublisherYearlyStats(publisher: Publisher, startYear?: number, endYear?: number): {
  chartData: YearlyChartData[];
  stats: {
    peakDate: string;
    amount: number;
    change: number;
  };
} {

  const funderIds = Object.keys(publisher.stats.by_funder);
  
  if (funderIds.length === 0) {
    return {
      chartData: [],
      stats: {
        peakDate: '',
        amount: 0,
        change: 0
      }
    };
  }
  
  const allYears = new Set<string>();
  funderIds.forEach(funderId => {
    const funderYears = Object.keys(publisher.stats.by_funder[funderId].yearly);
    funderYears.forEach(year => allYears.add(year));
  });
  
  let years = Array.from(allYears).sort();
  
  if (startYear !== undefined && endYear !== undefined) {
    years = years.filter(year => {
      const yearNum = parseInt(year, 10);
      return yearNum >= startYear && yearNum <= endYear;
    });
  }
  
  const chartData = years.map(year => {
    const yearScores = funderIds
      .filter(funderId => publisher.stats.by_funder[funderId].yearly[year])
      .map(funderId => {
        const yearStats = publisher.stats.by_funder[funderId].yearly[year];
        const performance = calculateMetadataPerformance(yearStats);
        return performance.overall;
      });
    
    const averageCompleteness = yearScores.length > 0
      ? yearScores.reduce((sum, score) => sum + score, 0) / yearScores.length
      : 0;
    
    return {
      date: year,
      value: Math.round(averageCompleteness)
    };
  });
  
  let peakValue = 0;
  let peakYear = '';
  
  chartData.forEach(item => {
    if (item.value > peakValue) {
      peakValue = item.value;
      peakYear = item.date;
    }
  });
  
  const firstYear = chartData[0]?.value || 0;
  const lastYear = chartData[chartData.length - 1]?.value || 0;
  const change = lastYear - firstYear;
  
  return {
    chartData,
    stats: {
      peakDate: peakYear,
      amount: peakValue,
      change: change > 0 ? change : 0
    }
  };
}