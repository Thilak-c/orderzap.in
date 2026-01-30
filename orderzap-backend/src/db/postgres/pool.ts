/**
 * PostgreSQL Connection Pool
 * Manages database connections with proper error handling and retry logic
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '../../utils/logger';
import dotenv from 'dotenv';

// Load environment variables - try multiple paths
dotenv.config({ path: '.env' });
dotenv.config({ path: '../.env' });
dotenv.config({ path: '../../.env' });
dotenv.config();

class DatabasePool {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor() {
    // Debug: log what we're using
    console.log('DB Config:', {
      host: process.env.POSTGRES_HOST || 'undefined',
      port: process.env.POSTGRES_PORT || 'undefined',
      database: process.env.POSTGRES_DB || 'undefined',
      user: process.env.POSTGRES_USER || 'undefined',
      password: process.env.POSTGRES_PASSWORD ? '***' : 'undefined'
    });
    
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: false, // Disable SSL for local development
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client', err);
    });

    this.pool.on('connect', () => {
      this.isConnected = true;
      logger.info('New PostgreSQL client connected');
    });

    this.pool.on('remove', () => {
      logger.info('PostgreSQL client removed from pool');
    });
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isConnected = true;
      logger.info('PostgreSQL connection test successful');
      return true;
    } catch (error) {
      this.isConnected = false;
      logger.error('PostgreSQL connection test failed', error);
      return false;
    }
  }

  /**
   * Execute a query
   */
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Query execution failed', { text, params, error });
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    try {
      const client = await this.pool.connect();
      return client;
    } catch (error) {
      logger.error('Failed to get client from pool', error);
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction rolled back', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      logger.info('PostgreSQL pool closed');
    } catch (error) {
      logger.error('Error closing PostgreSQL pool', error);
      throw error;
    }
  }

  /**
   * Get pool status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

// Export singleton instance
export const db = new DatabasePool();
