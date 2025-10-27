export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize?: boolean;
  logging?: boolean;
  ssl?: boolean | object;
}

export interface ConnectionPoolConfig {
  /**
   * Maximum number of concurrent connections
   */
  maxConnections?: number;

  /**
   * Connection idle timeout in milliseconds
   */
  idleTimeout?: number;

  /**
   * Enable connection cleanup
   */
  enableCleanup?: boolean;

  /**
   * Cleanup interval in milliseconds
   */
  cleanupInterval?: number;
}
