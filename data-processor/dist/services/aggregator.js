import { DATA_QUALITY_THRESHOLDS } from '../config/constants.js';
import { logger } from '../utils/logger.js';
export class SuburbAggregator {
    aggregate(properties) {
        const suburbMap = new Map();
        // Group by suburb
        properties.forEach(property => {
            const suburb = this.normalizeSuburbName(property.suburb);
            if (!suburb) {
                logger.warn('Property with empty suburb name', { property });
                return;
            }
            if (!suburbMap.has(suburb)) {
                suburbMap.set(suburb, []);
            }
            suburbMap.get(suburb).push(property);
        });
        logger.info(`Processing ${suburbMap.size} suburbs`);
        // Process each suburb
        const summaries = [];
        let processedCount = 0;
        for (const [suburb, suburbProperties] of suburbMap) {
            try {
                const summary = this.processSuburb(suburb, suburbProperties);
                summaries.push(summary);
                processedCount++;
                if (processedCount % 50 === 0) {
                    logger.info(`Processed ${processedCount}/${suburbMap.size} suburbs`);
                }
            }
            catch (error) {
                logger.error(`Failed to process suburb ${suburb}`, { error, propertyCount: suburbProperties.length });
            }
        }
        logger.info(`Successfully processed ${summaries.length} suburbs`);
        return summaries.sort((a, b) => a.suburb.localeCompare(b.suburb));
    }
    processSuburb(suburb, properties) {
        const total = properties.length;
        // Calculate statistics
        const stats = this.calculateStats(properties);
        const collection = this.calculateCollectionInfo(properties);
        const zones = this.calculateZoneInfo(properties);
        const dataQuality = this.assessDataQuality(collection, zones, total);
        logger.debug(`Processed ${suburb}`, {
            properties: total,
            primaryDay: collection.primaryDay,
            dayUniformity: collection.dayUniformity,
            zones: zones.distribution.length
        });
        return {
            suburb,
            stats,
            collection,
            zones,
            dataQuality,
            binPattern: null // Will be set by pattern analyzer
        };
    }
    calculateStats(properties) {
        const total = properties.length;
        const completeness = this.calculateCompleteness(properties);
        return {
            totalProperties: total,
            lastUpdated: new Date().toISOString(),
            dataCompleteness: completeness
        };
    }
    calculateCollectionInfo(properties) {
        const dayCounts = new Map();
        properties.forEach(property => {
            const day = property.day_of_week.toUpperCase().trim();
            if (day) {
                dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
            }
        });
        const total = properties.length;
        const schedule = Array.from(dayCounts.entries())
            .map(([day, count]) => ({
            day,
            count,
            percentage: Math.round((count / total) * 1000) / 10 // Round to 1 decimal
        }))
            .sort((a, b) => b.count - a.count);
        const primary = schedule[0] || { day: 'UNKNOWN', count: 0, percentage: 0 };
        return {
            primaryDay: primary.day,
            dayUniformity: primary.percentage,
            schedule
        };
    }
    calculateZoneInfo(properties) {
        const zoneCounts = new Map();
        properties.forEach(property => {
            const zone = property.zone.toUpperCase().trim();
            if (zone) {
                zoneCounts.set(zone, (zoneCounts.get(zone) || 0) + 1);
            }
        });
        const total = properties.length;
        const distribution = Array.from(zoneCounts.entries())
            .map(([zone, count]) => ({
            zone,
            count,
            percentage: Math.round((count / total) * 1000) / 10 // Round to 1 decimal
        }))
            .sort((a, b) => b.count - a.count);
        const primary = distribution[0] || { zone: 'UNKNOWN', count: 0, percentage: 0 };
        return {
            distribution,
            primaryZone: primary.zone,
            zoneUniformity: primary.percentage
        };
    }
    assessDataQuality(collection, zones, total) {
        const warnings = [];
        const flags = [];
        // Check day uniformity
        if (collection.dayUniformity < DATA_QUALITY_THRESHOLDS.MEDIUM.dayUniformity) {
            warnings.push(`Multiple collection days detected (${collection.dayUniformity}% on ${collection.primaryDay})`);
            flags.push('MULTIPLE_DAYS');
        }
        // Check zone distribution
        if (zones.distribution.length > 1) {
            if (zones.zoneUniformity < DATA_QUALITY_THRESHOLDS.MEDIUM.zoneUniformity) {
                warnings.push(`Mixed zones with low uniformity (${zones.distribution.length} zones, ${zones.zoneUniformity}% in primary)`);
                flags.push('MIXED_ZONES_LOW_UNIFORMITY');
            }
            else {
                warnings.push(`Multiple zones detected (${zones.distribution.length} zones)`);
                flags.push('MIXED_ZONES');
            }
        }
        // Check data size
        if (total < DATA_QUALITY_THRESHOLDS.MEDIUM.minProperties) {
            warnings.push(`Small sample size (${total} properties)`);
            flags.push('SMALL_SAMPLE');
        }
        // Determine quality level
        let level;
        let confidence;
        const { HIGH, MEDIUM } = DATA_QUALITY_THRESHOLDS;
        if (collection.dayUniformity >= HIGH.dayUniformity &&
            zones.distribution.length <= HIGH.zoneCount &&
            total >= HIGH.minProperties) {
            level = 'high';
            confidence = 0.95;
        }
        else if (collection.dayUniformity >= MEDIUM.dayUniformity &&
            total >= MEDIUM.minProperties) {
            level = 'medium';
            confidence = 0.75;
        }
        else {
            level = 'low';
            confidence = 0.5;
        }
        // Adjust confidence for mixed zones
        if (zones.distribution.length > 1) {
            confidence *= (zones.zoneUniformity / 100);
        }
        return {
            level,
            confidence: Math.round(confidence * 100) / 100, // Round to 2 decimals
            warnings,
            flags
        };
    }
    calculateCompleteness(properties) {
        const requiredFields = [
            'property_id',
            'suburb',
            'day_of_week',
            'zone'
        ];
        let completeCount = 0;
        properties.forEach(property => {
            const isComplete = requiredFields.every(field => property[field] && property[field].toString().trim() !== '');
            if (isComplete)
                completeCount++;
        });
        return Math.round((completeCount / properties.length) * 1000) / 10; // Round to 1 decimal
    }
    normalizeSuburbName(suburb) {
        return suburb.toUpperCase().trim();
    }
}
//# sourceMappingURL=aggregator.js.map