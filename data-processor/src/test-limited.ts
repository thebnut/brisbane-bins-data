import { BrisbaneCityAPI } from './services/api';
import { SuburbAggregator } from './services/aggregator';
import { PatternAnalyzer } from './services/analyzer';
import { DataPublisher } from './services/publisher';
import { logger } from './utils/logger';

async function testProcessor() {
  logger.info('Brisbane Bins Data Processor - Test Run');

  try {
    const api = new BrisbaneCityAPI();
    const aggregator = new SuburbAggregator();
    const analyzer = new PatternAnalyzer();
    const publisher = new DataPublisher();

    // Test connection
    logger.info('Testing API connection...');
    const connected = await api.testConnection();
    if (!connected) {
      throw new Error('Failed to connect to Brisbane City Council API');
    }

    // Fetch limited data for testing (modify API to limit)
    logger.info('Fetching limited data for test...');
    
    // Manually fetch first 1000 records only
    const results = [];
    for (let offset = 0; offset < 1000; offset += 100) {
      const response = await fetch(
        `https://www.data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/waste-collection-days-collection-days/records?limit=100&offset=${offset}`
      );
      const data = await response.json();
      results.push(...data.results);
    }

    logger.info(`Fetched ${results.length} test records`);

    // Process the limited data
    const properties = results.map((record: any) => ({
      property_id: record.property_id || '',
      suburb: record.suburb || '',
      street_name: record.street_name || '',
      day_of_week: record.collection_day || record.day_of_week || '',
      zone: record.zone || ''
    }));

    // Aggregate
    logger.info('Aggregating data by suburb...');
    const suburbs = aggregator.aggregate(properties);
    logger.info(`Aggregated into ${suburbs.length} suburbs`);

    // Analyze patterns
    logger.info('Analyzing patterns...');
    const analyzed = analyzer.analyze(suburbs);

    // Publish (dry run)
    logger.info('Publishing test data...');
    await publisher.publish(analyzed, '../data-test');

    logger.info('Test completed successfully!');
  } catch (error) {
    logger.error('Test failed', { error });
    process.exit(1);
  }
}

testProcessor();
