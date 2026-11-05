import http from 'k6/http';
import { check, sleep } from 'k6';

const PERF_USER = process.env.PERF_USER || 'admin';
const PERF_PASSWORD = process.env.PERF_PASSWORD || '';
if (!PERF_PASSWORD) throw new Error('需设置 PERF_PASSWORD（不再内置默认口令）');

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const loginUrl = 'http://localhost:8099/api/core/iam/auth/login';
  const payload = JSON.stringify({
    username: PERF_USER,
    password: PERF_PASSWORD,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(loginUrl, payload, params);
  check(res, {
    '登录成功': (r) => r.status === 200,
    '响应时间<500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
