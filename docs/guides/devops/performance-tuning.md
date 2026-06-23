# TOPEMS 性能调优指南

## 概述

本文档介绍 TOPEMS 平台的性能调优方法，包括数据库、服务、前端等多个层面的优化建议。

## 性能指标

### 关键指标

| 指标 | 目标 | 监控方式 |
|------|------|----------|
| API 响应时间 (P95) | < 200ms | Prometheus |
| API 响应时间 (P99) | < 500ms | Prometheus |
| 服务可用性 | > 99.9% | 健康检查 |
| 数据库查询时间 (P95) | < 50ms | pg_stat_statements |
| 缓存命中率 | > 90% | Redis INFO |
| 并发用户数 | > 1000 | 负载测试 |
| CPU 使用率 | < 70% | 系统监控 |
| 内存使用率 | < 80% | 系统监控 |

### 监控工具

```bash
# Prometheus + Grafana
- 服务指标 (actix-web-prom, axum-prometheus)
- 数据库指标 (pg_exporter)
- Redis 指标 (redis_exporter)
- 系统指标 (node_exporter)
```

---

## 数据库优化

### PostgreSQL 优化

#### 配置参数

```ini
# /etc/postgresql/14/main/postgresql.conf

# 内存配置
shared_buffers = 4GB              # 系统内存的 25%
effective_cache_size = 12GB       # 系统内存的 75%
work_mem = 64MB                   # 复杂查询使用
maintenance_work_mem = 1GB        # 维护操作使用

# 并行查询
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

# WAL 配置
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 2GB
min_wal_size = 512MB

# 连接配置
max_connections = 200
superuser_reserved_connections = 5

# 查询规划
random_page_cost = 1.1             # SSD
effective_io_concurrency = 200    # SSD
```

#### 索引优化

```sql
-- B-tree 索引（默认）
CREATE INDEX idx_employees_department_id ON employees(department_id);
CREATE INDEX idx_employees_hire_date ON employees(hire_date);

-- 复合索引
CREATE INDEX idx_employees_dept_status ON employees(department_id, status);

-- 部分索引
CREATE INDEX idx_active_employees ON employees(id) WHERE status = 'active';

-- 表达式索引
CREATE INDEX idx_employees_lower_email ON employees(LOWER(email));

-- GIN 索引（全文搜索）
CREATE INDEX idx_documents_content ON documents USING gin(to_tsvector('chinese', content));

-- 查看索引使用情况
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

#### 查询优化

```sql
-- 1. 避免 SELECT *
SELECT id, name, email FROM employees WHERE id = 1;

-- 2. 使用 LIMIT
SELECT * FROM employees ORDER BY created_at DESC LIMIT 20;

-- 3. 使用 EXISTS 替代 IN
SELECT * FROM departments d
WHERE EXISTS (SELECT 1 FROM employees e WHERE e.department_id = d.id);

-- 4. 使用 JOIN 替代子查询
SELECT e.*, d.name as dept_name
FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE e.status = 'active';

-- 5. 使用 EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM employees WHERE department_id = 1 AND status = 'active';
```

#### 连接池配置

```toml
# Cargo.toml - SQLx
[dependencies.sqlx]
features = ["runtime-tokio-rustls", "postgres", "pool"]

# 配置
DATABASE_MAX_CONNECTIONS=50
DATABASE_MIN_CONNECTIONS=10
DATABASE_CONNECTION_TIMEOUT=30s
DATABASE_IDLE_TIMEOUT=600s
DATABASE_MAX_LIFETIME=3600s
```

```rust
// Rust 代码
let pool = PgPoolOptions::new()
    .max_connections(50)
    .min_connections(10)
    .acquire_timeout(Duration::from_secs(30))
    .idle_timeout(Some(Duration::from_secs(600)))
    .max_lifetime(Some(Duration::from_secs(3600)))
    .connect(&database_url)
    .await?;
