/**
 * Property-Based Tests for V2 Convex Schema Completeness
 * 
 * **Validates: Requirements 3.1-3.10**
 * 
 * This test suite verifies that the V2 Convex schema correctly includes
 * all real-time tables from V1 with proper field definitions and indexes.
 */

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';

// V1 Schema Reference - Real-time tables that should exist in V2 Convex
const V1_REAL_TIME_TABLES = {
  orders: {
    fields: [
      'restaurantId', 'tableId', 'orderNumber', 'items', 'total', 'totalAmount',
      'status', 'paymentMethod', 'paymentStatus', 'notes', 'customerSessionId',
      'customerPhone', 'customerName', 'depositUsed', 'assignedWaiterId',
      'assignedAt', 'assignmentStatus', 'assignmentAcceptedAt', 'assignmentTimeoutAt',
      'subtotal', 'taxAmount', 'tipAmount', 'discountAmount', 'specialInstructions',
      'createdAt', 'updatedAt', 'postgresId', 'lastSyncedAt', 'syncPending',
      'syncError', 'lastSyncAttempt'
    ],
    indexes: [
      'by_restaurant', 'by_status', 'by_customerSession', 'by_table',
      'by_phone', 'by_postgres_id', 'by_sync_pending', 'by_assigned_waiter'
    ],
    syncFields: ['postgresId', 'lastSyncedAt', 'syncPending']
  },
  staffCalls: {
    fields: [
      'restaurantId', 'tableId', 'tableNumber', 'zoneName', 'reason',
      'status', 'createdAt', 'acknowledgedAt', 'originalStaffId',
      'reassignedTo', 'reassignReason'
    ],
    indexes: ['by_restaurant', 'by_status'],
    syncFields: [] // No PostgreSQL sync
  },
  zoneRequests: {
    fields: [
      'restaurantId', 'tableId', 'tableNumber', 'currentZone',
      'requestedZone', 'status', 'createdAt'
    ],
    indexes: ['by_restaurant', 'by_status'],
    syncFields: [] // No PostgreSQL sync
  },
  notifications: {
    fields: [
      'restaurantId', 'type', 'title', 'message', 'status', 'read',
      'channels', 'sentAt', 'readAt', 'createdAt', 'metadata'
    ],
    indexes: ['by_restaurant', 'by_status', 'by_read'],
    syncFields: [] // No PostgreSQL sync
  },
  staffNotifications: {
    fields: [
      'type', 'message', 'staffId', 'relatedCallId', 'read', 'createdAt'
    ],
    indexes: ['by_read'],
    syncFields: [] // No PostgreSQL sync
  },
  attendance: {
    fields: [
      'restaurantId', 'staffId', 'date', 'checkIn', 'checkOut',
      'checkInLocation', 'checkOutLocation', 'status', 'workHours',
      'notes', 'postgresId', 'lastSyncedAt', 'syncPending'
    ],
    indexes: [
      'by_restaurant', 'by_staff', 'by_date', 'by_staff_date',
      'by_postgres_id', 'by_sync_pending'
    ],
    syncFields: ['postgresId', 'lastSyncedAt', 'syncPending']
  }
};

// Parse the V2 Convex schema file
function parseConvexSchema(): any {
  const fs = require('fs');
  const path = require('path');
  const schemaPath = path.join(__dirname, '../convex/schema.ts');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  
  // Extract table definitions using improved regex
  const tables: Record<string, any> = {};
  
  // Split by table definitions
  const tableMatches = schemaContent.matchAll(/(\w+):\s*defineTable\(\{/g);
  const tableStarts: Array<{ name: string; index: number }> = [];
  
  for (const match of tableMatches) {
    if (match.index !== undefined) {
      tableStarts.push({ name: match[1], index: match.index });
    }
  }
  
  // Extract each table's content
  for (let i = 0; i < tableStarts.length; i++) {
    const tableName = tableStarts[i].name;
    const startIndex = tableStarts[i].index;
    const endIndex = i < tableStarts.length - 1 ? tableStarts[i + 1].index : schemaContent.length;
    const tableContent = schemaContent.substring(startIndex, endIndex);
    
    // Extract fields - look for field: v.type() patterns
    const fields: string[] = [];
    const fieldRegex = /^\s*(\w+):\s*v\./gm;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(tableContent)) !== null) {
      fields.push(fieldMatch[1]);
    }
    
    // Extract indexes - look for .index("name", [...]) patterns
    const indexes: string[] = [];
    const indexRegex = /\.index\("([^"]+)"/g;
    let indexMatch;
    while ((indexMatch = indexRegex.exec(tableContent)) !== null) {
      indexes.push(indexMatch[1]);
    }
    
    tables[tableName] = { fields, indexes };
  }
  
  return tables;
}

