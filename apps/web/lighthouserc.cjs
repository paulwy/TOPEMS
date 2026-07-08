module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        maxWaitForFcp: 30000,
        maxWaitForLoad: 60000,
        extraHeaders: {
          'X-User-Id': 'dev-user-1',
        },
      },
      url: [
        // 核心页面
        'http://localhost:3000/',
        'http://localhost:3000/dashboard',
        // 各模块仪表盘页面（使用前端路由，避免被代理到后端）
        'http://localhost:3000/hrm/dashboard',
        'http://localhost:3000/crm/dashboard',
        'http://localhost:3000/wms/dashboard',
        'http://localhost:3000/mes/dashboard',
        'http://localhost:3000/erp/dashboard',
        'http://localhost:3000/qms/dashboard',
        'http://localhost:3000/scm/dashboard',
      ],
    },
    assert: {
      assertions: {
        // 性能基线 - 目标 80+（当前优化后应可达）
        'categories:performance': ['warn', { minScore: 0.8 }],
        // 可访问性基线 - 目标 90+（已完成a11y优化）
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        // 最佳实践基线 - 目标 90+
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        // SEO基线 - 目标 90+
        'categories:seo': ['warn', { minScore: 0.9 }],
        // PWA - 信息收集
        'categories:pwa': ['info', { minScore: 0.7 }],

        // 关键性能指标阈值
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'interactive': ['warn', { maxNumericValue: 5000 }],

        // 资源大小预算（KB）
        'resource-summary:script:size': ['warn', { maxNumericValue: 500 }],
        'resource-summary:stylesheet:size': ['warn', { maxNumericValue: 100 }],
        'resource-summary:image:size': ['warn', { maxNumericValue: 1000 }],
        'resource-summary:total:size': ['warn', { maxNumericValue: 3000 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './reports/lighthouse',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%',
    },
  },
};
