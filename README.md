# Brisbane Bins Data Pipeline

This repository contains the data processing pipeline for Brisbane City Council's waste collection data. It aggregates property-level collection data into suburb-level summaries and publishes them via GitHub Pages.

## Overview

The pipeline:
1. Fetches property collection data from Brisbane City Council's Open Data API
2. Aggregates data by suburb with quality metrics
3. Analyzes patterns for bin type estimation
4. Publishes processed data to GitHub Pages

## Data Structure

### Output Files

- `suburbs-latest.json` - Latest processed suburb data
- `suburb-lookup.json` - Simplified lookup table
- `statistics.json` - Processing statistics
- `suburbs-YYYY-MM-DD.json` - Versioned data files

### Suburb Data Format

```json
{
  "suburb": "WEST END",
  "stats": {
    "totalProperties": 8019,
    "lastUpdated": "2025-08-05T16:00:00Z",
    "dataCompleteness": 100
  },
  "collection": {
    "primaryDay": "THURSDAY",
    "dayUniformity": 100,
    "schedule": [
      { "day": "THURSDAY", "count": 8019, "percentage": 100 }
    ]
  },
  "zones": {
    "distribution": [
      { "zone": "ZONE 1", "count": 8019, "percentage": 100 }
    ],
    "primaryZone": "ZONE 1",
    "zoneUniformity": 100
  },
  "dataQuality": {
    "level": "high",
    "confidence": 0.95,
    "warnings": [],
    "flags": []
  },
  "binPattern": {
    "source": "override",
    "confidence": 1.0,
    "pattern": "A",
    "notes": "Verified pattern"
  }
}
```

## Accessing the Data

### Via GitHub Pages

```
https://[username].github.io/brisbane-bins-data/suburbs-latest.json
https://[username].github.io/brisbane-bins-data/suburb-lookup.json
https://[username].github.io/brisbane-bins-data/statistics.json
```

### Via Raw GitHub

```
https://raw.githubusercontent.com/[username]/brisbane-bins-data/main/data/suburbs-latest.json
```

## Local Development

### Prerequisites

- Node.js 20+
- npm or yarn

### Setup

```bash
cd data-processor
npm install
```

### Running Locally

```bash
# Build TypeScript
npm run build

# Process data
npm run process -- --output=../data

# Validate output
npm run validate -- --input=../data/suburbs-latest.json

# Debug mode
npm run process -- --debug --output=../data
```

## GitHub Actions

The pipeline runs automatically every Sunday at 2:00 AM Brisbane time. You can also trigger it manually:

1. Go to Actions tab
2. Select "Update Brisbane Bins Suburb Data"
3. Click "Run workflow"
4. Optionally enable debug mode

## Pattern Overrides

Known bin collection patterns can be configured in `data-processor/src/config/patterns.ts`:

```typescript
export const PATTERN_OVERRIDES: PatternOverride[] = [
  {
    suburb: 'WEST END',
    zone: 'ZONE 1',
    day: 'THURSDAY',
    pattern: 'A',
    notes: 'Verified against council website'
  }
];
```

## Data Quality

Suburbs are classified into three quality levels:

- **High**: 99%+ properties on same day, single zone
- **Medium**: 95%+ properties on same day
- **Low**: < 95% uniformity or small sample size

## Contributing

To add or update pattern overrides:

1. Fork this repository
2. Update `patterns.ts` with verified patterns
3. Submit a pull request with evidence (screenshots, council website links)

## License

MIT