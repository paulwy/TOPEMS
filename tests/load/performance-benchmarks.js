export const performanceBenchmarks = {
  api: {
    responseTime: {
      average: 100,
      median: 80,
      p95: 200,
      p99: 500,
      unit: 'milliseconds',
    },
    throughput: {
      requestsPerSecond: 1000,
      maxConcurrentRequests: 500,
      unit: 'req/s',
    },
    errorRate: {
      max: 0.01,
      unit: 'percentage',
    },
  },
  frontend: {
    pageLoad: {
      firstContentfulPaint: 1500,
      largestContentfulPaint: 3000,
      timeToInteractive: 3000,
      totalBlockingTime: 300,
      cumulativeLayoutShift: 0.1,
      unit: 'milliseconds',
    },
    apiCalls: {
      average: 200,
      p95: 500,
      unit: 'milliseconds',
    },
    renderTime: {
      componentMount: 100,
      listRender: 500,
      unit: 'milliseconds',
    },
  },
  concurrentUsers: {
    normal: 100,
    peak: 500,
    unit: 'users',
  },
  database: {
    queryTime: {
      average: 50,
      p95: 100,
      p99: 200,
      unit: 'milliseconds',
    },
    connectionPool: {
      max: 100,
      idleTimeout: 30000,
      unit: 'connections',
    },
  },
};

export const performanceGoals = {
  api: {
    description: 'API Response Time Benchmarks',
    targets: [
      { metric: 'Average Response Time', target: '< 100ms', critical: false },
      { metric: '95th Percentile', target: '< 200ms', critical: true },
      { metric: '99th Percentile', target: '< 500ms', critical: true },
      { metric: 'Throughput', target: '> 1000 req/s', critical: false },
      { metric: 'Error Rate', target: '< 1%', critical: true },
    ],
  },
  frontend: {
    description: 'Frontend Performance Benchmarks',
    targets: [
      { metric: 'First Contentful Paint', target: '< 1.5s', critical: false },
      { metric: 'Largest Contentful Paint', target: '< 3s', critical: true },
      { metric: 'Time to Interactive', target: '< 3s', critical: true },
      { metric: 'Cumulative Layout Shift', target: '< 0.1', critical: false },
    ],
  },
  concurrency: {
    description: 'Concurrent User Benchmarks',
    targets: [
      { metric: 'Normal Load', target: '> 100 users', critical: false },
      { metric: 'Peak Load', target: '> 500 users', critical: true },
      { metric: 'Graceful Degradation', target: 'Maintain 80% performance at peak', critical: true },
    ],
  },
};

export function evaluatePerformance(data, benchmarks) {
  const results = {
    passed: [],
    failed: [],
    warnings: [],
  };

  if (data.http_req_duration?.values?.avg < benchmarks.api.responseTime.average) {
    results.passed.push({ metric: 'Average API Response', value: data.http_req_duration.values.avg });
  } else {
    results.failed.push({ metric: 'Average API Response', value: data.http_req_duration.values.avg });
  }

  if (data.http_req_duration?.values?.['p(95)'] < benchmarks.api.responseTime.p95) {
    results.passed.push({ metric: '95th Percentile Response', value: data.http_req_duration.values['p(95)'] });
  } else {
    results.failed.push({ metric: '95th Percentile Response', value: data.http_req_duration.values['p(95)'] });
  }

  return results;
}
