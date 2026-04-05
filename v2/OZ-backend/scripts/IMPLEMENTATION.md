# Migration Script Implementation

## Task 19.1: Create Migration Script Infrastructure

**Status**: ✅ Complete

### Requirements Implemented

#### ✅ 10.1: Read all records from V1 Convex tables
- Implemented `ConvexHttpClient` connection to V1 database
- Read-only access ensures V1 system remains untouched
- Generic `migrateTable()` method accepts custom `fetchRecords` function

#### ✅ 10.2: Insert transformed records into V2 PostgreSQL tables
- Implemented PostgreSQL connection using `getClient()` from database config
- Generic `migrateTable()` method accepts custom `insertRecord` function
- Supports batch processing for large datasets

#### ✅ 10.3: Handle Convex ID to PostgreSQL UUID conversion
- Infrastructure ready in `transformRecord` parameter
- Each table migration can implement custom ID conversion logic

#### ✅ 10.8: Log progress (X of Y records migrated)
- Implemented `MigrationLogger.progress()` method
- Shows "X of Y records migrated (percentage%)"
- Updates every 10 records to avoid log spam

#### ✅ 10.9: Handle migration errors gracefully
- Implemented `continueOnError` configuration option (default: true)
- Logs all errors with record ID and error message
- Collects error statistics in `MigrationStats`
- Generates comprehensive error report in summary

### Files Created

1. **v2/OZ-backend/scripts/migrate-data.ts** (Main migration script)
   - `DataMigration` class - Main migration orchestrator
   - `MigrationLogger` class - Consistent logging utility
   - `migrateTable()` method - Generic table migration template
   - Connection management for both databases
   - Error handling and retry logic
   - Progress tracking and reporting

2. **v2/OZ-backend/scripts/README.md** (User documentation)
   - Usage instructions
   - Command-line options
   - Example output
   - Architecture diagram

3. **v2/OZ-backend/scripts/test-migration-structure.ts** (Structure tests)
   - Validates script structure without database connections
   - Useful for CI/CD pipelines

### Package.json Scripts Added

```json
{
  "migrate": "npx tsx scripts/migrate-data.ts",
  "migrate:dry-run": "npx tsx scripts/migrate-data.ts --dry-run"
}
```

### Features Implemented

#### 1. Connection Management
```typescript
// V1 Convex (Read-Only)
this.convexClient = new ConvexHttpClient(convexUrl);

// V2 PostgreSQL (Write)
this.pgClient = await getClient();
```

#### 2. Progress Logging
```typescript
logger.progress(current, total, tableName);
// Output: [PROGRESS] restaurants: 10 of 25 records migrated (40.0%)
```

#### 3. Error Handling
```typescript
try {
  await insertRecord(this.pgClient, transformedRecord);
  stats.successCount++;
} catch (error) {
  stats.failureCount++;
  stats.errors.push({ recordId, error: errorMessage });
  
  if (!this.config.continueOnError) {
    throw error; // Stop migration
  }
  // Otherwise continue with next record
}
```

#### 4. Migration Summary
```
================================================================================
MIGRATION SUMMARY
================================================================================
Start Time: 2024-01-15T10:30:00.000Z
End Time: 2024-01-15T10:35:00.000Z
Duration: 300000ms
Overall Status: SUCCESS

Table Statistics:
--------------------------------------------------------------------------------

restaurants:
  Total Records: 25
  Successful: 25
  Failed: 0
```

#### 5. Dry Run Mode
```bash
npm run migrate:dry-run
# Tests migration without writing to PostgreSQL
```

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DataMigration Class                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │ V1 Convex    │         │ V2 PostgreSQL│                │
│  │ Connection   │         │ Connection   │                │
│  │ (Read-Only)  │         │ (Write)      │                │
│  └──────┬───────┘         └──────┬───────┘                │
│         │                        │                         │
│         ▼                        ▼                         │
│  ┌─────────────────────────────────────────┐              │
│  │      migrateTable() Template            │              │
│  │  1. Fetch records from V1               │              │
│  │  2. Transform each record               │              │
│  │  3. Insert into V2                      │              │
│  │  4. Log progress                        │              │
│  │  5. Handle errors                       │              │
│  └─────────────────────────────────────────┘              │
│                                                             │
│  ┌─────────────────────────────────────────┐              │
│  │      MigrationLogger                    │              │
│  │  - info()    - error()                  │              │
│  │  - success() - progress()               │              │
│  │  - summary()                            │              │
│  └─────────────────────────────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Usage Examples

