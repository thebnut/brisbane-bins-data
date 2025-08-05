import axios from 'axios';
import type { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { API_CONFIG } from '../config/constants';
import { PropertyCollection } from '../types/index';
import { logger } from '../utils/logger';
import { delay } from '../utils/retry';

export class BrisbaneCityAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.REQUEST_TIMEOUT,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BrisbaneBins-DataProcessor/1.0'
      }
    });

    // Configure axios-retry
    axiosRetry(this.client, {
      retries: API_CONFIG.MAX_RETRIES,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               error.response?.status === 429 || // Rate limit
               error.response?.status === 503;    // Service unavailable
      },
      onRetry: (retryCount, error) => {
        logger.warn(`API retry attempt ${retryCount}`, {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        });
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('API request', {
          method: config.method,
          url: config.url,
          params: config.params
        });
        return config;
      },
      (error) => {
        logger.error('API request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('API response', {
          status: response.status,
          url: response.config.url,
          recordCount: response.data?.total_count
        });
        return response;
      },
      (error) => {
        logger.error('API response error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  async fetchSuburbList(): Promise<Array<{name: string, count: number}>> {
    const dataset = API_CONFIG.DATASETS.COLLECTION_DAYS;
    
    try {
      logger.info('Fetching list of suburbs from API');
      
      const response = await this.client.get(`/catalog/datasets/${dataset}/facets`, {
        params: {
          facet: 'suburb',
          limit: 1000, // Should be enough for all Brisbane suburbs
          timezone: 'Australia/Brisbane'
        }
      });

      const facets = response.data.facets.find((f: any) => f.name === 'suburb');
      if (!facets) {
        throw new Error('Suburb facet not found in API response');
      }

      const suburbs = facets.facets.map((item: any) => ({
        name: item.name,
        count: item.count
      })).sort((a: any, b: any) => b.count - a.count); // Sort by count descending

      logger.info(`Found ${suburbs.length} suburbs with ${suburbs.reduce((sum: number, s: any) => sum + s.count, 0)} total properties`);
      
      return suburbs;
    } catch (error) {
      logger.error('Failed to fetch suburb list', { error });
      throw error;
    }
  }

  async fetchSuburbData(suburb: string): Promise<PropertyCollection[]> {
    const dataset = API_CONFIG.DATASETS.COLLECTION_DAYS;
    const results: PropertyCollection[] = [];
    let offset = 0;
    let totalCount = 0;

    do {
      try {
        const response = await this.client.get(`/catalog/datasets/${dataset}/records`, {
          params: {
            where: `suburb="${suburb}"`,
            limit: API_CONFIG.BATCH_SIZE,
            offset,
            timezone: 'Australia/Brisbane'
          }
        });

        const data = response.data;
        totalCount = data.total_count;
        
        const batch = data.results.map((record: any) => this.mapToPropertyCollection(record));
        results.push(...batch);
        
        offset += API_CONFIG.BATCH_SIZE;

        if (offset < totalCount) {
          await delay(API_CONFIG.RATE_LIMIT_DELAY);
        }
      } catch (error) {
        logger.error(`Failed to fetch data for suburb ${suburb} at offset ${offset}`, { error });
        
        // If we hit the offset limit, try street-based approach
        if (offset >= 10000 && (error as any).response?.status === 400) {
          logger.warn(`Suburb ${suburb} has more than 10,000 records, switching to street-based fetching`);
          return await this.fetchLargeSuburbByStreets(suburb);
        }
        
        throw error;
      }
    } while (offset < totalCount);

    return results;
  }

  async fetchLargeSuburbByStreets(suburb: string): Promise<PropertyCollection[]> {
    const dataset = API_CONFIG.DATASETS.COLLECTION_DAYS;
    const results: PropertyCollection[] = [];
    
    try {
      // First get list of streets in this suburb
      const streetResponse = await this.client.get(`/catalog/datasets/${dataset}/facets`, {
        params: {
          facet: 'street_name',
          where: `suburb="${suburb}"`,
          limit: 1000,
          timezone: 'Australia/Brisbane'
        }
      });

      const streetFacet = streetResponse.data.facets.find((f: any) => f.name === 'street_name');
      if (!streetFacet) {
        throw new Error(`Street facet not found for suburb ${suburb}`);
      }

      const streets = streetFacet.facets.map((item: any) => item.name);
      logger.info(`Fetching ${suburb} by streets: ${streets.length} streets found`);

      // Fetch data for each street
      for (const street of streets) {
        const streetData = await this.fetchStreetData(suburb, street);
        results.push(...streetData);
        await delay(API_CONFIG.RATE_LIMIT_DELAY);
      }

      return results;
    } catch (error) {
      logger.error(`Failed to fetch large suburb ${suburb} by streets`, { error });
      throw error;
    }
  }

  async fetchStreetData(suburb: string, street: string): Promise<PropertyCollection[]> {
    const dataset = API_CONFIG.DATASETS.COLLECTION_DAYS;
    const results: PropertyCollection[] = [];
    let offset = 0;
    let totalCount = 0;

    do {
      try {
        const response = await this.client.get(`/catalog/datasets/${dataset}/records`, {
          params: {
            where: `suburb="${suburb}" AND street_name="${street}"`,
            limit: API_CONFIG.BATCH_SIZE,
            offset,
            timezone: 'Australia/Brisbane'
          }
        });

        const data = response.data;
        totalCount = data.total_count;
        
        const batch = data.results.map((record: any) => this.mapToPropertyCollection(record));
        results.push(...batch);
        
        offset += API_CONFIG.BATCH_SIZE;

        if (offset < totalCount) {
          await delay(API_CONFIG.RATE_LIMIT_DELAY);
        }
      } catch (error) {
        logger.error(`Failed to fetch data for ${street}, ${suburb} at offset ${offset}`, { error });
        throw error;
      }
    } while (offset < totalCount);

    return results;
  }

  async fetchAllCollectionDays(): Promise<PropertyCollection[]> {
    const results: PropertyCollection[] = [];
    const startTime = Date.now();
    const failedSuburbs: string[] = [];

    logger.info('Starting suburb-based collection days fetch');

    try {
      // First, get the list of all suburbs
      const suburbs = await this.fetchSuburbList();
      logger.info(`Processing ${suburbs.length} suburbs`);

      // Process suburbs one by one
      for (let i = 0; i < suburbs.length; i++) {
        const suburb = suburbs[i];
        
        try {
          logger.info(`Processing suburb ${i + 1}/${suburbs.length}: ${suburb.name} (${suburb.count} properties)`);
          
          const suburbData = await this.fetchSuburbData(suburb.name);
          results.push(...suburbData);
          
          logger.info(`Completed ${suburb.name}: ${suburbData.length} records fetched. Total: ${results.length}`);
          
          // Rate limiting between suburbs
          if (i < suburbs.length - 1) {
            await delay(API_CONFIG.RATE_LIMIT_DELAY * 2);
          }
        } catch (error) {
          logger.error(`Failed to process suburb ${suburb.name}`, { error });
          failedSuburbs.push(suburb.name);
          // Continue with next suburb instead of failing completely
        }
      }

      const duration = (Date.now() - startTime) / 1000;
      logger.info(`Completed fetching ${results.length} records in ${duration.toFixed(1)}s`);
      
      if (failedSuburbs.length > 0) {
        logger.warn(`Failed to fetch data for ${failedSuburbs.length} suburbs: ${failedSuburbs.join(', ')}`);
      }

      return results;
    } catch (error) {
      logger.error('Failed to fetch collection days data', { error });
      throw error;
    }
  }

  async fetchCollectionWeeks(): Promise<any[]> {
    const dataset = API_CONFIG.DATASETS.COLLECTION_WEEKS;
    const results: any[] = [];
    let offset = 0;
    let totalCount = 0;

    logger.info('Starting to fetch collection weeks data');

    do {
      try {
        const response = await this.client.get(`/catalog/datasets/${dataset}/records`, {
          params: {
            limit: API_CONFIG.BATCH_SIZE,
            offset,
            timezone: 'Australia/Brisbane'
          }
        });

        const data = response.data;
        totalCount = data.total_count;
        
        results.push(...data.results);
        offset += API_CONFIG.BATCH_SIZE;

        logger.info(`Fetched ${results.length}/${totalCount} week records`);

        // Rate limiting
        if (offset < totalCount) {
          await delay(API_CONFIG.RATE_LIMIT_DELAY);
        }
      } catch (error) {
        logger.error(`Failed to fetch weeks at offset ${offset}`, { error });
        // Collection weeks is optional, so we can continue without it
        logger.warn('Continuing without collection weeks data');
        break;
      }
    } while (offset < totalCount);

    return results;
  }

  private mapToPropertyCollection(record: any): PropertyCollection {
    return {
      property_id: record.property_id || '',
      suburb: record.suburb || '',
      street_name: record.street_name || '',
      day_of_week: record.collection_day || record.day_of_week || '',
      zone: record.zone || ''
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get(`/catalog/datasets/${API_CONFIG.DATASETS.COLLECTION_DAYS}/records`, {
        params: { limit: 1 }
      });
      
      logger.info('API connection test successful', {
        totalRecords: response.data.total_count
      });
      
      return true;
    } catch (error) {
      logger.error('API connection test failed', { error });
      return false;
    }
  }
}