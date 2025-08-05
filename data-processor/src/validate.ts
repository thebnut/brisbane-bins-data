import { readFile } from 'fs/promises';
import { z } from 'zod';
import { Command } from 'commander';
import { logger } from './utils/logger';

// Define schemas for validation
const DayStatsSchema = z.object({
  day: z.string(),
  count: z.number(),
  percentage: z.number()
});

const ZoneStatsSchema = z.object({
  zone: z.string(),
  count: z.number(),
  percentage: z.number()
});

const DataQualitySchema = z.object({
  level: z.enum(['high', 'medium', 'low']),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
  flags: z.array(z.string())
});

const BinPatternSchema = z.object({
  source: z.enum(['detected', 'override', 'estimated']),
  confidence: z.number().min(0).max(1),
  pattern: z.string(),
  notes: z.string()
}).nullable();

const SuburbSummarySchema = z.object({
  suburb: z.string(),
  stats: z.object({
    totalProperties: z.number(),
    lastUpdated: z.string(),
    dataCompleteness: z.number()
  }),
  collection: z.object({
    primaryDay: z.string(),
    dayUniformity: z.number(),
    schedule: z.array(DayStatsSchema)
  }),
  zones: z.object({
    distribution: z.array(ZoneStatsSchema),
    primaryZone: z.string(),
    zoneUniformity: z.number()
  }),
  dataQuality: DataQualitySchema,
  binPattern: BinPatternSchema
});

const ProcessedDataSchema = z.object({
  metadata: z.object({
    version: z.string(),
    generated: z.string(),
    dataSource: z.string(),
    processingTime: z.number(),
    suburbCount: z.number(),
    totalProperties: z.number()
  }),
  suburbs: z.array(SuburbSummarySchema)
});

const program = new Command();

program
  .name('validate')
  .description('Validate processed suburb data')
  .option('-i, --input <file>', 'Input JSON file to validate', '../data/suburbs-latest.json')
  .action(async (options) => {
    logger.info('Validating processed data', { file: options.input });

    try {
      // Read file
      const content = await readFile(options.input, 'utf-8');
      const data = JSON.parse(content);

      // Validate schema
      const result = ProcessedDataSchema.safeParse(data);

      if (!result.success) {
        logger.error('Validation failed', { errors: result.error.errors });
        process.exit(1);
      }

      // Additional validation checks
      const validatedData = result.data;
      const issues: string[] = [];

      // Check for suburbs with low data quality
      const lowQualitySuburbs = validatedData.suburbs.filter(s => s.dataQuality.level === 'low');
      if (lowQualitySuburbs.length > 0) {
        issues.push(`${lowQualitySuburbs.length} suburbs have low data quality`);
        lowQualitySuburbs.forEach(s => {
          logger.warn(`Low quality: ${s.suburb}`, {
            warnings: s.dataQuality.warnings
          });
        });
      }

      // Check for suburbs with no pattern
      const noPatternsSuburbs = validatedData.suburbs.filter(s => !s.binPattern);
      if (noPatternsSuburbs.length > 0) {
        issues.push(`${noPatternsSuburbs.length} suburbs have no bin pattern`);
      }

      // Check for data completeness
      const incompleteSuburbs = validatedData.suburbs.filter(s => s.stats.dataCompleteness < 90);
      if (incompleteSuburbs.length > 0) {
        issues.push(`${incompleteSuburbs.length} suburbs have < 90% data completeness`);
      }

      // Summary
      logger.info('Validation complete', {
        suburbs: validatedData.metadata.suburbCount,
        properties: validatedData.metadata.totalProperties,
        issues: issues.length
      });

      if (issues.length > 0) {
        logger.warn('Validation issues found', { issues });
      } else {
        logger.info('All validation checks passed');
      }

      process.exit(issues.length > 0 ? 1 : 0);
    } catch (error) {
      logger.error('Validation error', { error: error instanceof Error ? error.message : error });
      process.exit(1);
    }
  });

program.parse();