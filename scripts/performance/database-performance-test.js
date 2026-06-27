import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE_URL = 'http://localhost:8040';

const dbQueries = new Counter('db_queries');
const dbQueryDuration = new Trend('db_query_duration');

export const options = {
  vus: 100,
  duration: '120s',
  thresholds: {
    'http_req_duration': ['p(95)<800', 'p(99)<1500'],
  },
};

function generateRandomSupplierId() {
  const ids = [
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000010',
  ];
  return ids[Math.floor(Math.random() * ids.length)];
}

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mock-token',
  };

  group('大批量列表查询', function () {
    const page = Math.floor(Math.random() * 10) + 1;
    const pageSize = [20, 50, 100][Math.floor(Math.random() * 3)];
    
    const response = http.get(`${BASE_URL}/api/scm/suppliers?page=${page}&page_size=${pageSize}`, {
      headers,
      tags: { name: 'large_list_query' },
    });
    
    check(response, {
      '状态码为200': (r) => r.status === 200,
    });
    
    dbQueries.add(1);
    dbQueryDuration.add(response.timings.duration);
    sleep(0.3);
  });

  group('复杂条件筛选查询', function () {
    const statuses = ['active', 'pending', 'inactive'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const response = http.get(`${BASE_URL}/api/scm/suppliers?status=${status}&search=测试`, {
      headers,
      tags: { name: 'complex_filter_query' },
    });
    
    check(response, {
      '状态码为200': (r) => r.status === 200,
    });
    
    dbQueries.add(1);
    dbQueryDuration.add(response.timings.duration);
    sleep(0.4);
  });

  group('单个记录查询', function () {
    const id = generateRandomSupplierId();
    const response = http.get(`${BASE_URL}/api/scm/suppliers/${id}`, {
      headers,
      tags: { name: 'single_record_query' },
    });
    
    check(response, {
      '状态码为200或404': (r) => r.status === 200 || r.status === 404,
    });
    
    dbQueries.add(1);
    dbQueryDuration.add(response.timings.duration);
    sleep(0.2);
  });

  group('并发创建操作', function () {
    const randomId = Math.floor(Math.random() * 1000000);
    const supplierData = {
      name: `批量测试供应商_${randomId}`,
      short_name: `BATCH_${randomId}`,
      contact_name: `批量联系人_${randomId}`,
      contact_phone: `139${randomId.toString().padStart(8, '0')}`,
      email: `batch_${randomId}@example.com`,
      address: `批量地址_${randomId}`,
      bank_account: `622203${randomId.toString().padStart(10, '0')}`,
      tax_number: `92${randomId.toString().padStart(12, '0')}`,
    };
    
    const response = http.post(`${BASE_URL}/api/scm/suppliers`, JSON.stringify(supplierData), {
      headers,
      tags: { name: 'concurrent_create' },
    });
    
    check(response, {
      '状态码为200': (r) => r.status === 200,
    });
    
    dbQueries.add(1);
    dbQueryDuration.add(response.timings.duration);
    sleep(0.8);
  });
}

export function handleSummary(data) {
  const metrics = {
    'total_db_queries': data.metrics.db_queries.value,
    'avg_query_duration_ms': data.metrics.db_query_duration.values.avg,
    'p95_query_duration_ms': data.metrics.db_query_duration.values.p95,
    'p99_query_duration_ms': data.metrics.db_query_duration.values.p99,
    'total_requests': data.metrics.http_reqs.value,
    'avg_response_time_ms': data.metrics.http_req_duration.values.avg,
    'p95_response_time_ms': data.metrics.http_req_duration.values.p95,
    'p99_response_time_ms': data.metrics.http_req_duration.values.p99,
  };

  console.log('===== 数据库性能测试报告 =====');
  console.log(`总数据库查询数: ${metrics.total_db_queries}`);
  console.log(`平均查询耗时: ${metrics.avg_query_duration_ms.toFixed(2)}ms`);
  console.log(`P95 查询耗时: ${metrics.p95_query_duration_ms.toFixed(2)}ms`);
  console.log(`P99 查询耗时: ${metrics.p99_query_duration_ms.toFixed(2)}ms`);
  console.log(`总请求数: ${metrics.total_requests}`);
  console.log(`平均响应时间: ${metrics.avg_response_time_ms.toFixed(2)}ms`);
  console.log(`P95 响应时间: ${metrics.p95_response_time_ms.toFixed(2)}ms`);
  console.log(`P99 响应时间: ${metrics.p99_response_time_ms.toFixed(2)}ms`);
  console.log('===============================');

  return {
    'stdout': JSON.stringify(metrics, null, 2),
    'database-performance-report.json': JSON.stringify(metrics, null, 2),
  };
}
