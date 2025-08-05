import { writeFile, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { OUTPUT_CONFIG } from '../config/constants.js';
import { logger } from '../utils/logger.js';
export class DataPublisher {
    async publish(summaries, outputDir) {
        const startTime = Date.now();
        // Ensure output directory exists
        await mkdir(outputDir, { recursive: true });
        const timestamp = new Date().toISOString();
        const dateStr = timestamp.split('T')[0];
        // Create metadata
        const metadata = {
            version: OUTPUT_CONFIG.VERSION,
            generated: timestamp,
            dataSource: OUTPUT_CONFIG.DATA_SOURCE,
            processingTime: process.uptime(),
            suburbCount: summaries.length,
            totalProperties: summaries.reduce((sum, s) => sum + s.stats.totalProperties, 0)
        };
        logger.info('Publishing data', {
            suburbs: metadata.suburbCount,
            properties: metadata.totalProperties
        });
        // Main data file
        const mainData = {
            metadata,
            suburbs: summaries
        };
        // Write versioned file
        const versionedFile = `suburbs-${dateStr}.json`;
        await this.writeJSON(join(outputDir, versionedFile), mainData);
        // Write latest file
        await this.writeJSON(join(outputDir, 'suburbs-latest.json'), mainData);
        // Write simplified lookup file for quick access
        const lookup = this.createLookupData(summaries);
        await this.writeJSON(join(outputDir, 'suburb-lookup.json'), lookup);
        // Write index file for GitHub Pages
        const indexData = await this.createIndexFile(outputDir, metadata, versionedFile);
        await this.writeJSON(join(outputDir, 'index.json'), indexData);
        // Write statistics file
        const stats = this.generateStatistics(summaries);
        await this.writeJSON(join(outputDir, 'statistics.json'), stats);
        const duration = (Date.now() - startTime) / 1000;
        logger.info(`Published ${summaries.length} suburbs in ${duration.toFixed(1)}s`);
    }
    async writeJSON(path, data) {
        const content = JSON.stringify(data, null, 2);
        await writeFile(path, content, 'utf-8');
        logger.debug(`Wrote ${path} (${(content.length / 1024).toFixed(1)} KB)`);
    }
    createLookupData(summaries) {
        const lookup = {};
        summaries.forEach(suburb => {
            lookup[suburb.suburb] = {
                day: suburb.collection.primaryDay,
                dayUniformity: suburb.collection.dayUniformity,
                zone: suburb.zones.primaryZone,
                zoneUniformity: suburb.zones.zoneUniformity,
                confidence: suburb.dataQuality.confidence,
                pattern: suburb.binPattern?.pattern || null
            };
        });
        return {
            generated: new Date().toISOString(),
            suburbs: lookup
        };
    }
    async createIndexFile(outputDir, metadata, currentFile) {
        // List existing versioned files
        const files = await readdir(outputDir);
        const versionedFiles = files
            .filter(f => f.match(/^suburbs-\d{4}-\d{2}-\d{2}\.json$/))
            .sort()
            .reverse()
            .slice(0, 7); // Keep last 7 versions
        return {
            metadata,
            current: currentFile,
            available: [
                'suburbs-latest.json',
                'suburb-lookup.json',
                'statistics.json',
                ...versionedFiles
            ],
            endpoints: {
                latest: 'suburbs-latest.json',
                lookup: 'suburb-lookup.json',
                statistics: 'statistics.json',
                versioned: versionedFiles
            }
        };
    }
    generateStatistics(summaries) {
        const stats = {
            generated: new Date().toISOString(),
            summary: {
                totalSuburbs: summaries.length,
                totalProperties: summaries.reduce((sum, s) => sum + s.stats.totalProperties, 0),
                averagePropertiesPerSuburb: 0,
                dataQuality: {
                    high: 0,
                    medium: 0,
                    low: 0
                },
                patterns: {
                    override: 0,
                    estimated: 0,
                    none: 0
                }
            },
            collectionDays: {},
            zones: {},
            warnings: []
        };
        // Calculate averages and counts
        stats.summary.averagePropertiesPerSuburb = Math.round(stats.summary.totalProperties / stats.summary.totalSuburbs);
        // Count by data quality
        summaries.forEach(suburb => {
            stats.summary.dataQuality[suburb.dataQuality.level]++;
            // Count patterns
            if (suburb.binPattern) {
                if (suburb.binPattern.source === 'override') {
                    stats.summary.patterns.override++;
                }
                else {
                    stats.summary.patterns.estimated++;
                }
            }
            else {
                stats.summary.patterns.none++;
            }
            // Count collection days
            const day = suburb.collection.primaryDay;
            stats.collectionDays[day] = (stats.collectionDays[day] || 0) + 1;
            // Count zones
            suburb.zones.distribution.forEach(zone => {
                const zoneName = zone.zone;
                stats.zones[zoneName] = (stats.zones[zoneName] || 0) + zone.count;
            });
            // Collect warnings
            if (suburb.dataQuality.warnings.length > 0) {
                stats.warnings.push(`${suburb.suburb}: ${suburb.dataQuality.warnings.join(', ')}`);
            }
        });
        // Limit warnings to top 10
        stats.warnings = stats.warnings.slice(0, 10);
        return stats;
    }
}
//# sourceMappingURL=publisher.js.map