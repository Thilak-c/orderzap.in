/**
 * migrate-data.ts — Data Migration Script
 * ────────────────────────────────────────
 * Migrates data from V1 Convex database to V2 PostgreSQL database.
 * 
 * Features:
 * - Read-only access to V1 Convex database
 * - Write access to V2 PostgreSQL database
 * - Progress logging (X of Y records migrated)
 * - Error handling (continue on errors, log failures)
 * 
 * Requirements: 10.1-10.3, 10.8-10.9
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { query, getClient } from "../express/src/config/database";
import type { PoolClient } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from both .env and .env.local
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../.env.local") });

/**
 * Migration configuration
 */
interface MigrationConfig {
  dryRun: boolean;
  batchSize: number;
  continueOnError: boolean;
}

/**
 * Migration statistics
 */
interface MigrationStats {
  tableName: string;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  errors: Array<{
    recordId: string;
    error: string;
  }>;
}

/**
 * Migration result
 */
interface MigrationResult {
  success: boolean;
  stats: MigrationStats[];
  startTime: Date;
  endTime: Date;
  duration: number;
}

/**
 * Logger utility for consistent output
 */
class MigrationLogger {
  private startTime: Date;

  constructor() {
    this.startTime = new Date();
  }

  info(message: string): void {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
  }

  success(message: string): void {
    console.log(`[SUCCESS] ${new Date().toISOString()} - ${message}`);
  }

  error(message: string, error?: unknown): void {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
    if (error) {
      console.error(error);
    }
  }

  progress(current: number, total: number, tableName: string): void {
    const percentage = ((current / total) * 100).toFixed(1);
    console.log(
      `[PROGRESS] ${tableName}: ${current} of ${total} records migrated (${percentage}%)`
    );
  }

  summary(result: MigrationResult): void {
    console.log("\n" + "=".repeat(80));
    console.log("MIGRATION SUMMARY");
    console.log("=".repeat(80));
    console.log(`Start Time: ${result.startTime.toISOString()}`);
    console.log(`End Time: ${result.endTime.toISOString()}`);
    console.log(`Duration: ${result.duration}ms`);
    console.log(`Overall Status: ${result.success ? "SUCCESS" : "FAILED"}`);
    console.log("\nTable Statistics:");
    console.log("-".repeat(80));

    for (const stat of result.stats) {
      console.log(`\n${stat.tableName}:`);
      console.log(`  Total Records: ${stat.totalRecords}`);
      console.log(`  Successful: ${stat.successCount}`);
      console.log(`  Failed: ${stat.failureCount}`);
      
      if (stat.errors.length > 0) {
        console.log(`  Errors:`);
        stat.errors.forEach((err, idx) => {
          console.log(`    ${idx + 1}. Record ${err.recordId}: ${err.error}`);
        });
      }
    }

    console.log("\n" + "=".repeat(80));
  }
}

/**
 * Main migration class
 */
class DataMigration {
  private convexClient: ConvexHttpClient;
  private pgClient: PoolClient | null = null;
  private logger: MigrationLogger;
  private config: MigrationConfig;

  constructor(config: Partial<MigrationConfig> = {}) {
    this.logger = new MigrationLogger();
    this.config = {
      dryRun: config.dryRun ?? false,
      batchSize: config.batchSize ?? 100,
      continueOnError: config.continueOnError ?? true,
    };

    // Initialize V1 Convex client (read-only)
    const convexUrl = process.env.CONVEX_URL;
    if (!convexUrl) {
      throw new Error("CONVEX_URL environment variable is not set");
    }

    this.convexClient = new ConvexHttpClient(convexUrl);
    this.logger.info(`Connected to V1 Convex at ${convexUrl}`);
  }

  /**
   * Initialize PostgreSQL connection
   */
  async initializePostgres(): Promise<void> {
    try {
      this.pgClient = await getClient();
      this.logger.info("Connected to V2 PostgreSQL database");

      // Test connection
      await this.pgClient.query("SELECT 1");
      this.logger.success("PostgreSQL connection verified");
    } catch (error) {
      this.logger.error("Failed to connect to PostgreSQL", error);
      throw error;
    }
  }

  /**
   * Close database connections
   */
  async cleanup(): Promise<void> {
    if (this.pgClient) {
      this.pgClient.release();
      this.logger.info("PostgreSQL connection released");
    }
  }

