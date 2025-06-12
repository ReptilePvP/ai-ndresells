
const { Pool } = require('@neondatabase/serverless');

async function applyMigration() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Attempting to apply migration manually...');
    
    // Check if column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'api_provider'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✓ Column api_provider already exists in users table');
      return;
    }
    
    // Apply the migration
    await pool.query(`ALTER TABLE "users" ADD COLUMN "api_provider" text DEFAULT 'gemini' NOT NULL`);
    
    console.log('✓ Migration applied successfully! Added api_provider column to users table');
    
    // Verify the column was added
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'api_provider'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✓ Verification successful:', verifyResult.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('✓ Column already exists - migration already applied');
    }
  } finally {
    await pool.end();
  }
}

applyMigration();
