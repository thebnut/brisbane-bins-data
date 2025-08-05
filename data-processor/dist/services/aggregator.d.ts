import { PropertyCollection, SuburbSummary } from '../types/index.js';
export declare class SuburbAggregator {
    aggregate(properties: PropertyCollection[]): SuburbSummary[];
    private processSuburb;
    private calculateStats;
    private calculateCollectionInfo;
    private calculateZoneInfo;
    private assessDataQuality;
    private calculateCompleteness;
    private normalizeSuburbName;
}
//# sourceMappingURL=aggregator.d.ts.map