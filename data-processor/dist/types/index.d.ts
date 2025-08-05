export interface PropertyCollection {
    property_id: string;
    suburb: string;
    street_name: string;
    day_of_week: string;
    zone: string;
}
export interface DayStats {
    day: string;
    count: number;
    percentage: number;
}
export interface ZoneStats {
    zone: string;
    count: number;
    percentage: number;
}
export interface DataQuality {
    level: 'high' | 'medium' | 'low';
    confidence: number;
    warnings: string[];
    flags: string[];
}
export interface BinPattern {
    source: 'detected' | 'override' | 'estimated';
    confidence: number;
    pattern: string;
    notes: string;
}
export interface SuburbStats {
    totalProperties: number;
    lastUpdated: string;
    dataCompleteness: number;
}
export interface CollectionInfo {
    primaryDay: string;
    dayUniformity: number;
    schedule: DayStats[];
}
export interface ZoneInfo {
    distribution: ZoneStats[];
    primaryZone: string;
    zoneUniformity: number;
}
export interface SuburbSummary {
    suburb: string;
    stats: SuburbStats;
    collection: CollectionInfo;
    zones: ZoneInfo;
    dataQuality: DataQuality;
    binPattern: BinPattern | null;
}
export interface ProcessingMetadata {
    version: string;
    generated: string;
    dataSource: string;
    processingTime: number;
    suburbCount: number;
    totalProperties: number;
}
export interface ProcessedData {
    metadata: ProcessingMetadata;
    suburbs: SuburbSummary[];
}
export interface PatternOverride {
    suburb: string;
    zone: string;
    day: string;
    pattern: string;
    notes?: string;
}
//# sourceMappingURL=index.d.ts.map