import { db } from './src/common/db';

async function testConnection() {
  console.log('Testing connection to:', process.env.ARANGO_URL);
  try {
    const version = await db.version();
    console.log('✅ Connection successful! ArangoDB Version:', version);
  } catch (e) {
    console.error('❌ Connection failed:');
    console.error(e);
    process.exit(1);
  }
}

testConnection();
