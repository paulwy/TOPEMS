import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export function setup() {
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
  return { token: res.json('data.access_token') };
}

export default function (data) {
  const ordersUrl = 'http://localhost:8099/api/mes/orders?page=1&page_size=20';

  const params = {
    headers: {
      'Authorization': `Bearer ${data.token}`,
    },
  };

  const res = http.get(ordersUrl, params);
  check(res, {
    '生产订单列表加载成功': (r) => r.status === 200,
    '响应时间<500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