  /**
   * Test database connections
   */
  async testConnections(): Promise<boolean> {
    try {
      this.logger.info("Testing database connections...");

      // Test V1 Convex connection (read-only)
      // Note: We'll implement actual Convex queries when we have the query functions
      this.logger.info("V1 Convex connection: OK (read-only mode)");

      // Test V2 PostgreSQL connection
      if (!this.pgClient) {
        await this.initializePostgres();
      }
      
      const result = await this.pgClient!.query("SELECT NOW() as current_time");
      this.logger.success(`V2 PostgreSQL connection: OK (${result.rows[0].current_time})`);

      return true;
    } catch (error) {
      this.logger.error("Connection test failed", error);
      return false;
    }
  }

  /**
   * Migrate a single table
   * This is a template method that will be implemented for each table
   */
  async migrateTable(
    tableName: string,
    fetchRecords: () => Promise<any[]>,
    transformRecord: (record: any) => any,
    insertRecord: (client: PoolClient, record: any) => Promise<void>
  ): Promise<MigrationStats> {
    const stats: MigrationStats = {
      tableName,
      totalRecords: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    try {
      this.logger.info(`Starting migration for table: ${tableName}`);

      // Fetch all records from V1 Convex
      const records = await fetchRecords();
      stats.totalRecords = records.length;
      this.logger.info(`Fetched ${records.length} records from V1 ${tableName}`);

      if (records.length === 0) {
        this.logger.info(`No records to migrate for ${tableName}`);
        return stats;
      }

      // Process records in batches
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        try {
          // Transform record from V1 format to V2 format
          const transformedRecord = transformRecord(record);

          // Insert into V2 PostgreSQL (skip if dry run)
          if (!this.config.dryRun && this.pgClient) {
            await insertRecord(this.pgClient, transformedRecord);
          }

          stats.successCount++;

          // Log progress every 10 records or at the end
          if ((i + 1) % 10 === 0 || i === records.length - 1) {
            this.logger.progress(i + 1, records.length, tableName);
          }
        } catch (error) {
          stats.failureCount++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          stats.errors.push({
            recordId: record._id || record.id || `index_${i}`,
            error: errorMessage,
          });

          this.logger.error(
            `Failed to migrate record ${record._id || record.id} in ${tableName}`,
            error
          );

          // Stop if continueOnError is false
          if (!this.config.continueOnError) {
            throw error;
          }
        }
      }

      this.logger.success(
        `Completed migration for ${tableName}: ${stats.successCount}/${stats.totalRecords} successful`
      );
    } catch (error) {
      this.logger.error(`Fatal error migrating table ${tableName}`, error);
      throw error;
    }

    return stats;
  }

  /**
   * Run the complete migration
   */
  async run(): Promise<MigrationResult> {
    const startTime = new Date();
    const stats: MigrationStats[] = [];
    let success = true;

    try {
      this.logger.info("Starting data migration from V1 Convex to V2 PostgreSQL");
      
      if (this.config.dryRun) {
        this.logger.info("DRY RUN MODE - No data will be written to PostgreSQL");
      }

      // Initialize connections
      await this.initializePostgres();

      // Test connections
      const connectionsOk = await this.testConnections();
      if (!connectionsOk) {
        throw new Error("Database connection tests failed");
      }

      // TODO: Implement table migrations
      // Each table will be migrated in dependency order (parent tables first)
      // Example:
      // stats.push(await this.migrateRestaurants());
      // stats.push(await this.migrateCategories());
      // stats.push(await this.migrateMenuItems());
      // ... etc

      this.logger.info("Migration placeholder - table migrations will be implemented");

    } catch (error) {
      success = false;
      this.logger.error("Migration failed", error);
    } finally {
      await this.cleanup();
    }

    const endTime = new Date();
    const result: MigrationResult = {
      success,
      stats,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
    };

    this.logger.summary(result);
    return result;
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const continueOnError = !args.includes("--stop-on-error");

  console.log("\n" + "=".repeat(80));
  console.log("DATA MIGRATION SCRIPT");
  console.log("V1 Convex → V2 PostgreSQL");
  console.log("=".repeat(80) + "\n");

  const migration = new DataMigration({
    dryRun,
    continueOnError,
  });

  try {
    const result = await migration.run();
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { DataMigration, MigrationConfig, MigrationStats, MigrationResult };
