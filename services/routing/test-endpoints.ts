/**
 * Simple test script to verify routing API endpoints
 * Run with: bun run test-endpoints.ts
 */

const BASE_URL = 'http://localhost:3000';

// Mock auth token for testing (you'll need a real token from Supabase)
const AUTH_TOKEN = 'your-test-token-here';

async function testHealthEndpoint() {
  console.log('\n🔍 Testing GET /health');
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📦 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function testProvidersEndpoint() {
  console.log('\n🔍 Testing GET /api/routing/providers');
  try {
    const response = await fetch(`${BASE_URL}/api/routing/providers`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    });
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📦 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function testDirectionsEndpoint() {
  console.log('\n🔍 Testing POST /api/routing/directions');
  try {
    const response = await fetch(`${BASE_URL}/api/routing/directions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        waypoints: [
          { latitude: 40.7128, longitude: -74.006 }, // New York
          { latitude: 40.7589, longitude: -73.9851 }, // Times Square
        ],
        profile: 'cycling',
      }),
    });
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📦 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function testInvalidRequest() {
  console.log('\n🔍 Testing POST /api/routing/directions (invalid - missing waypoints)');
  try {
    const response = await fetch(`${BASE_URL}/api/routing/directions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        waypoints: [{ latitude: 40.7128, longitude: -74.006 }], // Only 1 waypoint
        profile: 'cycling',
      }),
    });
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📦 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function runTests() {
  console.log('🚀 Starting Routing Service API Tests');
  console.log('=====================================');

  await testHealthEndpoint();
  await testProvidersEndpoint();
  await testDirectionsEndpoint();
  await testInvalidRequest();

  console.log('\n✨ Tests completed!');
  console.log('\n⚠️  Note: Some tests may fail if AUTH_TOKEN is not set correctly.');
}

runTests();
