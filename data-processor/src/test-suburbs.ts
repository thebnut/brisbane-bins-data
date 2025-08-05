import { BrisbaneCityAPI } from './services/api';
import { logger } from './utils/logger';

async function testSuburbPagination() {
  const api = new BrisbaneCityAPI();
  
  try {
    // Test 1: Fetch suburb list
    logger.info('TEST 1: Fetching suburb list...');
    const suburbs = await api.fetchSuburbList();
    logger.info(`Found ${suburbs.length} suburbs`);
    
    // Show top 5 suburbs by property count
    logger.info('Top 5 suburbs by property count:');
    suburbs.slice(0, 5).forEach((s, i) => {
      logger.info(`  ${i + 1}. ${s.name}: ${s.count} properties`);
    });
    
    // Test 2: Fetch data for a small suburb
    const smallSuburb = suburbs.find(s => s.count < 1000 && s.count > 100);
    if (smallSuburb) {
      logger.info(`\nTEST 2: Fetching data for small suburb ${smallSuburb.name} (${smallSuburb.count} properties)...`);
      const data = await api.fetchSuburbData(smallSuburb.name);
      logger.info(`Fetched ${data.length} records for ${smallSuburb.name}`);
      
      // Show sample data
      if (data.length > 0) {
        logger.info('Sample record:', {
          property_id: data[0].property_id,
          suburb: data[0].suburb,
          street_name: data[0].street_name,
          day_of_week: data[0].day_of_week,
          zone: data[0].zone
        });
      }
    }
    
    // Test 3: Test the full fetch with just 3 suburbs
    logger.info('\nTEST 3: Testing full fetch with 3 suburbs...');
    const testSuburbs = suburbs.slice(0, 3);
    let totalRecords = 0;
    
    for (const suburb of testSuburbs) {
      logger.info(`Fetching ${suburb.name}...`);
      const data = await api.fetchSuburbData(suburb.name);
      totalRecords += data.length;
      logger.info(`  Fetched ${data.length} records`);
    }
    
    logger.info(`\nTotal records fetched: ${totalRecords}`);
    logger.info('Suburb pagination test completed successfully!');
    
  } catch (error) {
    logger.error('Test failed', { error });
    process.exit(1);
  }
}

// Run the test
testSuburbPagination();