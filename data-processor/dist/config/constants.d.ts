export declare const API_CONFIG: {
    BASE_URL: string;
    DATASETS: {
        COLLECTION_DAYS: string;
        COLLECTION_WEEKS: string;
    };
    BATCH_SIZE: number;
    MAX_RETRIES: number;
    RETRY_DELAY: number;
    REQUEST_TIMEOUT: number;
    RATE_LIMIT_DELAY: number;
};
export declare const DATA_QUALITY_THRESHOLDS: {
    HIGH: {
        dayUniformity: number;
        zoneCount: number;
        minProperties: number;
    };
    MEDIUM: {
        dayUniformity: number;
        zoneUniformity: number;
        minProperties: number;
    };
};
export declare const OUTPUT_CONFIG: {
    VERSION: string;
    DATA_SOURCE: string;
    TIMEZONE: string;
};
//# sourceMappingURL=constants.d.ts.map