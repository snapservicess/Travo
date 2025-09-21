/**
 * Login Performance Test Script
 * Test various login scenarios for speed optimization
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testLoginPerformance() {
  console.log('🧪 Testing Travo Login Performance\n');

  const tests = [
    {
      name: 'Demo Login (Fast)',
      credentials: { touristId: 'DEMO', password: 'demo123' },
      expectedTime: 100 // milliseconds
    },
    {
      name: 'Database Login (Optimized)',
      credentials: { touristId: 'T12345', password: 'password123' },
      expectedTime: 500
    },
    {
      name: 'Invalid Credentials',
      credentials: { touristId: 'INVALID', password: 'wrong' },
      expectedTime: 300
    }
  ];

  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, test.credentials, {
        timeout: 10000
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`   ✅ Response Time: ${duration}ms`);
      console.log(`   📊 Status: ${response.status}`);
      console.log(`   📝 Success: ${response.data.success}`);
      
      if (duration <= test.expectedTime) {
        console.log(`   🚀 Performance: GOOD (under ${test.expectedTime}ms)`);
      } else {
        console.log(`   ⚠️  Performance: SLOW (over ${test.expectedTime}ms)`);
      }
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`   ❌ Response Time: ${duration}ms`);
      console.log(`   📊 Status: ${error.response?.status || 'Network Error'}`);
      console.log(`   📝 Error: ${error.response?.data?.message || error.message}`);
    }
    
    console.log('');
    
    // Wait 1 second between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Test health endpoint speed
  console.log('Testing: Health Check Endpoint');
  const healthStart = Date.now();
  
  try {
    const response = await axios.get(`${API_BASE}/health`);
    const healthEnd = Date.now();
    const healthDuration = healthEnd - healthStart;
    
    console.log(`   ✅ Health Check Time: ${healthDuration}ms`);
    console.log(`   📊 Server Status: ${response.data.status}`);
    console.log(`   🗄️  Database: ${response.data.database.status}`);
    
  } catch (error) {
    console.log(`   ❌ Health check failed: ${error.message}`);
  }

  console.log('\n📊 Login Performance Test Summary:');
  console.log('   • Demo login should be under 100ms');
  console.log('   • Database login should be under 500ms');
  console.log('   • Invalid credentials should fail fast');
  console.log('   • Health check should be under 100ms');
  
  console.log('\n🔧 Performance Optimizations Applied:');
  console.log('   • Reduced bcrypt salt rounds from 12 to 8');
  console.log('   • Added fast demo login bypass');
  console.log('   • Async database updates for lastLogin');
  console.log('   • Frontend timeout and fallback handling');
  console.log('   • Optimized database queries');

  console.log('\n💡 Usage Instructions:');
  console.log('   • Use "DEMO" / "demo123" for instant login');
  console.log('   • Use "T12345" / "password123" for database login');
  console.log('   • Frontend automatically falls back to demo mode on timeout');
}

// Export for use in other tests
module.exports = { testLoginPerformance };

// Run test if called directly
if (require.main === module) {
  testLoginPerformance().catch(console.error);
}