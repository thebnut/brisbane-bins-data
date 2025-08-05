import { Command } from 'commander';
import { BrisbaneCityAPI } from './services/api.js';
import { SuburbAggregator } from './services/aggregator.js';
import { PatternAnalyzer } from './services/analyzer.js';
import { DataPublisher } from './services/publisher.js';
import { logger } from './utils/logger.js';
const program = new Command();
program
    .name('brisbane-bins-processor')
    .description('Process Brisbane City Council waste collection data')
    .version('1.0.0')
    .option('-d, --debug', 'Enable debug logging')
    .option('-o, --output <path>', 'Output directory', '../data')
    .option('--dry-run', 'Run without saving files')
    .action(async (options) => {
    if (options.debug) {
        logger.level = 'debug';
    }
    logger.info('Brisbane Bins Data Processor starting', {
        debug: options.debug,
        output: options.output,
        dryRun: options.dryRun
    });
    const startTime = Date.now();
    try {
        // Initialize services
        const api = new BrisbaneCityAPI();
        const aggregator = new SuburbAggregator();
        const analyzer = new PatternAnalyzer();
        const publisher = new DataPublisher();
        // Test API connection
        logger.info('Testing API connection...');
        const connected = await api.testConnection();
        if (!connected) {
            throw new Error('Failed to connect to Brisbane City Council API');
        }
        // Fetch data
        logger.info('Fetching collection days data...');
        const properties = await api.fetchAllCollectionDays();
        logger.info(`Fetched ${properties.length} property records`);
        if (properties.length === 0) {
            throw new Error('No data received from API');
        }
        // Aggregate by suburb
        logger.info('Aggregating data by suburb...');
        const suburbs = aggregator.aggregate(properties);
        logger.info(`Aggregated into ${suburbs.length} suburbs`);
        // Analyze patterns
        logger.info('Analyzing bin collection patterns...');
        const analyzed = analyzer.analyze(suburbs);
        // Publish results
        if (!options.dryRun) {
            logger.info('Publishing processed data...');
            await publisher.publish(analyzed, options.output);
            logger.info('Data published successfully');
        }
        else {
            logger.info('Dry run - skipping file output');
        }
        const duration = (Date.now() - startTime) / 1000;
        logger.info(`Processing completed in ${duration.toFixed(1)}s`, {
            suburbs: analyzed.length,
            properties: properties.length
        });
        // Exit with success
        process.exit(0);
    }
    catch (error) {
        logger.error('Processing failed', { error: error instanceof Error ? error.message : error });
        process.exit(1);
    }
});
program.parse();
//# sourceMappingURL=index.js.map