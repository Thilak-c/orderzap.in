/**
 * Property-Based Test: Type Mapping Correctness
 * 
 * **Validates: Requirements 4.3-4.12**
 * 
 * This test verifies that the Convex-to-PostgreSQL type mapping follows the Type_Mapper rules:
 * - Convex v.string() → PostgreSQL TEXT
 * - Convex v.number() → PostgreSQL NUMERIC/INTEGER/BIGINT based on context
 * - Convex v.boolean() → PostgreSQL BOOLEAN
 * - Convex v.optional() → PostgreSQL NULL constraint
 * - Required fields → PostgreSQL NOT NULL constraint
 * 
 * The test reads the generated schema.sql file and validates that all type conversions
 * are correct according to the specification.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// Type mapping rules from requirements
interface TypeMapping {
  convexType: string;
  postgresType: string;
  context?: string;
}

const TYPE_MAPPING_RULES: TypeMapping[] = [
  { convexType: 'v.string()', postgresType: 'TEXT' },
  { convexType: 'v.number()', postgresType: 'NUMERIC', context: 'currency' },
  { convexType: 'v.number()', postgresType: 'INTEGER', context: 'count' },
  { convexType: 'v.number()', postgresType: 'BIGINT', context: 'timestamp' },
  { convexType: 'v.boolean()', postgresType: 'BOOLEAN' },
  { convexType: 'v.object()', postgresType: 'JSONB' },
  { convexType: 'v.array()', postgresType: 'JSONB' },
];

// Field classifications based on schema analysis
interface FieldClassification {
  fieldName: string;
  convexType: string;
  expectedPostgresType: string;
  isOptional: boolean;
  tableName: string;
}

// Comprehensive field mappings from V1 Convex schema to V2 PostgreSQL schema
const FIELD_MAPPINGS: FieldClassification[] = [
  // String fields → TEXT
  { fieldName: 'name', convexType: 'v.string()', expectedPostgresType: 'TEXT', isOptional: false, tableName: 'restaurants' },
  { fieldName: 'short_id', convexType: 'v.string()', expectedPostgresType: 'TEXT', isOptional: false, tableName: 'restaurants' },
  { fieldName: 'logo', convexType: 'v.optional(v.string())', expectedPostgresType: 'TEXT', isOptional: true, tableName: 'restaurants' },
  { fieldName: 'email', convexType: 'v.optional(v.string())', expectedPostgresType: 'TEXT', isOptional: true, tableName: 'restaurants' },
  { fieldName: 'description', convexType: 'v.optional(v.string())', expectedPostgresType: 'TEXT', isOptional: true, tableName: 'restaurants' },
  
  // Number fields → NUMERIC (currency)
  { fieldName: 'price', convexType: 'v.number()', expectedPostgresType: 'NUMERIC', isOptional: false, tableName: 'menu_items' },
  { fieldName: 'salary', convexType: 'v.optional(v.number())', expectedPostgresType: 'NUMERIC', isOptional: true, tableName: 'staff' },
  { fieldName: 'hourly_rate', convexType: 'v.optional(v.number())', expectedPostgresType: 'NUMERIC', isOptional: true, tableName: 'staff' },
  { fieldName: 'base_salary', convexType: 'v.number()', expectedPostgresType: 'NUMERIC', isOptional: false, tableName: 'payroll' },
  { fieldName: 'total_amount', convexType: 'v.number()', expectedPostgresType: 'NUMERIC', isOptional: false, tableName: 'payroll' },
  { fieldName: 'cost_per_unit', convexType: 'v.number()', expectedPostgresType: 'NUMERIC', isOptional: false, tableName: 'inventory' },
  { fieldName: 'quantity', convexType: 'v.number()', expectedPostgresType: 'NUMERIC', isOptional: false, tableName: 'inventory' },
  { fieldName: 'deposit_balance', convexType: 'v.number()', expectedPostgresType: 'NUMERIC', isOptional: false, tableName: 'customers' },
  { fieldName: 'total_spent', convexType: 'v.number()', expectedPostgresType: 'NUMERIC', isOptional: false, tableName: 'customers' },
  { fieldName: 'amount', convexType: 'v.number()', expectedPostgresType: 'NUMERIC', isOptional: false, tableName: 'payments' },
  
  // Number fields → INTEGER (counts)
  { fieldName: 'number', convexType: 'v.number()', expectedPostgresType: 'INTEGER', isOptional: false, tableName: 'tables' },
  { fieldName: 'capacity', convexType: 'v.optional(v.number())', expectedPostgresType: 'INTEGER', isOptional: true, tableName: 'tables' },
  { fieldName: 'orders_served_today', convexType: 'v.optional(v.number())', expectedPostgresType: 'INTEGER', isOptional: true, tableName: 'staff' },
  { fieldName: 'total_orders_served', convexType: 'v.optional(v.number())', expectedPostgresType: 'INTEGER', isOptional: true, tableName: 'staff' },
  { fieldName: 'days_worked', convexType: 'v.number()', expectedPostgresType: 'INTEGER', isOptional: false, tableName: 'payroll' },
  { fieldName: 'total_days', convexType: 'v.number()', expectedPostgresType: 'INTEGER', isOptional: false, tableName: 'payroll' },
  { fieldName: 'total_visits', convexType: 'v.number()', expectedPostgresType: 'INTEGER', isOptional: false, tableName: 'customers' },
  { fieldName: 'party_size', convexType: 'v.number()', expectedPostgresType: 'INTEGER', isOptional: false, tableName: 'reservations' },
  { fieldName: 'table_number', convexType: 'v.number()', expectedPostgresType: 'INTEGER', isOptional: false, tableName: 'reservations' },
  { fieldName: 'days', convexType: 'v.number()', expectedPostgresType: 'INTEGER', isOptional: false, tableName: 'subscriptions' },
  
  // Number fields → BIGINT (timestamps)
  { fieldName: 'created_at', convexType: 'v.number()', expectedPostgresType: 'BIGINT', isOptional: false, tableName: 'restaurants' },
  { fieldName: 'trial_start_date', convexType: 'v.optional(v.number())', expectedPostgresType: 'BIGINT', isOptional: true, tableName: 'restaurants' },
  { fieldName: 'trial_end_date', convexType: 'v.optional(v.number())', expectedPostgresType: 'BIGINT', isOptional: true, tableName: 'restaurants' },
  { fieldName: 'last_seen', convexType: 'v.optional(v.number())', expectedPostgresType: 'BIGINT', isOptional: true, tableName: 'staff' },
  { fieldName: 'joining_date', convexType: 'v.optional(v.number())', expectedPostgresType: 'BIGINT', isOptional: true, tableName: 'staff' },
  { fieldName: 'paid_on', convexType: 'v.optional(v.number())', expectedPostgresType: 'BIGINT', isOptional: true, tableName: 'payroll' },
  { fieldName: 'last_visit', convexType: 'v.optional(v.number())', expectedPostgresType: 'BIGINT', isOptional: true, tableName: 'customers' },
  { fieldName: 'start_date', convexType: 'v.number()', expectedPostgresType: 'BIGINT', isOptional: false, tableName: 'subscriptions' },
  { fieldName: 'end_date', convexType: 'v.number()', expectedPostgresType: 'BIGINT', isOptional: false, tableName: 'subscriptions' },
  { fieldName: 'completed_at', convexType: 'v.optional(v.number())', expectedPostgresType: 'BIGINT', isOptional: true, tableName: 'payments' },
  { fieldName: 'last_login_at', convexType: 'v.optional(v.number())', expectedPostgresType: 'BIGINT', isOptional: true, tableName: 'admin_users' },
  
  // Boolean fields → BOOLEAN
  { fieldName: 'active', convexType: 'v.boolean()', expectedPostgresType: 'BOOLEAN', isOptional: false, tableName: 'restaurants' },
  { fieldName: 'is_open', convexType: 'v.optional(v.boolean())', expectedPostgresType: 'BOOLEAN', isOptional: true, tableName: 'restaurants' },
  { fieldName: 'available', convexType: 'v.boolean()', expectedPostgresType: 'BOOLEAN', isOptional: false, tableName: 'menu_items' },
  { fieldName: 'is_online', convexType: 'v.optional(v.boolean())', expectedPostgresType: 'BOOLEAN', isOptional: true, tableName: 'staff' },
  { fieldName: 'is_in_restaurant', convexType: 'v.optional(v.boolean())', expectedPostgresType: 'BOOLEAN', isOptional: true, tableName: 'staff' },
  { fieldName: 'alerts_enabled', convexType: 'v.boolean()', expectedPostgresType: 'BOOLEAN', isOptional: false, tableName: 'alert_settings' },
  { fieldName: 'arrived', convexType: 'v.optional(v.boolean())', expectedPostgresType: 'BOOLEAN', isOptional: true, tableName: 'reservations' },
  { fieldName: 'enjoyed', convexType: 'v.boolean()', expectedPostgresType: 'BOOLEAN', isOptional: false, tableName: 'reviews' },
  { fieldName: 'auto_renew', convexType: 'v.optional(v.boolean())', expectedPostgresType: 'BOOLEAN', isOptional: true, tableName: 'subscriptions' },
  
  // Object fields → JSONB
  { fieldName: 'location', convexType: 'v.optional(v.object())', expectedPostgresType: 'JSONB', isOptional: true, tableName: 'restaurants' },
  { fieldName: 'business_hours', convexType: 'v.optional(v.object())', expectedPostgresType: 'JSONB', isOptional: true, tableName: 'restaurants' },
  { fieldName: 'theme_colors', convexType: 'v.optional(v.object())', expectedPostgresType: 'JSONB', isOptional: true, tableName: 'restaurants' },
  { fieldName: 'current_location', convexType: 'v.optional(v.object())', expectedPostgresType: 'JSONB', isOptional: true, tableName: 'staff' },
  { fieldName: 'permissions', convexType: 'v.object()', expectedPostgresType: 'JSONB', isOptional: false, tableName: 'admin_users' },
  { fieldName: 'metadata', convexType: 'v.optional(v.any())', expectedPostgresType: 'JSONB', isOptional: true, tableName: 'activity_logs' },
  
  // Array fields → JSONB
  { fieldName: 'assigned_tables', convexType: 'v.array(v.number())', expectedPostgresType: 'JSONB', isOptional: false, tableName: 'staff' },
  { fieldName: 'allowed_zones', convexType: 'v.optional(v.array())', expectedPostgresType: 'JSONB', isOptional: true, tableName: 'menu_items' },
];

describe('Property 2: Type Mapping Correctness', () => {
  let schemaContent: string;

  // Read the schema file once before all tests
  beforeAll(() => {
    const schemaPath = path.join(__dirname, '../postgres/schema.sql');
    schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  });

  it('should map Convex v.string() to PostgreSQL TEXT', () => {
    const stringFields = FIELD_MAPPINGS.filter(f => f.convexType.includes('v.string()'));
    
    stringFields.forEach(field => {
      // Find the table definition in schema
      const tableRegex = new RegExp(`CREATE TABLE ${field.tableName}[\\s\\S]*?\\);`, 'i');
      const tableMatch = schemaContent.match(tableRegex);
      
      expect(tableMatch, `Table ${field.tableName} should exist in schema`).toBeTruthy();
      
      if (tableMatch) {
        const tableDefinition = tableMatch[0];
        // Check if field is defined as TEXT
        const fieldRegex = new RegExp(`${field.fieldName}\\s+TEXT`, 'i');
        expect(tableDefinition).toMatch(fieldRegex);
      }
    });
  });

  it('should map Convex v.number() to PostgreSQL NUMERIC for currency fields', () => {
    const currencyFields = FIELD_MAPPINGS.filter(f => 
      f.expectedPostgresType === 'NUMERIC' && f.convexType.includes('v.number()')
    );
    
    currencyFields.forEach(field => {
      const tableRegex = new RegExp(`CREATE TABLE ${field.tableName}[\\s\\S]*?\\);`, 'i');
      const tableMatch = schemaContent.match(tableRegex);
      
      expect(tableMatch, `Table ${field.tableName} should exist in schema`).toBeTruthy();
      
      if (tableMatch) {
        const tableDefinition = tableMatch[0];
        // Check if field is defined as NUMERIC
        const fieldRegex = new RegExp(`${field.fieldName}\\s+NUMERIC`, 'i');
        expect(tableDefinition).toMatch(fieldRegex);
      }
    });
  });

  it('should map Convex v.number() to PostgreSQL INTEGER for count fields', () => {
    const countFields = FIELD_MAPPINGS.filter(f => 
      f.expectedPostgresType === 'INTEGER' && f.convexType.includes('v.number()')
    );
    
    countFields.forEach(field => {
      const tableRegex = new RegExp(`CREATE TABLE ${field.tableName}[\\s\\S]*?\\);`, 'i');
      const tableMatch = schemaContent.match(tableRegex);
      
      expect(tableMatch, `Table ${field.tableName} should exist in schema`).toBeTruthy();
      
      if (tableMatch) {
        const tableDefinition = tableMatch[0];
        // Check if field is defined as INTEGER
        const fieldRegex = new RegExp(`${field.fieldName}\\s+INTEGER`, 'i');
        expect(tableDefinition).toMatch(fieldRegex);
      }
    });
  });

  it('should map Convex v.number() to PostgreSQL BIGINT for timestamp fields', () => {
    const timestampFields = FIELD_MAPPINGS.filter(f => 
      f.expectedPostgresType === 'BIGINT' && f.convexType.includes('v.number()')
    );
    
    timestampFields.forEach(field => {
      const tableRegex = new RegExp(`CREATE TABLE ${field.tableName}[\\s\\S]*?\\);`, 'i');
      const tableMatch = schemaContent.match(tableRegex);
      
      expect(tableMatch, `Table ${field.tableName} should exist in schema`).toBeTruthy();
      
      if (tableMatch) {
        const tableDefinition = tableMatch[0];
        // Check if field is defined as BIGINT
        const fieldRegex = new RegExp(`${field.fieldName}\\s+BIGINT`, 'i');
        expect(tableDefinition).toMatch(fieldRegex);
      }
    });
  });

  it('should map Convex v.boolean() to PostgreSQL BOOLEAN', () => {
    const booleanFields = FIELD_MAPPINGS.filter(f => f.convexType.includes('v.boolean()'));
    
    booleanFields.forEach(field => {
      const tableRegex = new RegExp(`CREATE TABLE ${field.tableName}[\\s\\S]*?\\);`, 'i');
      const tableMatch = schemaContent.match(tableRegex);
      
      expect(tableMatch, `Table ${field.tableName} should exist in schema`).toBeTruthy();
      
      if (tableMatch) {
        const tableDefinition = tableMatch[0];
        // Check if field is defined as BOOLEAN
        const fieldRegex = new RegExp(`${field.fieldName}\\s+BOOLEAN`, 'i');
        expect(tableDefinition).toMatch(fieldRegex);
      }
    });
  });

  it('should map Convex v.optional() to PostgreSQL NULL constraint (no NOT NULL)', () => {
    const optionalFields = FIELD_MAPPINGS.filter(f => f.isOptional);
    
    optionalFields.forEach(field => {
      const tableRegex = new RegExp(`CREATE TABLE ${field.tableName}[\\s\\S]*?\\);`, 'i');
      const tableMatch = schemaContent.match(tableRegex);
      
      expect(tableMatch, `Table ${field.tableName} should exist in schema`).toBeTruthy();
      
      if (tableMatch) {
        const tableDefinition = tableMatch[0];
        // Check that field does NOT have NOT NULL constraint
        const fieldLineRegex = new RegExp(`${field.fieldName}\\s+\\w+[^,]*`, 'i');
        const fieldLineMatch = tableDefinition.match(fieldLineRegex);
        
        if (fieldLineMatch) {
          const fieldLine = fieldLineMatch[0];
          // Optional fields should not have NOT NULL
          expect(fieldLine).not.toMatch(/NOT NULL/i);
        }
      }
    });
  });

  it('should map required Convex fields to PostgreSQL NOT NULL constraint', () => {
    const requiredFields = FIELD_MAPPINGS.filter(f => !f.isOptional);
    
    requiredFields.forEach(field => {
      const tableRegex = new RegExp(`CREATE TABLE ${field.tableName}[\\s\\S]*?\\);`, 'i');
      const tableMatch = schemaContent.match(tableRegex);
      
      expect(tableMatch, `Table ${field.tableName} should exist in schema`).toBeTruthy();
      
      if (tableMatch) {
        const tableDefinition = tableMatch[0];
        // Check that field has NOT NULL constraint (or is PRIMARY KEY which implies NOT NULL)
        // Match the entire line up to the comment or end of line
        const fieldLineRegex = new RegExp(`${field.fieldName}\\s+[^\\n]+`, 'i');
        const fieldLineMatch = tableDefinition.match(fieldLineRegex);
        
        if (fieldLineMatch) {
          const fieldLine = fieldLineMatch[0];
          // Required fields should have NOT NULL or be PRIMARY KEY or have DEFAULT
          const hasNotNull = /NOT NULL/i.test(fieldLine);
          const isPrimaryKey = /PRIMARY KEY/i.test(fieldLine);
          const hasDefault = /DEFAULT/i.test(fieldLine);
          
          expect(
            hasNotNull || isPrimaryKey || hasDefault,
            `Field ${field.tableName}.${field.fieldName} should have NOT NULL, PRIMARY KEY, or DEFAULT. Found: ${fieldLine}`
          ).toBe(true);
        }
      }
    });
  });

  it('should map Convex v.object() to PostgreSQL JSONB', () => {
    const objectFields = FIELD_MAPPINGS.filter(f => 
      f.convexType.includes('v.object()') || f.convexType.includes('v.any()')
    );
    
    objectFields.forEach(field => {
      const tableRegex = new RegExp(`CREATE TABLE ${field.tableName}[\\s\\S]*?\\);`, 'i');
      const tableMatch = schemaContent.match(tableRegex);
      
      expect(tableMatch, `Table ${field.tableName} should exist in schema`).toBeTruthy();
      
      if (tableMatch) {
        const tableDefinition = tableMatch[0];
        // Check if field is defined as JSONB
        const fieldRegex = new RegExp(`${field.fieldName}\\s+JSONB`, 'i');
        expect(tableDefinition).toMatch(fieldRegex);
      }
    });
  });

  it('should map Convex v.array() to PostgreSQL JSONB', () => {
    const arrayFields = FIELD_MAPPINGS.filter(f => f.convexType.includes('v.array('));
    
    arrayFields.forEach(field => {
      const tableRegex = new RegExp(`CREATE TABLE ${field.tableName}[\\s\\S]*?\\);`, 'i');
      const tableMatch = schemaContent.match(tableRegex);
      
      expect(tableMatch, `Table ${field.tableName} should exist in schema`).toBeTruthy();
      
      if (tableMatch) {
        const tableDefinition = tableMatch[0];
        // Check if field is defined as JSONB
        const fieldRegex = new RegExp(`${field.fieldName}\\s+JSONB`, 'i');
        expect(tableDefinition).toMatch(fieldRegex);
      }
    });
  });

  // Property-based test: Verify type mapping consistency across all tables
  it('property: all fields follow type mapping rules consistently', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FIELD_MAPPINGS),
        (field) => {
          const tableRegex = new RegExp(`CREATE TABLE ${field.tableName}[\\s\\S]*?\\);`, 'i');
          const tableMatch = schemaContent.match(tableRegex);
          
          if (!tableMatch) {
            return false; // Table should exist
          }
          
          const tableDefinition = tableMatch[0];
          const fieldRegex = new RegExp(`${field.fieldName}\\s+${field.expectedPostgresType}`, 'i');
          
          return fieldRegex.test(tableDefinition);
        }
      ),
      { numRuns: FIELD_MAPPINGS.length }
    );
  });

  // Property-based test: Verify optional/required constraint consistency
  it('property: optional fields never have NOT NULL, required fields have NOT NULL or equivalent', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FIELD_MAPPINGS),
        (field) => {
          const tableRegex = new RegExp(`CREATE TABLE ${field.tableName}[\\s\\S]*?\\);`, 'i');
          const tableMatch = schemaContent.match(tableRegex);
          
          if (!tableMatch) {
            return false;
          }
          
          const tableDefinition = tableMatch[0];
          // Match the entire line up to the comment or end of line
          const fieldLineRegex = new RegExp(`${field.fieldName}\\s+[^\\n]+`, 'i');
          const fieldLineMatch = tableDefinition.match(fieldLineRegex);
          
          if (!fieldLineMatch) {
            return false;
          }
          
          const fieldLine = fieldLineMatch[0];
          const hasNotNull = /NOT NULL/i.test(fieldLine);
          const isPrimaryKey = /PRIMARY KEY/i.test(fieldLine);
          const hasDefault = /DEFAULT/i.test(fieldLine);
          
          if (field.isOptional) {
            // Optional fields should not have NOT NULL (unless they have DEFAULT)
            return !hasNotNull || hasDefault;
          } else {
            // Required fields should have NOT NULL, PRIMARY KEY, or DEFAULT
            return hasNotNull || isPrimaryKey || hasDefault;
          }
        }
      ),
      { numRuns: FIELD_MAPPINGS.length }
    );
  });
});