```

#### 分区表

```sql
-- 按时间分区（适用于日志、订单等大表）
CREATE TABLE orders (
    id BIGSERIAL,
    order_no VARCHAR(50),
    created_at TIMESTAMPTZ,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 创建月度分区
CREATE TABLE orders_2026_06 PARTITION OF orders
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE orders_2026_07 PARTITION OF orders
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- 自动创建分区（使用 pg_partman 扩展）
```

---

## Redis 优化

### 配置优化

```conf
# /etc/redis/redis.conf

# 内存配置
maxmemory 2gb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# 持久化
save 900 1
save 300 10
save 60 10000

appendonly yes
appendfsync everysec
no-appendfsync-on-rewrite yes

# 网络
tcp-backlog 511
timeout 300
tcp-keepalive 60

# 慢查询
slowlog-log-slower-than 10000
slowlog-max-len 128
```

### 缓存策略

```rust
// 1. 缓存读取模式
async fn get_user(id: i64, db: &PgPool, redis: &RedisClient) -> Result<User> {
    // 先查缓存
    let cache_key = format!("user:{}", id);
    if let Some(cached) = redis.get(&cache_key).await? {
        return Ok(serde_json::from_str(&cached)?);
    }
    
    // 缓存未命中，查数据库
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
        .fetch_one(db)
        .await?;
    
    // 写入缓存
    redis.setex(&cache_key, 3600, &serde_json::to_string(&user)?).await?;
    
    Ok(user)
}

// 2. 缓存更新模式
async fn update_user(id: i64, data: UpdateUser, db: &PgPool, redis: &RedisClient) -> Result<User> {
    let user = sqlx::query_as!(User, "UPDATE users SET ... WHERE id = $1 RETURNING *", id)
        .fetch_one(db)
        .await?;
    
    // 更新或删除缓存
    let cache_key = format!("user:{}", id);
    redis.setex(&cache_key, 3600, &serde_json::to_string(&user)?).await?;
    
    Ok(user)
}

// 3. 缓存预热
async fn warmup_cache(db: &PgPool, redis: &RedisClient) -> Result<()> {
    let users = sqlx::query_as!(User, "SELECT * FROM users WHERE status = 'active'")
        .fetch_all(db)
        .await?;
    
    for user in users {
        let key = format!("user:{}", user.id);
        redis.setex(&key, 3600, &serde_json::to_string(&user)?).await?;
    }
    
    Ok(())
}
```

### 缓存击穿防护

```rust
// 使用分布式锁防止缓存击穿
async fn get_user_with_lock(id: i64, db: &PgPool, redis: &RedisClient) -> Result<User> {
    let cache_key = format!("user:{}", id);
    let lock_key = format!("lock:user:{}", id);
    
    // 1. 查询缓存
    if let Some(cached) = redis.get(&cache_key).await? {
        return Ok(serde_json::from_str(&cached)?);
    }
    
    // 2. 尝试获取锁
    let lock_acquired = redis.set_nx(&lock_key, "1", 10).await?;
    
    if lock_acquired {
        // 3. 查询数据库
        let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
            .fetch_one(db)
            .await?;
        
        // 4. 写入缓存
        redis.setex(&cache_key, 3600, &serde_json::to_string(&user)?).await?;
        
        // 5. 释放锁
        redis.del(&lock_key).await?;
        
        Ok(user)
    } else {
        // 等待并重试
        tokio::time::sleep(Duration::from_millis(100)).await;
        Box::pin(get_user_with_lock(id, db, redis)).await
    }
}
```

---

## Rust 服务优化

### 异步优化

```rust
// 1. 并发处理独立任务
async fn load_dashboard(user_id: i64) -> Result<Dashboard> {
    let (user, orders, notifications) = tokio::try_join!(
        get_user(user_id),
        get_recent_orders(user_id),
        get_unread_notifications(user_id)
    )?;
    
    Ok(Dashboard { user, orders, notifications })
}

// 2. 批量处理
async fn batch_create_employees(employees: Vec<Employee>) -> Result<()> {
    const BATCH_SIZE: usize = 100;
    
    for chunk in employees.chunks(BATCH_SIZE) {
        let mut tx = pool.begin().await?;
        for emp in chunk {
            sqlx::query("INSERT INTO employees ...").execute(&mut *tx).await?;
        }
        tx.commit().await?;
    }
    
    Ok(())
}

// 3. 流式处理
use futures::stream::{self, StreamExt};

async fn process_large_dataset() -> Result<()> {
    let mut stream = sqlx::query_as::<_, Record>("SELECT * FROM records")
        .fetch(&pool);
    
    while let Some(record) = stream.next().await {
        let record = record?;
        process(record).await?;
    }
    
    Ok(())
}
```

### 内存优化

```rust
// 1. 避免不必要的克隆
fn process_string(s: &str) -> String {
    s.to_uppercase()  // 不需要 clone
}

// 2. 使用 Cow 减少分配
use std::borrow::Cow;

fn maybe_modify(s: &str) -> Cow<str> {
    if s.contains("foo") {
        Cow::Owned(s.replace("foo", "bar"))
    } else {
        Cow::Borrowed(s)
    }
}

// 3. 使用智能指针
use std::sync::Arc;

let shared_data = Arc::new(expensive_data);
let data_clone = Arc::clone(&shared_data);  // 不复制数据
```

### 编译优化

```toml
# Cargo.toml
[profile.release]
opt-level = 3             # 最高优化
lto = "fat"              # 链接时优化
codegen-units = 1        # 单代码生成单元（更激进的优化）
strip = true             # 去除符号
panic = "abort"          # 移除 unwinding 代码
incremental = false      # 发布版本不使用增量编译

# 优化依赖
[profile.release.package."*"]
opt-level = 3
```

---

## AI 服务优化

### Ollama 配置

```bash
# 1. 启用 GPU（如果可用）
OLLAMA_NUM_GPU=1
OLLAMA_GPU_LAYERS=35

# 2. 调整上下文长度
OLLAMA_NUM_CTX=4096

# 3. 并发请求
OLLAMA_NUM_PARALLEL=4

# 4. 模型量化
# 使用 Q4_K_M 量化的模型，体积更小，速度更快
ollama pull qwen2.5:7b-instruct-q4_K_M
```

### 缓存策略

```rust
// 1. 响应缓存
async fn ai_chat_with_cache(prompt: &str) -> Result<String> {
    let cache_key = format!("ai:chat:{}", hash(prompt));
    
    if let Some(cached) = redis.get(&cache_key).await? {
        return Ok(cached);
    }
    
    let response = ollama.chat(prompt).await?;
    redis.setex(&cache_key, 3600, &response).await?;
    
    Ok(response)
}

// 2. Embedding 缓存
async fn get_embedding(text: &str) -> Result<Vec<f32>> {
    let cache_key = format!("ai:emb:{}", hash(text));
    
    if let Some(cached) = redis.get(&cache_key).await? {
        return Ok(serde_json::from_str(&cached)?);
    }
    
    let embedding = ollama.embed(text).await?;
    redis.setex(&cache_key, 86400, &serde_json::to_string(&embedding)?).await?;
    
    Ok(embedding)
}
```

---

## 前端优化

### Vite 构建优化

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { splitVendorChunkPlugin } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',
    
    rollupOptions: {
      output: {
        // 拆分 vendor
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'antd-vendor': ['antd'],
          'utils-vendor': ['axios', 'dayjs', 'lodash'],
        },
      },
    },
    
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    
    // 启用现代模式
    target: 'es2020',
    
    // 压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    
    // 分块策略
    chunkSizeWarningLimit: 1000,
  },
  
  // 优化开发体验
  server: {
    hmr: { overlay: false },
  },
  
  // 预构建优化
  optimizeDeps: {
    include: ['react', 'react-dom', 'antd'],
  },
});
```

### React 组件优化

```typescript
// 1. 使用 memo 避免不必要的重渲染
import { memo } from 'react';

const EmployeeCard = memo(({ employee }: Props) => {
  return <div>{employee.name}</div>;
});

// 2. 使用 useMemo 和 useCallback
import { useMemo, useCallback } from 'react';

function EmployeeList({ employees }: Props) {
  const sorted = useMemo(
    () => [...employees].sort((a, b) => a.name.localeCompare(b.name)),
    [employees]
  );
  
  const handleClick = useCallback((id: number) => {
    console.log('Clicked', id);
  }, []);
  
  return <div>{sorted.map(e => <EmployeeCard key={e.id} employee={e} onClick={handleClick} />)}</div>;
}

// 3. 虚拟列表
import { VirtualList } from '@arco-design/web-react';

function LargeList({ items }: Props) {
  return (
    <VirtualList
      data={items}
      itemHeight={50}
      height={500}
      renderItem={(item) => <div>{item.name}</div>}
    />
  );
}

// 4. 懒加载
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const EmployeeList = lazy(() => import('./pages/EmployeeList'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/employees" element={<EmployeeList />} />
      </Routes>
    </Suspense>
  );
}
```

### 数据获取优化

```typescript
// 1. 请求去重
const cache = new Map();

function fetchWithCache(url: string) {
  if (cache.has(url)) {
    return cache.get(url);
  }
  
  const promise = fetch(url).then(r => r.json());
  cache.set(url, promise);
  
  return promise;
}

// 2. 请求合并
import { useEffect } from 'react';

function useEmployees(ids: number[]) {
  const [employees, setEmployees] = useState([]);
  
  useEffect(() => {
    const params = ids.map(id => `ids[]=${id}`).join('&');
    fetch(`/api/hrm/employees?${params}`)
      .then(r => r.json())
      .then(data => setEmployees(data.data.list));
  }, [ids]);
  
  return employees;
}

// 3. SWR / React Query
import useSWR from 'swr';

function useEmployee(id: number) {
  const { data, error } = useSWR(
    `/api/hrm/employees/${id}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,  // 1 分钟内去重
    }
  );
  
  return { employee: data, isLoading: !error && !data, isError: error };
}
```

### 资源优化

```typescript
// 1. 图片懒加载
<img src={url} loading="lazy" alt="" />

