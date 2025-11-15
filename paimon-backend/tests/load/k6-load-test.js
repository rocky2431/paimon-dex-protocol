/**
 * K6 Load Test for Paimon Backend API
 *
 * Simulates 1000 concurrent users testing critical endpoints:
 * - Portfolio API
 * - Task Progress API
 * - Historical Data API
 *
 * Usage:
 *   k6 run tests/load/k6-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 100 },   // Ramp up to 100 users
    { duration: '1m', target: 500 },    // Ramp up to 500 users
    { duration: '2m', target: 1000 },   // Ramp up to 1000 users
    { duration: '2m', target: 1000 },   // Stay at 1000 users
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% of requests < 500ms
    http_req_failed: ['rate<0.05'],     // Error rate < 5%
    errors: ['rate<0.1'],               // Custom error rate < 10%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8000';

// Test data
const TEST_ADDRESSES = [
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
  '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
];

const TEST_POOL_ADDRESSES = [
  '0xc32F700393F6d9d39b4f3b30ceF02e7A0795DB5A',
  '0x77a9B25d69746d9b51455c2EE71dbcc934365dDB',
];

export default function () {
  const userAddress = TEST_ADDRESSES[Math.floor(Math.random() * TEST_ADDRESSES.length)];
  const poolAddress = TEST_POOL_ADDRESSES[Math.floor(Math.random() * TEST_POOL_ADDRESSES.length)];

  // Test 1: Portfolio API
  const portfolioRes = http.get(`${BASE_URL}/api/v2/portfolio/${userAddress}`);
  check(portfolioRes, {
    'Portfolio: status 200': (r) => r.status === 200,
    'Portfolio: response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: Task Progress API
  const tasksRes = http.get(`${BASE_URL}/api/tasks/${userAddress}`);
  check(tasksRes, {
    'Tasks: status 200': (r) => r.status === 200,
    'Tasks: response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);

  sleep(1);

  // Test 3: Historical APR API
  const aprRes = http.get(`${BASE_URL}/api/v2/historical/apr/${poolAddress}?period=7d`);
  check(aprRes, {
    'APR: status 200': (r) => r.status === 200,
    'APR: response time < 400ms': (r) => r.timings.duration < 400,
  }) || errorRate.add(1);

  sleep(1);

  // Test 4: Historical Rewards API
  const rewardsRes = http.get(`${BASE_URL}/api/v2/historical/rewards/${userAddress}?period=30d`);
  check(rewardsRes, {
    'Rewards: status 200': (r) => r.status === 200,
    'Rewards: response time < 400ms': (r) => r.timings.duration < 400,
  }) || errorRate.add(1);

  sleep(2);
}
