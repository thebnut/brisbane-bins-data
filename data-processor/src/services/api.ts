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

  async fetchAllCollectionDays(): Promise<PropertyCollection[]> {
    const dataset = API_CONFIG.DATASETS.COLLECTION_DAYS;
    const results: PropertyCollection[] = [];
    let offset = 0;
    let totalCount = 0;
    const startTime = Date.now();

    logger.info('Starting to fetch collection days data');

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
        
        // Map API response to our type
        const batch = data.results.map((record: any) => this.mapToPropertyCollection(record));
        results.push(...batch);
        
        offset += API_CONFIG.BATCH_SIZE;

        logger.info(`Fetched ${results.length}/${totalCount} records (${Math.round(results.length / totalCount * 100)}%)`);

        // Rate limiting - pause between requests
        if (offset < totalCount) {
          await delay(API_CONFIG.RATE_LIMIT_DELAY);
        }
      } catch (error) {
        logger.error(`Failed to fetch batch at offset ${offset}`, { error });
        throw new Error(`API fetch failed at offset ${offset}: ${error}`);
      }
    } while (offset < totalCount);

    const duration = (Date.now() - startTime) / 1000;
    logger.info(`Completed fetching ${results.length} records in ${duration.toFixed(1)}s`);

    return results;
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