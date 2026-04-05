# PostgreSQL CRUD Test Suite

## Overview

This directory contains comprehensive CRUD tests for all PostgreSQL tables in the OrderZap V2 backend. These tests are part of **Phase 3: PostgreSQL CRUD Test Suite**, which is a **BLOCKING GATE** phase - all tests must pass before proceeding to Phase 4 (API Endpoints).

## Requirements Validated

This test suite validates the following requirements:

- **6.1**: Test database connection using `v2/OZ-backend/express/src/config/database.ts`
- **6.10**: Clean up test data after each test (using transaction rollback)
- **6.11**: Report pass/fail status for each table's CRUD operations
- **6.12**: Use Vitest testing framework
- **6.13**: Connect to PostgreSQL using the connection pool
- **6.14**: Complete all tests within 30 seconds

## Test Infrastructure

### Database Connection

Tests use the same database connection pool as the production code (`src/config/database.ts`). The connection string is loaded from the `PG_URL` environment variable.

### Transaction-Based Cleanup

Each test runs in its own transaction that is automatically rolled back after completion. This ensures:
- Tests are isolated from each other
- No test data persists in the database
- Tests can run in parallel without conflicts
- Database state is clean for each test run

### Test Utilities

The test suite includes several utility functions:

- `TestTransaction`: Manages database transactions for test isolation
- `testTimestamp()`: Generates current timestamp in milliseconds
- `testDate()`: Generates date string in YYYY-MM-DD format
- `testTime()`: Generates time string in HH:MM format

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Specific Test File

```bash
npx vitest run express/src/tests/db.test.ts
```

## Test Structure

Each table has a dedicated test suite with the following tests:

1. **CREATE**: Validates record insertion with all required fields
2. **READ**: Validates record retrieval by ID
3. **UPDATE**: Validates record modification
4. **DELETE**: Validates record deletion
5. **Constraints**: Validates foreign keys, unique constraints, and check constraints
6. **JSONB Round-Trip**: Validates JSON data serialization/deserialization

## Current Test Coverage

### Implemented Tests

- ✅ **Restaurants**: Full CRUD + unique constraint + JSONB round-trip
- ✅ **Zones**: Full CRUD + cascade delete validation

### Pending Tests

The following tables need CRUD tests implemented:

- Categories
- Menu Items
- Tables
- Alert Settings
- Settings
- Staff
- Payroll
- Inventory
- Wastage
- Deductions
- Customers
- Reservations
- Reviews
- Subscriptions
- Payments
- Admin Users
- Activity Logs

## Database Setup

Before running tests, ensure the PostgreSQL database is set up:

1. **Create Database**:
   ```bash
   createdb -U postgres OZ-T
   ```

2. **Run Schema**:
   ```bash
   psql -U postgres -d OZ-T -f v2/OZ-backend/postgres/schema.sql
   ```

3. **Set Environment Variable**:
   ```bash
   # In .env file
   PG_URL=postgresql://postgres:password@localhost:5432/OZ-T
   ```

## Test Configuration

Test configuration is defined in `vitest.config.ts`:

```typescript
{
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    setupFiles: ['./vitest.setup.ts'],
  }
}
```

## Environment Variables

Tests require the following environment variables:

- `PG_URL`: PostgreSQL connection string (loaded from `.env` file)

Environment variables are loaded automatically via `vitest.setup.ts` which imports `dotenv/config`.

## Best Practices

1. **Always use transactions**: Use `TestTransaction` class for all database operations
2. **Clean up after tests**: Ensure `afterEach` calls `tx.rollback()`
3. **Test constraints**: Validate foreign keys, unique constraints, and check constraints
4. **Test JSONB fields**: Verify JSON data round-trips correctly
5. **Use type-safe queries**: Use TypeScript interfaces from `src/types/database.ts`

## Troubleshooting

### Connection Errors

If you see "SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string":
- Verify `PG_URL` is set in `.env` file
- Check PostgreSQL is running: `pg_isready`
- Verify credentials are correct

### Relation Does Not Exist

If you see "relation 'table_name' does not exist":
- Run the schema file: `psql -U postgres -d OZ-T -f postgres/schema.sql`
- Verify you're connecting to the correct database

### Tests Timeout

If tests timeout:
- Check PostgreSQL is responsive
- Verify network connectivity to database
- Increase timeout in `vitest.config.ts` if needed

## Next Steps

After all tests pass:
1. Proceed to Phase 4: API Endpoints
2. Implement REST API routes for each table
3. Add API integration tests
4. Document API endpoints in `v2/docs/BACKEND_API.md`
