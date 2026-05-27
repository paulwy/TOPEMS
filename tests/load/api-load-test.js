import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '1m', target: 200 },
        { duration: '30s', target: 0 },
      ],
    },
    spike: {
      executor: 'spike',
      stages: [
        { duration: '10s', target: 100 },
        { duration: '1m', target: 500 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8001';

export function setup() {
  const loginRes = http.post(`${API_BASE_URL}/api/auth/login`, {
    username: 'admin',
    password: 'admin123',
  });

  const token = loginRes.json('data.access_token');
  
  return { token };
}

export default function(data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  responseTime.start();
  
  const res = http.get(`${API_BASE_URL}/api/v1/production-plans`, { headers });
  
  responseTime.add(res.timings.duration);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has data': (r) => r.json('data') !== null,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(!success);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}

function textSummary(data, opts) {
  const indent = opts.indent || '';
  let summary = '\n' + indent + '='.repeat(60) + '\n';
  summary += indent + '  PERFORMANCE TEST SUMMARY\n';
  summary += indent + '='.repeat(60) + '\n\n';
  
  summary += indent + 'Duration: ' + (data.metrics.data.points / 1000).toFixed(2) + 's\n';
  summary += indent + 'Total Requests: ' + data.metrics.http_reqs.values.count + '\n';
  summary += indent + 'Failed Requests: ' + data.metrics.http_req_failed.values.passes + '\n';
  summary += indent + 'Request Rate: ' + data.metrics.http_reqs.values.rate.toFixed(2) + ' req/s\n\n';
  
  summary += indent + 'Response Times:\n';
  summary += indent + '  Average: ' + data.metrics.http_req_duration.values.avg.toFixed(2) + 'ms\n';
  summary += indent + '  Median: ' + data.metrics.http_req_duration.values.med.toFixed(2) + 'ms\n';
  summary += indent + '  95th percentile: ' + data.metrics.http_req_duration.values['p(95)'].toFixed(2) + 'ms\n';
  summary += indent + '  99th percentile: ' + data.metrics.http_req_duration.values['p(99)'].toFixed(2) + 'ms\n\n';
  
  summary += indent + '='.repeat(60) + '\n';
  
  return summary;
}
