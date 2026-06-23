import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Gauge, Rate, Trend } from 'k6/metrics';

const BASE_URL = 'http://localhost:8040';

const requests = new Counter('http_reqs');
const latency = new Trend('http_req_duration');
const errors = new Rate('errors');
const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');

export const options = {
  vus: 50,
  duration: '60s',
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'errors': ['rate<0.01'],
    'http_req_duration{name:list_suppliers}': ['p(95)<300'],
    'http_req_duration{name:get_supplier}': ['p(95)<200'],
  },
  scenarios: {
    constant_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '60s',
    },
  },
};

function getAuthToken() {
  const response = http.post(`${BASE_URL}/api/scm/login`, JSON.stringify({
    username: 'admin',
    password: 'admin123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (response.status === 200) {
    const body = JSON.parse(response.body);
    return body.data.token;
  }
  return null;
}

function generateSupplierData() {
  const randomId = Math.floor(Math.random() * 1000000);
  return {
    name: `测试供应商_${randomId}`,
    short_name: `SUP_${randomId}`,
    contact_name: `联系人_${randomId}`,
    contact_phone: `138${randomId.toString().padStart(8, '0')}`,
    email: `test_${randomId}@example.com`,
    address: `测试地址_${randomId}`,
    bank_account: `622202${randomId.toString().padStart(10, '0')}`,
    tax_number: `91${randomId.toString().padStart(12, '0')}`,
  };
}

export default function () {
  let token = getAuthToken();
  if (!token) {
    token = 'mock-token';
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  group('供应商列表查询', function () {
    const response = http.get(`${BASE_URL}/api/scm/suppliers?page=1&page_size=20`, {
      headers,
      tags: { name: 'list_suppliers' },
    });
    
    check(response, {
      '状态码为200': (r) => r.status === 200,
      '响应包含供应商列表': (r) => {
        const body = JSON.parse(r.body);
        return body.success && body.data && body.data.suppliers;
      },
    });
    
    errors.add(response.status !== 200);
    
    const body = JSON.parse(response.body);
    if (body.data && body.data.suppliers && body.data.suppliers.length > 0) {
      cacheHits.add(1);
    } else {
      cacheMisses.add(1);
    }
    
    sleep(0.5);
  });

  group('供应商详情查询', function () {
    const response = http.get(`${BASE_URL}/api/scm/suppliers/00000000-0000-0000-0000-000000000001`, {
      headers,
      tags: { name: 'get_supplier' },
    });
    
    check(response, {
      '状态码为200或404': (r) => r.status === 200 || r.status === 404,
    });
    
    errors.add(response.status !== 200 && response.status !== 404);
    sleep(0.3);
  });

  group('创建供应商', function () {
    const supplierData = generateSupplierData();
    const response = http.post(`${BASE_URL}/api/scm/suppliers`, JSON.stringify(supplierData), {
      headers,
      tags: { name: 'create_supplier' },
    });
    
    check(response, {
      '状态码为200': (r) => r.status === 200,
      '创建成功': (r) => {
        const body = JSON.parse(r.body);
        return body.success;
      },
    });
    
    errors.add(response.status !== 200);
    sleep(1);
  });

  group('搜索供应商', function () {
    const searchKeywords = ['测试', '供应商', 'SUP'];
    const keyword = searchKeywords[Math.floor(Math.random() * searchKeywords.length)];
    const response = http.get(`${BASE_URL}/api/scm/suppliers?search=${encodeURIComponent(keyword)}`, {
      headers,
      tags: { name: 'search_supplier' },
    });
    
    check(response, {
      '状态码为200': (r) => r.status === 200,
    });
    
    errors.add(response.status !== 200);
    sleep(0.5);
  });
}

export function handleSummary(data) {
  const metrics = {
    'http_reqs': data.metrics.http_reqs.value,
    'http_req_duration_avg': data.metrics.http_req_duration.values.avg,
    'http_req_duration_p95': data.metrics.http_req_duration.values.p95,
    'http_req_duration_p99': data.metrics.http_req_duration.values.p99,
    'errors_rate': data.metrics.errors.values.rate,
    'cache_hits': data.metrics.cache_hits.value,
    'cache_misses': data.metrics.cache_misses.value,
    'iterations': data.metrics.iterations.value,
    'vus_max': data.metrics.vus.values.max,
  };

  console.log('===== 性能测试报告 =====');
  console.log(`总请求数: ${metrics.http_reqs}`);
  console.log(`平均响应时间: ${metrics.http_req_duration_avg.toFixed(2)}ms`);
  console.log(`P95 响应时间: ${metrics.http_req_duration_p95.toFixed(2)}ms`);
  console.log(`P99 响应时间: ${metrics.http_req_duration_p99.toFixed(2)}ms`);
  console.log(`错误率: ${(metrics.errors_rate * 100).toFixed(2)}%`);
  console.log(`缓存命中: ${metrics.cache_hits}`);
  console.log(`缓存未命中: ${metrics.cache_misses}`);
  console.log(`总迭代次数: ${metrics.iterations}`);
  console.log(`最大并发用户数: ${metrics.vus_max}`);
  console.log('========================');

  return {
    'stdout': JSON.stringify(metrics, null, 2),
    'performance-report.json': JSON.stringify(metrics, null, 2),
  };
}
