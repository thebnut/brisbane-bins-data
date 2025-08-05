import { SuburbSummary } from '../types/index.js';
export declare class PatternAnalyzer {
    analyze(summaries: SuburbSummary[]): SuburbSummary[];
    private detectPattern;
    private getZonePattern;
    private analyzeMixedZones;
    getPatternDescription(pattern: string): string;
    getBinTypeForWeek(pattern: string, isEvenWeek: boolean): string;
}
//# sourceMappingURL=analyzer.d.ts.map