export const API_CONFIG = {
    BASE_URL: 'https://www.data.brisbane.qld.gov.au/api/explore/v2.1',
    DATASETS: {
        COLLECTION_DAYS: 'waste-collection-days-collection-days',
        COLLECTION_WEEKS: 'waste-collection-days-collection-weeks'
    },
    BATCH_SIZE: 100,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    REQUEST_TIMEOUT: 30000,
    RATE_LIMIT_DELAY: 100
};
export const DATA_QUALITY_THRESHOLDS = {
    HIGH: {
        dayUniformity: 99,
        zoneCount: 1,
        minProperties: 100
    },
    MEDIUM: {
        dayUniformity: 95,
        zoneUniformity: 80,
        minProperties: 50
    }
};
export const OUTPUT_CONFIG = {
    VERSION: '2.0',
    DATA_SOURCE: 'Brisbane City Council Open Data',
    TIMEZONE: 'Australia/Brisbane'
};
//# sourceMappingURL=constants.js.map