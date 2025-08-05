import { PATTERN_OVERRIDES, BIN_PATTERNS } from '../config/patterns.js';
import { logger } from '../utils/logger.js';
export class PatternAnalyzer {
    analyze(summaries) {
        logger.info('Starting pattern analysis');
        let overrideCount = 0;
        let estimatedCount = 0;
        const analyzed = summaries.map(summary => {
            const pattern = this.detectPattern(summary);
            if (pattern.source === 'override')
                overrideCount++;
            else if (pattern.source === 'estimated')
                estimatedCount++;
            return { ...summary, binPattern: pattern };
        });
        logger.info('Pattern analysis complete', {
            total: summaries.length,
            overrides: overrideCount,
            estimated: estimatedCount
        });
        return analyzed;
    }
    detectPattern(summary) {
        // Check for manual overrides first
        const override = PATTERN_OVERRIDES.find(p => p.suburb === summary.suburb &&
            p.day === summary.collection.primaryDay &&
            (p.zone === summary.zones.primaryZone || p.zone === 'ANY'));
        if (override) {
            logger.debug(`Found pattern override for ${summary.suburb}`, { pattern: override.pattern });
            return {
                source: 'override',
                confidence: 1.0,
                pattern: override.pattern,
                notes: override.notes || 'Manually verified pattern'
            };
        }
        // For suburbs with single zone, use zone-based patterns
        if (summary.zones.distribution.length === 1) {
            const zone = summary.zones.primaryZone;
            const pattern = this.getZonePattern(zone);
            return {
                source: 'estimated',
                confidence: 0.6,
                pattern,
                notes: `Estimated based on ${zone} pattern`
            };
        }
        // For mixed zones, determine based on zone distribution
        if (summary.zones.distribution.length > 1) {
            return this.analyzeMixedZones(summary);
        }
        // Default fallback
        return {
            source: 'estimated',
            confidence: 0.3,
            pattern: 'MIXED',
            notes: 'Unable to determine pattern with confidence'
        };
    }
    getZonePattern(zone) {
        switch (zone) {
            case 'ZONE 1':
                return 'ZONE_1_DEFAULT';
            case 'ZONE 2':
                return 'ZONE_2_DEFAULT';
            default:
                return 'MIXED';
        }
    }
    analyzeMixedZones(summary) {
        const zones = summary.zones.distribution;
        // If one zone is dominant (> 80%), use its pattern
        const dominant = zones[0];
        if (dominant.percentage > 80) {
            const pattern = this.getZonePattern(dominant.zone);
            return {
                source: 'estimated',
                confidence: 0.5,
                pattern,
                notes: `Mixed zones - using dominant ${dominant.zone} pattern (${dominant.percentage}%)`
            };
        }
        // For roughly equal zones, confidence is very low
        return {
            source: 'estimated',
            confidence: 0.3,
            pattern: 'MIXED',
            notes: `Multiple zones with no clear majority (${zones.map(z => `${z.zone}: ${z.percentage}%`).join(', ')})`
        };
    }
    // Get human-readable pattern description
    getPatternDescription(pattern) {
        const patternDef = BIN_PATTERNS[pattern];
        return patternDef?.description || 'Unknown pattern';
    }
    // Get bin type for a given pattern and week
    getBinTypeForWeek(pattern, isEvenWeek) {
        const patternDef = BIN_PATTERNS[pattern];
        if (!patternDef)
            return 'UNKNOWN';
        return isEvenWeek ? patternDef.evenWeek : patternDef.oddWeek;
    }
}
//# sourceMappingURL=analyzer.js.map