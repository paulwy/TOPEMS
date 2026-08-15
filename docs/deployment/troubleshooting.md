# TOPEMS 故障排查手册

> 常见问题的诊断和解决方案

## 目录

- [服务启动问题](#服务启动问题)
- [端口问题](#端口问题)
- [数据库问题](#数据库问题)
- [AI 服务问题](#ai-服务问题)
- [前端问题](#前端问题)
- [性能问题](#性能问题)
- [认证问题](#认证问题)
- [文件存储问题](#文件存储问题)

## 服务启动问题

### 问题：服务无法启动

**症状**：服务启动后立即退出或无法启动

**排查步骤**：

```bash
# 1. 查看服务日志
./scripts/topems.sh logs

# 2. 检查具体服务的日志
./scripts/topems.sh logs hrm

# 3. 检查端口占用
lsof -i :8020

# 4. 检查数据库连接
psql -U topems -d topems -c "SELECT 1"

# 5. 检查环境变量
cat .env | grep -E "(DATABASE|JWT|SERVER)"

# 6. 手动启动服务，查看错误
cd svc/hrm
cargo run --release
```

**常见原因**：
- 数据库未启动或连接失败
- 环境变量配置错误
- 端口被占用
- JWT 密钥未设置

---

### 问题：编译错误

**症状**：`cargo build` 失败

**排查步骤**：

```bash
# 1. 更新 Rust 工具链
rustup update

# 2. 清理并重新编译
cargo clean
cargo build --release

# 3. 检查特定服务的依赖
cd svc/hrm
cargo build --release 2>&1 | tail -50
```

**常见原因**：
- Rust 版本过低（需要 1.70+）
- 依赖版本冲突
- 缺少系统依赖（OpenSSL、PostgreSQL 客户端库）

---

## 端口问题

### 问题：端口被占用

**症状**：服务启动时提示 `Address already in use`

**排查步骤**：

```bash
# 1. 查找占用端口的进程
lsof -i :8000
lsof -i :8013

# 2. 强制终止占用进程
lsof -ti :8000 | xargs kill -9

# 3. 批量清理 TOPEMS 端口
for port in 8000 8010 8011 8013 8020 8023 8029 8030 8031 8040 8041 8042 8050 8051 8052 8053 8060 8061 8063 8070 8071 8072; do
  lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null
done

# 4. 使用 topems.sh 强制重启
./scripts/topems.sh start --force
```

---

### 问题：端口冲突（8021 不可用）

**症状**：某些端口被系统保留，无法使用

**解决方案**：
- 使用端口分配规则中预留的端口（如 8023 而非 8021）
- 参考 [端口分配规则](../architecture/ports.md)

**预防措施**：
- 启动前检查端口可用性：`lsof -i :<port>`
- 使用 `config/services.yaml` 统一管理端口

---

## 数据库问题

### 问题：数据库连接失败

**症状**：`connection refused` 或 `authentication failed`

**排查步骤**：

```bash
# 1. 检查 PostgreSQL 状态
sudo systemctl status postgresql
# 或使用 Docker
docker ps | grep postgres

# 2. 测试连接
psql -U topems -d topems -c "SELECT 1"

# 3. 检查数据库是否存在
psql -U postgres -c "\l"

# 4. 检查用户权限
psql -U topems -d topems -c "\du"

# 5. 检查防火墙
sudo ufw status
```

**解决方案**：

```bash
# 创建数据库
sudo -u postgres psql << 'EOF'
CREATE USER topems WITH PASSWORD 'topems_secret';
CREATE DATABASE topems OWNER topems;
ALTER USER topems CREATEDB;
EOF

# 重启服务
./scripts/topems.sh restart
```

---

### 问题：数据库迁移失败

**症状**：表不存在或列不存在的错误

**排查步骤**：

```bash
# 1. 查看迁移状态
psql -U topems -d topems -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 10;"

# 2. 手动执行迁移
psql -U topems -d topems -f migrations/001_init.sql

# 3. 重置数据库（慎用！）
dropdb topems
createdb topems -O topems
cargo run --bin topems-unified-core -- --migrate
```

---

### 问题：连接池耗尽

**症状**：`connection pool timeout` 错误

**解决方案**：

```bash
# 在 .env 中调整连接池配置
DATABASE_MAX_CONNECTIONS=50
DATABASE_MIN_CONNECTIONS=10
DATABASE_CONNECTION_TIMEOUT=30s
```

---

## AI 服务问题

### 问题：AI 服务无响应

**症状**：`/api/ai/chat` 请求超时或失败

**排查步骤**：

```bash
# 1. 检查 Ollama 是否运行
curl http://localhost:11434/api/tags

# 2. 检查 AI 服务状态
curl http://localhost:8013/health

# 3. 检查环境变量
cat .env | grep -E "(OLLAMA|AI)"

# 4. 启动 Ollama
ollama serve

# 5. 拉取模型
ollama pull qwen2.5:7b-instruct
ollama pull nomic-embed-text

# 6. 查看 AI 服务日志
./scripts/topems.sh logs ai
```

---

### 问题：AI 响应慢

**症状**：AI 响应时间超过 30 秒

**解决方案**：

```bash
# 1. 使用更小的模型
OLLAMA_MODEL=qwen2.5:3b-instruct

# 2. 增加超时时间
AI_TIMEOUT=120s

# 3. 启用 GPU 加速（如果有 GPU）
# 参考 Ollama 文档配置 GPU

# 4. 优化 prompt
# 减少 prompt 长度，提高响应速度
```

---

## 前端问题

### 问题：前端无法访问

**症状**：浏览器无法打开前端页面

**排查步骤**：

```bash
# 1. 检查前端服务
curl http://localhost:3000

# 2. 检查前端进程
ps aux | grep vite

# 3. 查看前端日志
cd apps/web
pnpm dev

# 4. 清除缓存重新安装
cd apps/web
rm -rf node_modules .vite
pnpm install
pnpm dev
```

---

### 问题：API 请求 404

**症状**：前端调用 API 返回 404

**排查步骤**：

```bash
# 1. 检查后端服务是否运行
./scripts/topems.sh status

# 2. 检查 Vite 代理配置
cat apps/web/vite.config.ts | grep proxy

# 3. 直接访问后端 API
curl http://localhost:8000/api/iam/auth/login

# 4. 检查特定服务的 API
curl http://localhost:8010/api/erp/assets?page=1&pagesize=20
curl http://localhost:8020/api/hrm/employees
```

**常见原因**：
- 后端服务未启动或端口错误
- Vite 代理配置缺失或错误
- API 路径前缀问题（双重前缀）

**解决方案**：

```bash
# 启动缺失的服务
./scripts/topems.sh start erp
./scripts/topems.sh start hrm

# 验证代理配置
cat apps/web/vite.config.ts | grep -A5 "erp"
cat apps/web/vite.config.ts | grep -A5 "hrm"
```

---

### 问题：插件注册失败

**症状**：服务启动后注册到 unified-core 失败

**排查步骤**：

```bash
# 1. 检查 unified-core 是否运行
./scripts/topems.sh status iam

# 2. 检查注册接口
curl -s -X POST "http://localhost:8000/api/core/plugin/dev/plugins/test/register" \
  -H "Content-Type: application/json" \
  -d '{"code":"test","name":"Test","description":"Test","version":"0.1.0","runtime_url":"http://localhost:9999","permissions":[]}'

# 3. 检查服务日志
./scripts/topems.sh logs iam 100
```

**常见原因**：
- unified-core 未运行
- 注册接口需要认证（已修复，移到公共路由）
- 网络问题

**解决方案**：

```bash
# 确保 unified-core 先启动
./scripts/topems.sh start iam

# 等待统一核心服务启动后再启动其他服务
sleep 3
./scripts/topems.sh start-all
```

---

### 问题：前端构建失败

**症状**：`pnpm build` 失败

**排查步骤**：

```bash
# 1. 清理缓存
cd apps/web
rm -rf node_modules .vite dist
pnpm install
pnpm build

# 2. 检查 Node.js 版本（需要 18+）
node --version

# 3. 检查依赖
pnpm outdated
```

---

## 性能问题

### 问题：服务响应慢

**排查步骤**：

```bash
# 1. 查看系统资源
top
htop

# 2. 查看服务日志中的慢查询
grep -E "slow|timeout" logs/*.log

# 3. 检查数据库慢查询
psql -U topems -d topems -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# 4. 启用连接池监控
DATABASE_DEBUG=true
```

**优化建议**：

```sql
-- PostgreSQL 优化
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET work_mem = '64MB';
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
ALTER SYSTEM SET effective_cache_size = '12GB';
```

---

### 问题：内存占用高

**排查步骤**：

```bash
# 1. 查看进程内存占用
ps aux --sort=-%mem | head -10

# 2. 查看 Docker 容器资源使用
docker stats

# 3. 调整 JVM 堆内存（如适用）
export RUST_BACKTRACE=1
```

---

## 认证问题

### 问题：JWT Token 无效

**症状**：`401 Unauthorized`

**排查步骤**：

```bash
# 1. 清除浏览器缓存和 localStorage

# 2. 重新登录获取新 Token
curl -X POST http://localhost:8000/api/iam/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 3. 检查 JWT 密钥配置
cat .env | grep JWT_SECRET

# 4. 检查 Token 是否过期
# Token 默认 24 小时过期
```

---

### 问题：Token 刷新失败

**症状**：Token 刷新接口返回错误

**排查步骤**：

```bash
# 1. 检查 refresh_token 是否过期
# refresh_token 默认 7 天过期

# 2. 重新登录
curl -X POST http://localhost:8000/api/iam/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 3. 检查 JWT 配置
cat .env | grep -E "JWT_"
```

---

## 文件存储问题

### 问题：文件上传失败

**症状**：文件上传接口返回 500

**排查步骤**：

```bash
# 1. 检查存储目录权限
ls -la storage/files
mkdir -p storage/files
chmod 755 storage/files

# 2. 检查磁盘空间
df -h

# 3. 检查文件大小限制
cat .env | grep MAX_UPLOAD_SIZE

# 4. 查看服务日志
./scripts/topems.sh logs core
```

---

### 问题：文件下载失败

**症状**：下载链接返回 404 或 403

**排查步骤**：

```bash
# 1. 检查文件是否存在
ls -la storage/files/

# 2. 检查文件权限
chmod 644 storage/files/*

# 3. 检查静态文件服务配置
cat docker/nginx.conf | grep location
```

---

## Docker 相关问题

### 问题：容器无法启动

**排查步骤**：

```bash
# 1. 查看容器状态
docker compose ps

# 2. 查看容器日志
docker compose logs unified-core

# 3. 重新构建
docker compose build unified-core
docker compose up -d unified-core

# 4. 进入容器调试
docker compose exec unified-core bash
```

---

### 问题：容器间网络不通

**排查步骤**：

```bash
# 1. 检查网络
docker network ls
docker network inspect topems_default

# 2. 测试容器间连通性
docker compose exec unified-core ping postgres
docker compose exec unified-core ping redis

# 3. 检查 DNS 解析
docker compose exec unified-core nslookup postgres
```

---

## 日志分析

### 查看实时日志

```bash
# 所有服务
./scripts/topems.sh logs

# 特定服务
./scripts/topems.sh logs hrm

# 最近的日志
./scripts/topems.sh logs hrm --tail 100

# 跟踪日志
./scripts/topems.sh logs hrm -f
```

### 搜索错误日志

```bash
# 搜索错误
grep -r "ERROR\|FATAL" logs/

# 搜索特定服务错误
grep "ERROR" logs/hrm.log | tail -20

# 统计错误数量
grep -c "ERROR" logs/*.log
```

---

## 常用诊断命令

```bash
# 服务状态
./scripts/topems.sh status

# 端口占用
lsof -i :8000

# 进程列表
ps aux | grep topems

# 系统资源
top
htop
df -h
free -h

# 网络连接
netstat -tuln | grep LISTEN
ss -tuln

# 数据库状态
psql -U topems -d topems -c "SELECT * FROM pg_stat_activity;"

# Redis 状态
redis-cli ping
redis-cli info

# Docker 状态
docker ps
docker stats
```

---

## 获取更多帮助

- 查看 [部署指南](./deployment-guide-overview.md)
- 查看 [API 文档](../api/README.md)
- 查看 [架构设计](../architecture/overview.md)
- 查看 [环境配置](../getting-started/environment-config.md)
- 提交 Issue: https://github.com/your-org/topems/issues