describe('V2 Convex Schema Completeness', () => {
  const v2Schema = parseConvexSchema();
  
  /**
   * Property 1: Schema Completeness - All Real-Time Tables Exist
   * **Validates: Requirements 3.1-3.10**
   * 
   * Verifies that all tables classified as real-time in V1 exist in V2 Convex schema.
   */
  test('Property 1: All real-time tables from V1 exist in V2 Convex schema', () => {
    const v1TableNames = Object.keys(V1_REAL_TIME_TABLES);
    const v2TableNames = Object.keys(v2Schema);
    
    for (const tableName of v1TableNames) {
      expect(
        v2TableNames,
        `Table "${tableName}" should exist in V2 Convex schema`
      ).toContain(tableName);
    }
  });
  
  /**
   * Property 2: Field Preservation - All Fields Are Preserved
   * **Validates: Requirements 3.3, 3.9**
   * 
   * Verifies that all fields from V1 real-time tables are preserved in V2.
   */
  test('Property 2: All fields are preserved with correct definitions', () => {
    for (const [tableName, v1Table] of Object.entries(V1_REAL_TIME_TABLES)) {
      const v2Table = v2Schema[tableName];
      
      expect(
        v2Table,
        `Table "${tableName}" should exist in V2 schema`
      ).toBeDefined();
      
      for (const fieldName of v1Table.fields) {
        expect(
          v2Table.fields,
          `Field "${fieldName}" should exist in table "${tableName}"`
        ).toContain(fieldName);
      }
    }
  });
  
  /**
   * Property 3: Index Preservation - All Indexes Are Preserved
   * **Validates: Requirements 3.4**
   * 
   * Verifies that all indexes from V1 are preserved in V2.
   */
  test('Property 3: All indexes are preserved', () => {
    for (const [tableName, v1Table] of Object.entries(V1_REAL_TIME_TABLES)) {
      const v2Table = v2Schema[tableName];
      
      expect(
        v2Table,
        `Table "${tableName}" should exist in V2 schema`
      ).toBeDefined();
      
      for (const indexName of v1Table.indexes) {
        expect(
          v2Table.indexes,
          `Index "${indexName}" should exist in table "${tableName}"`
        ).toContain(indexName);
      }
    }
  });
  
  /**
   * Property 4: Sync Fields for Dual-Database Tables
   * **Validates: Requirements 3.5, 3.6, 3.7, 3.10**
   * 
   * Verifies that tables requiring PostgreSQL sync have the required sync fields.
   */
  test('Property 4: Dual-database tables have required sync fields', () => {
    const dualDatabaseTables = ['orders', 'attendance'];
    const requiredSyncFields = ['postgresId', 'lastSyncedAt', 'syncPending'];
    
    for (const tableName of dualDatabaseTables) {
      const v2Table = v2Schema[tableName];
      
      expect(
        v2Table,
        `Table "${tableName}" should exist in V2 schema`
      ).toBeDefined();
      
      for (const syncField of requiredSyncFields) {
        expect(
          v2Table.fields,
          `Sync field "${syncField}" should exist in table "${tableName}"`
        ).toContain(syncField);
      }
    }
  });
  
  /**
   * Property 5: No Extra Tables (Purity Check)
   * **Validates: Requirements 3.2**
   * 
   * Verifies that V2 Convex schema only contains real-time tables.
   */
  test('Property 5: V2 Convex schema contains only real-time tables', () => {
    const v1TableNames = Object.keys(V1_REAL_TIME_TABLES);
    const v2TableNames = Object.keys(v2Schema);
    
    for (const tableName of v2TableNames) {
      expect(
        v1TableNames,
        `Table "${tableName}" in V2 should be a real-time table from V1`
      ).toContain(tableName);
    }
  });
  
  /**
   * Property-Based Test: Field Count Consistency
   * **Validates: Requirements 3.3**
   * 
   * Uses property-based testing to verify field count consistency.
   */
  test('Property-Based: Field count matches or exceeds V1 (accounting for sync fields)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(V1_REAL_TIME_TABLES)),
        (tableName) => {
          const v1Table = V1_REAL_TIME_TABLES[tableName as keyof typeof V1_REAL_TIME_TABLES];
          const v2Table = v2Schema[tableName];
          
          // V2 should have at least as many fields as V1
          // (may have more due to sync fields)
          expect(v2Table.fields.length).toBeGreaterThanOrEqual(v1Table.fields.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property-Based Test: Index Count Consistency
   * **Validates: Requirements 3.4**
   * 
   * Uses property-based testing to verify index count consistency.
   */
  test('Property-Based: Index count matches or exceeds V1 (accounting for sync indexes)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(V1_REAL_TIME_TABLES)),
        (tableName) => {
          const v1Table = V1_REAL_TIME_TABLES[tableName as keyof typeof V1_REAL_TIME_TABLES];
          const v2Table = v2Schema[tableName];
          
          // V2 should have at least as many indexes as V1
          // (may have more due to sync field indexes)
          expect(v2Table.indexes.length).toBeGreaterThanOrEqual(v1Table.indexes.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
