import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Database connection test function
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    // Test the connection by executing a simple query
    const result = await pool.query('SELECT 1 as test');
    return result.rows.length > 0 && result.rows[0].test === 1;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}