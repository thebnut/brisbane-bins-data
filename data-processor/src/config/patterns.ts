import type { PatternOverride } from '../types/index';

// Known pattern overrides based on verified data
export const PATTERN_OVERRIDES: PatternOverride[] = [
  {
    suburb: 'WEST END',
    zone: 'ZONE 1',
    day: 'THURSDAY',
    pattern: 'A',
    notes: 'Verified against council website - Green waste on even weeks'
  },
  {
    suburb: 'MORNINGSIDE',
    zone: 'ZONE 1', 
    day: 'TUESDAY',
    pattern: 'B',
    notes: 'Verified against council website - Recycling on even weeks'
  }
];

// Pattern definitions
export const BIN_PATTERNS = {
  'A': {
    description: 'Zone 1 Pattern A - Green on even weeks',
    evenWeek: 'GREEN',
    oddWeek: 'RECYCLING'
  },
  'B': {
    description: 'Zone 1 Pattern B - Recycling on even weeks', 
    evenWeek: 'RECYCLING',
    oddWeek: 'GREEN'
  },
  'ZONE_1_DEFAULT': {
    description: 'Default Zone 1 pattern',
    evenWeek: 'RECYCLING',
    oddWeek: 'GREEN'
  },
  'ZONE_2_DEFAULT': {
    description: 'Default Zone 2 pattern',
    evenWeek: 'GREEN',
    oddWeek: 'RECYCLING'
  },
  'MIXED': {
    description: 'Mixed zones - pattern uncertain',
    evenWeek: 'UNKNOWN',
    oddWeek: 'UNKNOWN'
  }
};