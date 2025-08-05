import { SuburbSummary } from '../types/index.js';
export declare class DataPublisher {
    publish(summaries: SuburbSummary[], outputDir: string): Promise<void>;
    private writeJSON;
    private createLookupData;
    private createIndexFile;
    private generateStatistics;
}
//# sourceMappingURL=publisher.d.ts.map