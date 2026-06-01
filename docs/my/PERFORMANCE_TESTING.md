# 性能测试指南

## 概述

本文档提供 TOPEMS 文档管理服务的性能测试指南，包括测试工具、测试用例和最佳实践。

## 测试工具

### 1. k6

[k6](https://k6.io/) 是一个现代化的负载测试工具，使用 JavaScript 编写测试脚本。

**安装 k6：**
```bash
# macOS (Homebrew)
brew install k6

# 使用 Docker
docker pull grafana/k6
```

### 2. Apache Bench (ab)

Apache Bench 是一个简单的 HTTP 基准测试工具。

**安装 ab：**
```bash
# macOS (Homebrew)
brew install httpd

# Ubuntu/Debian
sudo apt-get install apache2-utils
```

### 3. wrk

[wrk](https://github.com/wg/wrk) 是一个高性能的 HTTP 基准测试工具。

**安装 wrk：**
```bash
# macOS (Homebrew)
brew install wrk

# 从源码编译
git clone https://github.com/wg/wrk.git
cd wrk
make
```

## 测试场景

### 1. 健康检查端点

**目标：** 验证服务基本响应性能

**k6 脚本：**
```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 50,
  duration: '30s',
};

export default function () {
  const res = http.get('http://localhost:8001/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
```

**运行测试：**
```bash
k6 run health-check.js
```

### 2. 文件列表端点

**目标：** 测试分页查询性能

**前置条件：** 确保有有效的 JWT token

**k6 脚本：**
```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 0 },
  ],
};

const TOKEN = 'YOUR_JWT_TOKEN_HERE';
const params = {
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
  },
};

export default function () {
  const res = http.get('http://localhost:8001/api/v1/files?page=1&page_size=20', params);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

### 3. 文件上传端点

**目标：** 测试大文件上传性能

**k6 脚本：**
```javascript
import http from 'k6/http';
import { check } from 'k6';
import { FormData } from 'https://jslib.k6.io/formdata/0.4.2/index.js';

export const options = {
  vus: 10,
  duration: '1m',
};

const TOKEN = 'YOUR_JWT_TOKEN_HERE';
const params = {
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
  },
};

const testFile = open('./test-file.txt', 'b');

export default function () {
  const fd = new FormData();
  fd.append('file', http.file(testFile, 'test-file.txt', 'text/plain'));
  
  const res = http.post('http://localhost:8001/api/v1/files', fd.body(), {
    headers: Object.assign({}, params.headers, fd.headers()),
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
```

### 4. 混合负载场景

**目标：** 模拟真实用户行为

**k6 脚本：**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

const TOKEN = 'YOUR_JWT_TOKEN_HERE';
const params = {
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
  },
};

export default function () {
  // 1. 列出文件
  let res = http.get('http://localhost:8001/api/v1/files', params);
  check(res, { 'list files ok': (r) => r.status === 200 });
  sleep(1);
  
  // 2. 获取文件详情 (随机选择一个 ID)
  // 注意：实际测试中需要处理真实的文件 ID
  // res = http.get('http://localhost:8001/api/v1/files/' + fileId, params);
  // check(res, { 'get file ok': (r) => r.status === 200 });
  // sleep(0.5);
}
```

## 性能指标

### 关键指标

| 指标 | 描述 | 目标值 |
|------|------|--------|
| 响应时间 (p95) | 95% 请求的响应时间 | < 500ms |
| 响应时间 (p99) | 99% 请求的响应时间 | < 1000ms |
| 错误率 | 失败请求占比 | < 1% |
| 吞吐量 | 每秒处理请求数 | 根据配置调整 |
| 并发用户数 | 同时在线用户数 | 根据预期负载 |

### 服务资源监控

测试期间需要监控以下指标：

- CPU 使用率
- 内存使用量
- 磁盘 I/O
- 网络带宽
- 数据库连接数
- 数据库查询性能

## 测试前准备

1. **配置环境**
   ```bash
   # 复制环境配置
   cp .env.example .env
   # 根据需要修改配置
   ```

2. **启动服务**
   ```bash
   cd platform/topems-doc/backend
   cargo run --release
   ```

3. **准备测试数据**
   - 创建测试文件
   - 准备 JWT token
   - 预热服务

4. **设置监控**
   - 使用 `top` 或 `htop` 监控系统资源
   - 配置日志输出级别

## 性能优化建议

### 1. 数据库优化
- 使用连接池
- 添加适当的索引
- 优化查询语句
- 考虑使用缓存

### 2. 应用优化
- 使用 release 模式编译
- 启用 HTTP/2
- 配置适当的线程数
- 实现请求限流

### 3. 存储优化
- 使用 CDN 分发静态文件
- 实现文件压缩
- 考虑使用对象存储服务

## 结果报告模板

每次性能测试后，记录以下信息：

```
# 性能测试报告

## 测试信息
- 测试日期: YYYY-MM-DD
- 测试版本: v1.x.x
- 测试人员: Name

## 测试环境
- CPU: ...
- 内存: ...
- 存储: ...
- 网络: ...

## 测试结果
- 最大并发用户数: ...
- 平均响应时间: ...
- P95 响应时间: ...
- P99 响应时间: ...
- 错误率: ...
- 吞吐量 (RPS): ...

## 结论
- 通过/不通过
- 发现的问题
- 改进建议
```

## 参考资料

- [k6 官方文档](https://k6.io/docs/)
- [Axum 性能优化指南](https://github.com/tokio-rs/axum)
- [PostgreSQL 性能优化](https://www.postgresql.org/docs/current/performance-tips.html)
