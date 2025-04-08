const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface FunderAttributes {
  name: string;
  funder_doi: string;
  ror_id: string;
}

export interface PublisherAttributes {
  name: string;
  member_id: string;
}

export interface AwardAttributes {
  code: string;
  grant_doi: string | null;
}

export interface StatsBreakdown {
  count: number;
  percentage: number;
}

export interface MetadataStats {
  funder_doi_asserted_by: {
    crossref: StatsBreakdown;
    publisher: StatsBreakdown;
    not_asserted: StatsBreakdown;
  };
  has_funder_doi: {
    'true': StatsBreakdown;
    'false': StatsBreakdown;
  };
  award_code_in_awards: {
    'true': StatsBreakdown;
    'false': StatsBreakdown;
  };
  funder_name_in_funders: {
    'true': StatsBreakdown;
    'false': StatsBreakdown;
  };
}

export interface FunderPublisher {
  id: string;
  name: string;
  publication_count: number;
}

export interface Publication {
  id: string;
  title: string;
  created_year: string;
}

export interface PublisherBreakdown {
  id: string;
  name: string;
  count: number;
}

export interface Funder {
  id: string;
  type: 'funder';
  attributes: FunderAttributes;
  relationships: {
    publishers: FunderPublisher[];
  };
  stats: {
    aggregate: MetadataStats & {
      records_in_funder_data: number;
    };
    yearly: {
      [year: string]: MetadataStats;
    };
  };
}

export interface Publisher {
  id: string;
  type: 'publisher';
  attributes: PublisherAttributes;
  relationships: {
    publications: {
      total: number;
    };
  };
  stats: {
    by_funder: {
      [funderId: string]: {
        funder_name: string;
        aggregate: MetadataStats & {
          total_records: number;
        };
        yearly: {
          [year: string]: MetadataStats;
        };
      };
    };
  };
}

export interface Award {
  id: string;
  type: 'award';
  attributes: AwardAttributes;
  relationships: {
    funders: {
      id: string;
      name: string;
    }[];
    publications: Publication[];
  };
  stats: {
    publication_count: number;
    publisher_breakdown: PublisherBreakdown[];
    yearly: {
      [year: string]: {
        publication_count: number;
      };
    };
  };
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    timestamp: string;
  };
}

export const api = {
  async getFunders(): Promise<ApiResponse<Funder[]>> {
    const response = await fetch(`${API_BASE_URL}/funders`);
    if (!response.ok) throw new Error('Failed to fetch funders');
    return response.json();
  },

  async getFunderStats(funderId: string, startYear?: number, endYear?: number): Promise<ApiResponse<Funder>> {
    let url = `${API_BASE_URL}/funders/${funderId}/stats`;
    
    const params = new URLSearchParams();
    if (startYear) params.append('startYear', startYear.toString());
    if (endYear) params.append('endYear', endYear.toString());
    
    const queryString = params.toString();
    if (queryString) url = `${url}?${queryString}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch stats for funder ${funderId}`);
    return response.json();
  },

  async getFunderPublishers(funderId: string, startYear?: number, endYear?: number): Promise<ApiResponse<Publisher[]>> {
    let url = `${API_BASE_URL}/funders/${funderId}/publishers`;
    
    const params = new URLSearchParams();
    if (startYear) params.append('startYear', startYear.toString());
    if (endYear) params.append('endYear', endYear.toString());
    
    const queryString = params.toString();
    if (queryString) url = `${url}?${queryString}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch publishers for funder ${funderId}`);
    return response.json();
  },

  async getPublisherStats(publisherId: string, startYear?: number, endYear?: number): Promise<ApiResponse<Publisher>> {
    let url = `${API_BASE_URL}/publishers/${publisherId}/stats`;
    
    const params = new URLSearchParams();
    if (startYear) params.append('startYear', startYear.toString());
    if (endYear) params.append('endYear', endYear.toString());
    
    const queryString = params.toString();
    if (queryString) url = `${url}?${queryString}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch stats for publisher ${publisherId}`);
    return response.json();
  },

  async getPublisherAwards(publisherId: string, startYear?: number, endYear?: number): Promise<ApiResponse<Award[]>> {
    let url = `${API_BASE_URL}/publishers/${publisherId}/awards`;
    
    const params = new URLSearchParams();
    if (startYear) params.append('startYear', startYear.toString());
    if (endYear) params.append('endYear', endYear.toString());
    
    const queryString = params.toString();
    if (queryString) url = `${url}?${queryString}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch awards for publisher ${publisherId}`);
    return response.json();
  },

  async searchFunders(query: string, page: number = 1, limit: number = 50): Promise<ApiResponse<Funder[]>> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString()
    });
    
    const url = `${API_BASE_URL}/search/funders?${params.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 400) {
        throw new Error('Search query is required');
      }
      throw new Error('Failed to search funders');
    }
    
    return response.json();
  },

  async searchPublishers(query: string, page: number = 1, limit: number = 50): Promise<ApiResponse<Publisher[]>> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString()
    });
    
    const url = `${API_BASE_URL}/search/publishers?${params.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 400) {
        throw new Error('Search query is required');
      }
      throw new Error('Failed to search publishers');
    }
    
    return response.json();
  },

  async searchAwards(query: string, page: number = 1, limit: number = 50): Promise<ApiResponse<Award[]>> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString()
    });
    
    const url = `${API_BASE_URL}/search/awards?${params.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 400) {
        throw new Error('Search query is required');
      }
      throw new Error('Failed to search awards');
    }
    
    return response.json();
  }
};