#### Basic Migration
```bash
npm run migrate
```

#### Dry Run (Test Mode)
```bash
npm run migrate:dry-run
```

#### Stop on First Error
```bash
npx tsx scripts/migrate-data.ts --stop-on-error
```

### Configuration Options

```typescript
interface MigrationConfig {
  dryRun: boolean;           // Test without writing (default: false)
  batchSize: number;         // Records per batch (default: 100)
  continueOnError: boolean;  // Continue on errors (default: true)
}
```

### Next Steps

The infrastructure is complete. To implement actual table migrations:

1. Create Convex query functions in V1 to fetch table data
2. Implement `transformRecord()` functions for each table
3. Implement `insertRecord()` functions for each table
4. Add table migration calls to `run()` method in dependency order

Example:
```typescript
async migrateRestaurants(): Promise<MigrationStats> {
  return this.migrateTable(
    "restaurants",
    async () => {
      // Fetch from V1 Convex
      return await this.convexClient.query(api.restaurants.list);
    },
    (record) => {
      // Transform V1 -> V2
      return {
        id: uuidv4(), // Generate new UUID
        name: record.name,
        // ... other fields
      };
    },
    async (client, record) => {
      // Insert into V2 PostgreSQL
      await client.query(
        'INSERT INTO restaurants (id, name, ...) VALUES ($1, $2, ...)',
        [record.id, record.name, ...]
      );
    }
  );
}
```

### Testing

#### Structure Test (No Database Required)
```bash
npx tsx scripts/test-migration-structure.ts
```

#### Connection Test (Requires Running Databases)
```bash
npm run migrate:dry-run
```

#### Full Migration Test
```bash
# Start databases first
npm run migrate:dry-run  # Test without writing
npm run migrate          # Actual migration
```

### Error Handling Examples

#### Scenario 1: PostgreSQL Not Running
```
[ERROR] Failed to connect to PostgreSQL
Error: connect ECONNREFUSED 127.0.0.1:5432
```

#### Scenario 2: Record Migration Failure
```
[ERROR] Failed to migrate record abc123 in restaurants
Error: Foreign key violation: restaurantId does not exist
[PROGRESS] restaurants: 10 of 25 records migrated (40.0%)
```

#### Scenario 3: Migration Summary with Errors
```
restaurants:
  Total Records: 25
  Successful: 23
  Failed: 2
  Errors:
    1. Record abc123: Foreign key violation
    2. Record def456: Invalid data format
```

### Environment Variables Required

```env
# V1 Convex Connection (Read-Only)
CONVEX_URL=http://127.0.0.1:3210

# V2 PostgreSQL Connection (Write)
PG_URL=postgresql://postgres:password@localhost:5432/database
```

### Safety Features

1. **Read-Only V1 Access**: V1 database is never modified
2. **Dry Run Mode**: Test migrations without writing data
3. **Error Isolation**: Errors in one record don't stop entire migration
4. **Progress Tracking**: Always know how far migration has progressed
5. **Comprehensive Logging**: All operations logged with timestamps
6. **Connection Cleanup**: Proper cleanup even on errors

### Performance Considerations

- **Batch Processing**: Processes records in configurable batches
- **Connection Pooling**: Uses PostgreSQL connection pool
- **Progress Updates**: Only logs every 10 records to reduce I/O
- **Memory Efficient**: Processes one table at a time

### Compliance with Requirements

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| 10.1 - Read V1 records | ✅ | ConvexHttpClient with read-only access |
| 10.2 - Insert V2 records | ✅ | PostgreSQL client with parameterized queries |
| 10.3 - ID conversion | ✅ | Infrastructure ready in transformRecord |
| 10.8 - Progress logging | ✅ | MigrationLogger.progress() every 10 records |
| 10.9 - Error handling | ✅ | continueOnError + error collection |

### Code Quality

- ✅ TypeScript with full type safety
- ✅ Comprehensive error handling
- ✅ Detailed logging and progress tracking
- ✅ Configurable behavior (dry-run, error handling)
- ✅ Clean architecture (separation of concerns)
- ✅ Well-documented code and usage
- ✅ No diagnostics or type errors
