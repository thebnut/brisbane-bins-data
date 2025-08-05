import { PropertyCollection } from '../types/index.js';
export declare class BrisbaneCityAPI {
    private client;
    constructor();
    fetchAllCollectionDays(): Promise<PropertyCollection[]>;
    fetchCollectionWeeks(): Promise<any[]>;
    private mapToPropertyCollection;
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=api.d.ts.map