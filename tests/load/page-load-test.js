import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const pageLoadTime = new Trend('page_load_time');

export const options = {
  scenarios: {
    ramp_up_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    page_load_time: ['p(95)<3000'],
    http_req_duration: ['p(95)<200'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, {
    username: 'admin',
    password: 'admin123',
  });

  const token = loginRes.json('data.access_token');
  
  return { token };
}

export default function(data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
  };

  const pages = [
    { name: 'Dashboard', url: '/' },
    { name: 'RS Page', url: '/rs' },
    { name: 'LIMS Page', url: '/lims' },
    { name: 'QMS Page', url: '/qms' },
    { name: 'EHS Page', url: '/ehs' },
  ];

  const page = pages[Math.floor(Math.random() * pages.length)];
  
  pageLoadTime.start();
  
  const res = http.get(`${BASE_URL}${page.url}`, { headers });
  
  pageLoadTime.add(res.timings.duration);

  const success = check(res, {
    [`${page.name} page loaded`]: (r) => r.status === 200,
    [`${page.name} content visible`]: (r) => r.body.length > 0,
  });

  errorRate.add(!success);

  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'page-performance.json': JSON.stringify(data),
  };
}

function textSummary(data) {
  let summary = '\n=== PAGE PERFORMANCE SUMMARY ===\n\n';
  
  summary += 'Average Page Load Time: ' + data.metrics.page_load_time.values.avg.toFixed(2) + 'ms\n';
  summary += 'Median Page Load Time: ' + data.metrics.page_load_time.values.med.toFixed(2) + 'ms\n';
  summary += '95th Percentile: ' + data.metrics.page_load_time.values['p(95)'].toFixed(2) + 'ms\n';
  summary += '99th Percentile: ' + data.metrics.page_load_time.values['p(99)'].toFixed(2) + 'ms\n\n';
  
  summary += 'Target: < 3000ms (3s)\n';
  summary += 'Status: ' + (data.metrics.page_load_time.values['p(95)'] < 3000 ? 'PASS' : 'FAIL') + '\n';
  
  return summary;
}
