# 调试指南

本文档介绍 TOPEMS 项目的调试方法和工具使用。

## 目录

- [后端调试](#后端调试)
- [前端调试](#前端调试)
- [数据库调试](#数据库调试)
- [API 调试](#api-调试)
- [常见问题排查](#常见问题排查)

---

## 后端调试

### 1. 日志调试

#### 配置日志级别

```bash
# 通过环境变量配置
export RUST_LOG=debug
export LOG_LEVEL=debug

# 或在 .env 中配置
RUST_LOG=debug
LOG_LEVEL=debug
```

#### 代码中记录日志

```rust
use tracing::{info, warn, error, debug};

async fn my_handler() {
    info!("开始处理请求");
    debug!("请求参数: {:?}", params);
    
    match some_operation().await {
        Ok(result) => {
            info!("操作成功: {:?}", result);
            Ok(result)
        }
        Err(e) => {
            error!("操作失败: {:?}", e);
            Err(e)
        }
    }
}
```

### 2. Cargo 调试

#### 使用 cargo run

```bash
# 运行开发版本
cargo run

# 传递参数
cargo run -- --port 8020

# 指定服务
cargo run -p hrm-service
```

#### 使用 cargo watch 自动重载

```bash
# 安装 cargo-watch
cargo install cargo-watch

# 监控代码变化并自动重启
cargo watch -x run
```

### 3. LLDB 调试

```bash
# 启动调试
lldb -- target/debug/my-service

# 在 lldb 中设置断点
(lldb) breakpoint set --name my_function
(lldb) breakpoint set --file handler.rs --line 42

# 运行
(lldb) run

# 查看变量
(lldb) frame variable

# 单步执行
(lldb) step
(lldb) next

# 继续执行
(lldb) continue
```

### 4. 日志查看

```bash
# 查看所有服务日志
./scripts/topems.sh logs

# 查看指定服务日志
./scripts/topems.sh logs --service iam

# 实时跟踪日志
./scripts/topems.sh logs --follow

# 查看最近 100 行日志
./scripts/topems.sh logs --tail 100
```

---

## 前端调试

### 1. 浏览器开发者工具

#### 打开方式

- Chrome: `F12` 或 `Cmd+Option+I` (macOS)
- Firefox: `F12` 或 `Cmd+Option+I` (macOS)

#### Console 面板

```javascript
// 查看变量值
console.log(user);
console.log('用户信息:', user);

// 查看对象
console.dir(user);

// 格式化输出
console.table(users);
console.table([{ name: '张三', age: 30 }]);
```

#### Network 面板

1. 打开 Network 面板
2. 筛选 API 请求：`XHR` 或 `Fetch`
3. 查看请求详情：
   - Headers：请求头和参数
   - Payload：请求体
   - Response：响应数据
   - Timing：请求耗时

### 2. React DevTools

```bash
# 安装 React DevTools
# Chrome: 搜索 "React Developer Tools" 安装扩展

# 使用
# 1. Components 面板：查看组件树和 props
# 2. Profiler 面板：分析组件渲染性能
```

### 3. Vite 调试配置

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000,
    open: true,
    // 代理配置
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

### 4. VS Code 调试配置

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Frontend",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/apps/web"
    }
  ]
}
```

### 5. Source Maps

开发环境启用 Source Maps：

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: true,
  },
  server: {
    sourcemap: true,
  },
});
```

---

## 数据库调试

### 1. PostgreSQL 连接

```bash
# 直接连接
psql postgres://topems:topems_secret@localhost:5432/topems

# 使用 psql 命令
psql -h localhost -p 5432 -U topems -d topems
```

### 2. 常用调试查询

```sql
-- 查看当前连接
SELECT * FROM pg_stat_activity;

-- 查看锁
SELECT * FROM pg_locks;

-- 查看慢查询
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- 查看表大小
SELECT pg_size_pretty(pg_total_relation_size('hrm.employees'));

-- 查看索引使用情况
SELECT * FROM pg_stat_user_indexes;
```

### 3. SQLx 调试

```bash
# 启用 SQLx 日志
export SQLX_LOG=debug

# 生成查询计划
EXPLAIN ANALYZE SELECT * FROM hrm.employees WHERE department_id = 'xxx';
```

---

## API 调试

### 1. curl 调试

```bash
# 基础请求
curl http://localhost:8000/api/v1/health

# 带认证
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/v1/users

# POST 请求
curl -X POST http://localhost:8000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"username": "test", "email": "test@example.com"}'

# 查看响应头
curl -i http://localhost:8000/api/v1/health

# 查看详细请求
curl -v http://localhost:8000/api/v1/health
```

### 2. 认证 Token 获取

```bash
# 登录获取 Token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  | jq -r '.data.token')

echo "Token: $TOKEN"

# 使用 Token 请求
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/v1/users
```

### 3. 使用 Postman/Insomnia

#### 导入集合

```json
{
  "info": {
    "name": "TOPEMS API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "http://localhost:8000/api/v1/health"
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "url": "http://localhost:8000/api/v1/auth/login",
        "body": {
          "mode": "raw",
          "raw": "{\"username\": \"admin\", \"password\": \"admin123\"}"
        }
      }
    }
  ]
}
```

---

## 常见问题排查

### 1. 服务无法启动

#### 检查端口占用

```bash
# 方法1: lsof
lsof -i :8000

# 方法2: netstat
netstat -anp | grep 8000

# 方法3: ss
ss -tlnp | grep 8000
```

#### 检查配置文件

```bash
# 验证环境变量
./scripts/topems.sh validate-env

# 检查 .env 文件
cat .env

# 手动加载配置测试
cargo run -- --check-config
```

### 2. 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
docker ps | grep postgres

# 重启 PostgreSQL
docker-compose restart postgres

# 测试连接
psql postgres://topems:topems_secret@localhost:5432/topems -c "SELECT 1;"

# 查看数据库日志
docker-compose logs postgres
```

### 3. 前端 API 请求失败

#### 检查 CORS 配置

```bash
# 检查后端 CORS 配置
grep -r "cors" svc/unified-core/src/

# 检查前端代理配置
cat apps/web/vite.config.ts
```

#### 检查网络请求

1. 打开浏览器开发者工具
2. Network 面板查看请求
3. 检查：
   - 请求 URL 是否正确
   - 请求头是否包含 Authorization
   - 响应状态码和内容

### 4. 性能问题排查

#### 后端性能

```bash
# 启用性能日志
export RUST_LOG=debug
export SQLX_LOG=debug

# 查看慢查询
SELECT * FROM pg_stat_statements 
WHERE mean_exec_time > 100 
ORDER BY mean_exec_time DESC;
```

#### 前端性能

```javascript
// 使用 Performance API
console.log('Performance:', performance.timing);

// React Profiler
// 在 React DevTools Profiler 中记录渲染
```

### 5. 内存泄漏排查

#### Rust

```bash
# 使用 cargo-bloat 分析
cargo bloat --release

# 使用 valgrind
valgrind --tool=memcheck target/release/my-service
```

#### JavaScript

```javascript
// 使用 Chrome DevTools Memory
// 1. Take Heap Snapshot
// 2. Compare Snapshots
// 3. Allocation Timeline
```

---

## 调试工具推荐

| 工具 | 用途 | 链接 |
|------|------|------|
| Postman | API 测试 | https://www.postman.com |
| Insomnia | API 测试 | https://insomnia.rest |
| TablePlus | 数据库客户端 | https://tableplus.com |
| DataGrip | 数据库 IDE | https://www.jetbrains.com/datagrip |
| Rust Analyzer | Rust IDE 支持 | VS Code 扩展 |

---

**文档版本**: v1.0
**最后更新**: 2026-06-24
