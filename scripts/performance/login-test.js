import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const loginUrl = 'http://localhost:8099/api/core/iam/auth/login';
  const payload = JSON.stringify({
    username: 'admin',
    password: 'admin123',
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