// 2. 路由级代码分割
const routes = [
  { path: '/', component: () => import('./pages/Home') },
  { path: '/employees', component: () => import('./pages/Employees') },
];

// 3. 预加载关键资源
<link rel="preload" href="/critical.css" as="style" />
<link rel="preload" href="/api/data" as="fetch" crossOrigin="anonymous" />
```

---

## Nginx 优化

```nginx
# nginx.conf

# 工作进程数
worker_processes auto;
worker_rlimit_nofile 65535;

# 事件模型
events {
    use epoll;
    worker_connections 4096;
    multi_accept on;
}

# HTTP 配置
http {
    # 基础
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;
    
    # 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # 客户端缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 上游服务配置
    upstream unified-core {
        server 127.0.0.1:8000;
        keepalive 32;
    }
    
    # 限流
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://unified-core;
    }
}
```

---

## 监控与告警

### Prometheus 指标

```rust
// Cargo.toml
[dependencies]
axum-prometheus = "0.4"

// main.rs
use axum_prometheus::PrometheusMetricLayer;

let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
let app = Router::new()
    .route("/metrics", get(|| async move { metric_handle.render() }))
    .layer(prometheus_layer);
```

### 关键告警

```yaml
# alertmanager.yml
groups:
  - name: topems_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        annotations:
          summary: "API 错误率超过 10%"
      
      - alert: SlowResponse
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 0.5
        for: 5m
        annotations:
          summary: "P95 响应时间超过 500ms"
      
      - alert: HighCPUUsage
        expr: cpu_usage_percent > 80
        for: 10m
        annotations:
          summary: "CPU 使用率超过 80%"
      
      - alert: HighMemoryUsage
        expr: memory_usage_percent > 85
        for: 5m
        annotations:
          summary: "内存使用率超过 85%"
      
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count > 150
        for: 5m
        annotations:
          summary: "数据库连接数超过 150"
