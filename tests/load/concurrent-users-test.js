import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

const successfulLogins = new Counter('successful_logins');
const failedLogins = new Counter('failed_logins');
const loginDuration = new Trend('login_duration');
const errorRate = new Rate('login_errors');

export const options = {
  scenarios: {
    concurrent_users: {
      executor: 'per-vu-iterations',
      vus: 100,
      iterations: 10,
      maxDuration: '5m',
    },
    ramping_concurrent: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    login_duration: ['p(95)<500'],
    login_errors: ['rate<0.05'],
    successful_logins: ['count>0'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const testUsers = [
  { username: 'admin', password: 'admin123' },
  { username: 'user', password: 'user123' },
  { username: 'guest', password: 'guest123' },
];

export default function() {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  loginDuration.start();
  
  const res = http.post(`${BASE_URL}/api/auth/login`, {
    username: user.username,
    password: user.password,
  });
  
  loginDuration.add(res.timings.duration);

  const success = check(res, {
    'login successful': (r) => r.status === 200 && r.json('success') === true,
    'has access token': (r) => r.json('data.access_token') !== undefined,
  });

  if (success) {
    successfulLogins.add(1);
  } else {
    failedLogins.add(1);
  }

  errorRate.add(!success);

  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'concurrent-users.json': JSON.stringify(data),
  };
}

function textSummary(data) {
  let summary = '\n=== CONCURRENT USERS TEST SUMMARY ===\n\n';
  
  summary += 'Successful Logins: ' + data.metrics.successful_logins.values.count + '\n';
  summary += 'Failed Logins: ' + data.metrics.failed_logins.values.count + '\n';
  summary += 'Success Rate: ' + ((data.metrics.successful_logins.values.count / 
    (data.metrics.successful_logins.values.count + data.metrics.failed_logins.values.count)) * 100).toFixed(2) + '%\n\n';
  
  summary += 'Login Duration:\n';
  summary += '  Average: ' + data.metrics.login_duration.values.avg.toFixed(2) + 'ms\n';
  summary += '  Median: ' + data.metrics.login_duration.values.med.toFixed(2) + 'ms\n';
  summary += '  95th percentile: ' + data.metrics.login_duration.values['p(95)'].toFixed(2) + 'ms\n';
  summary += '  99th percentile: ' + data.metrics.login_duration.values['p(99)'].toFixed(2) + 'ms\n\n';
  
  summary += 'Target: > 100 concurrent users\n';
  summary += 'Status: ' + (data.metrics.successful_logins.values.count > 100 ? 'PASS' : 'NEEDS REVIEW') + '\n';
  
  return summary;
}
