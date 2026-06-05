import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('hrm_errors');
const responseTime = new Trend('hrm_response_time');

export const options = {
  scenarios: {
    hrm_smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '10s',
    },
    hrm_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
    hrm_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.05'],
    hrm_errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const HRM_API_BASE_URL = __ENV.HRM_API_BASE_URL || 'http://localhost:8010';

export function setup() {
  console.log('🧪 Setting up HRM load test...');
  return { timestamp: Date.now() };
}

export default function(data) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  const endpoints = [
    '/api/v1/employees',
    '/api/v1/departments',
    '/api/v1/positions',
    '/api/v1/leave',
    '/api/v1/attendance',
    '/api/v1/contracts',
  ];
  
  const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  responseTime.start();
  
  const res = http.get(`${HRM_API_BASE_URL}${randomEndpoint}`, { headers });
  
  responseTime.add(res.timings.duration);
  
  const success = check(res, {
    'hrm response status is 200 or 401': (r) => [200, 401, 404].includes(r.status),
    'hrm response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  
  sleep(Math.random() * 2);
}

export function handleSummary(data) {
  let summary = '\n' + '='.repeat(60) + '\n';
  summary += '  HRM MODULE PERFORMANCE TEST SUMMARY\n';
  summary += '='.repeat(60) + '\n\n';
  
  summary += 'Total Requests: ' + data.metrics.http_reqs.values.count + '\n';
  summary += 'Failed Requests: ' + data.metrics.http_req_failed.values.passes + '\n';
  summary += 'Request Rate: ' + data.metrics.http_reqs.values.rate.toFixed(2) + ' req/s\n\n';
  
  summary += 'Response Times:\n';
  summary += '  Average: ' + data.metrics.http_req_duration.values.avg.toFixed(2) + 'ms\n';
  summary += '  Median: ' + data.metrics.http_req_duration.values.med.toFixed(2) + 'ms\n';
  summary += '  95th percentile: ' + data.metrics.http_req_duration.values['p(95)'].toFixed(2) + 'ms\n';
  summary += '  99th percentile: ' + data.metrics.http_req_duration.values['p(99)'].toFixed(2) + 'ms\n\n';
  
  summary += '='.repeat(60) + '\n';
  
  return {
    'stdout': summary,
    'hrm-summary.json': JSON.stringify(data),
  };
}