```

---

## 性能测试

### K6 脚本

```javascript
// tests/performance/sustained_load.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 500 },
    { duration: '5m', target: 1000 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>1000'],
  },
};

export default function () {
  // 模拟真实用户操作
  const token = login();
  
  const responses = http.batch([
    ['GET', 'http://localhost:8000/api/iam/users/me', null, { headers: { Authorization: `Bearer ${token}` }}],
    ['GET', 'http://localhost:8020/api/hrm/employees', null, { headers: { Authorization: `Bearer ${token}` }}],
    ['GET', 'http://localhost:8064/api/ai/models', null, { headers: { Authorization: `Bearer ${token}` }}],
  ]);
  
  check(responses[0], {
    'user info OK': (r) => r.status === 200,
  });
}
```

---

## 性能优化清单

### 数据库
- [ ] 配置合适的连接池大小
- [ ] 添加必要的索引
- [ ] 优化慢查询
- [ ] 使用连接池监控
- [ ] 启用查询计划分析
- [ ] 定期 VACUUM 和 ANALYZE
- [ ] 大表分区

### Redis
- [ ] 配置合理的 maxmemory
- [ ] 选择合适的淘汰策略
- [ ] 启用持久化
- [ ] 使用 Pipeline 减少网络往返
- [ ] 避免大 Key
- [ ] 使用连接池

### Rust 服务
- [ ] 使用 tokio::join! 并发
- [ ] 启用编译优化
- [ ] 使用连接池
- [ ] 避免不必要的克隆
- [ ] 启用 LTO
- [ ] 启用 Prometheus 指标

### AI 服务
- [ ] 启用响应缓存
- [ ] 启用 Embedding 缓存
- [ ] 使用量化模型
- [ ] 配置 GPU 加速（如果有）
- [ ] 限流保护

### 前端
- [ ] 路由级代码分割
- [ ] 组件懒加载
- [ ] 图片懒加载
- [ ] 启用 Gzip
- [ ] 启用浏览器缓存
- [ ] 优化关键渲染路径
- [ ] 减少包体积

### Nginx
- [ ] 启用 Gzip
- [ ] 启用 keepalive
- [ ] 启用 HTTP/2
- [ ] 配置限流
- [ ] 静态资源缓存

---

## 相关文档

- [部署指南 - 性能优化](./deployment-guide.md#性能优化)
- [架构设计 - 数据层](./architecture/overview.md#数据库设计)
- [故障排查 - 性能问题](./TROUBLESHOOTING.md#性能问题)
- [集成测试指南](./INTEGRATION_TESTING.md)
