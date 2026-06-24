# TOPEMS 故障排查指南

## 目录

- [故障排查方法论](#故障排查方法论)
- [服务无法启动](#服务无法启动)
- [服务无响应](#服务无响应)
- [数据库连接问题](#数据库连接问题)
- [认证授权问题](#认证授权问题)
- [性能问题](#性能问题)
- [网络问题](#网络问题)
- [常见错误码](#常见错误码)

---

## 故障排查方法论

### 排查步骤

1. **确认问题范围**
   - 单个服务还是多个服务？
   - 所有用户还是部分用户受影响？
   - 间歇性问题还是持续性问题？

2. **收集信息**
   - 查看服务日志
   - 检查系统资源
   - 验证网络连通性

3. **定位根因**
   - 使用排除法逐步缩小范围
   - 检查最近的变更记录

4. **实施修复**
   - 优先恢复服务
   - 避免引入新问题

5. **验证与复盘**
   - 确认问题已解决
   - 记录解决过程

### 排查工具

```bash
# 服务状态
systemctl status topems-portal

# 进程状态
ps aux | grep topems

# 网络连接
ss -tlnp
netstat -tlnp

# 磁盘空间
df -h

# 内存使用
free -h

# 进程资源
top -Hp <pid>
```

---

## 服务无法启动

### 症状

```bash
$ systemctl start topems-portal
Job for topems-portal.service failed because the control process exited with error code.
```

### 排查步骤

#### 1. 查看服务日志

```bash
# 查看详细错误信息
journalctl -u topems-portal -n 100 --no-pager

# 实时跟踪日志
journalctl -u topems-portal -f
```

#### 2. 常见原因及解决方案

**端口被占用**

```bash
# 检查端口占用
ss -tlnp | grep 8080

# 或
lsof -i :8080

# 解决方案：终止占用进程或修改配置使用其他端口
```

**配置文件错误**

```bash
# 检查环境变量
cat /opt/topems/config/.env | grep -v PASSWORD

# 验证配置文件语法
/opt/topems/bin/portal-service --check-config
```

**依赖服务未启动**

```bash
# 检查数据库连接
psql "$DATABASE_URL" -c "SELECT 1"

# 检查 Redis 连接
redis-cli -u "$REDIS_URL" ping
```

**权限问题**

```bash
# 检查文件权限
ls -la /opt/topems/logs/
ls -la /opt/topems/data/

# 修复权限
chown -R topems:topems /opt/topems/logs
chmod 755 /opt/topems/logs
```

**缺少依赖库**

```bash
# 检查动态链接库
ldd /opt/topems/bin/portal-service

# 检查 Rust 运行时
rustc --version
```

---

## 服务无响应

### 症状

- HTTP 请求超时
- 服务响应时间过长
- 健康检查失败

### 排查步骤

#### 1. 检查服务进程

```bash
# 查看进程状态
ps aux | grep topems-portal

# 查看进程资源使用
top -Hp $(pgrep -f topems-portal)
```

#### 2. 检查线程状态

```bash
# 查看线程堆栈
cat /proc/$(pgrep -f topems-portal)/stack

# 查看打开的文件描述符
ls -la /proc/$(pgrep -f topems-portal)/fd | head -20
```

#### 3. 检查系统资源

```bash
# CPU 使用
top

# 内存使用
free -h

# 磁盘 I/O
iostat -x 1 5

# 网络连接数
ss -s
```

#### 4. 检查连接数

```bash
# 数据库连接
psql -h localhost -U topems -c "
SELECT count(*) as connections, state
FROM pg_stat_activity
GROUP BY state;
"

# Tomcat 连接池（如使用）
curl localhost:8080/actuator/health
```

### 常见原因

| 原因 | 症状 | 解决方案 |
|------|------|----------|
| CPU 满载 | 所有请求变慢 | 增加资源或扩展服务 |
| 内存不足 | OOM Kill | 增加内存，优化使用 |
| 数据库连接池满 | 请求排队 | 调整连接池大小 |
| 死锁 | 特定操作无响应 | 查看锁日志 |
| 外部依赖超时 | 间歇性无响应 | 增加超时时间 |

---

## 数据库连接问题

### 症状

```
Error: could not connect to database: connection refused
```

### 排查步骤

#### 1. 检查数据库服务

```bash
# 检查 PostgreSQL 状态
systemctl status postgresql

# 检查端口监听
ss -tlnp | grep 5432
```

#### 2. 测试连接

```bash
# 使用 psql 连接
psql -h localhost -p 5432 -U topems -d topems

# 使用环境变量
export PGPASSWORD=your_password
psql "$DATABASE_URL"
```

#### 3. 检查连接数

```bash
# 查看当前连接数
psql -h localhost -U topems -c "SELECT count(*) FROM pg_stat_activity;"

# 查看最大连接数
psql -h localhost -U topems -c "SHOW max_connections;"

# 终止空闲连接
psql -h localhost -U topems -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < now() - interval '30 minutes';
"
```

#### 4. 检查认证配置

```bash
# 查看 pg_hba.conf
cat /etc/postgresql/14/main/pg_hba.conf

# 典型配置（允许本地连接）
# local   all             all                                     trust
# host    all             all             127.0.0.1/32            md5
```

### 解决方案

**修改 pg_hba.conf 后重载**

```bash
systemctl reload postgresql
```

**增加最大连接数**

```sql
-- 临时修改
ALTER SYSTEM SET max_connections = 300;

-- 重启生效
systemctl restart postgresql
```

---

## 认证授权问题

### JWT 认证失败

#### 症状

```json
{
  "error": "invalid_token",
  "error_description": "Token is expired"
}
```

#### 排查步骤

```bash
# 检查 JWT 密钥配置
grep JWT_SECRET /opt/topems/config/.env

# 验证 token 过期时间
# 查看服务日志中的 token 签发记录
journalctl -u topems-portal | grep -i token
```

#### 解决方案

```bash
# 清除旧 token（用户重新登录）
# 或修改 JWT_SECRET 后重启所有服务
```

### 权限不足

#### 症状

```json
{
  "error": "access_denied",
  "message": "Insufficient permissions"
}
```

#### 排查步骤

```bash
# 检查用户角色
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/users/me

# 检查服务间认证配置
grep IAM_SERVICE_URL /opt/topems/config/.env
```

---

## 性能问题

### 响应延迟

#### 排查步骤

```bash
# 检查慢请求日志
grep -E "(slow|timeout)" /opt/topems/logs/*.log | tail -50

# 查看数据库慢查询
psql -h localhost -U topems -c "
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
"

# 检查外部依赖响应时间
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/api/health
```

#### curl-format.txt 示例

```text
\n  Time Total: %{time_total}s\n
  DNS Lookup: %{time_namelookup}s\n
  Connect: %{time_connect}s\n
  App Connect: %{time_appconnect}s\n
  Redirect: %{time_redirect}s\n
  Start Transfer: %{time_starttransfer}s\n
```

### 高 CPU 使用

```bash
# 查看 CPU 使用最高的进程
top

# 查看特定进程的线程
top -Hp <pid>

# 生成火焰图（需要 perf）
perf record -F 99 -p <pid> -g -- sleep 30
perf script > out.perf
```

### 内存泄漏

```bash
# 监控内存使用趋势
watch -n 5 'ps -o pid,rss,vsz,%mem,cmd -p $(pgrep topems-portal)'

# 检查内存分配
pmap -x <pid> | tail -20
```

---

## 网络问题

### 服务间通信失败

```bash
# 测试网络连通性
curl -v http://portal:8080/health

# 检查 DNS 解析
nslookup portal
dig portal

# 检查路由
ip route

# 检查防火墙规则
iptables -L -n
```

### DNS 解析问题

```bash
# 检查 /etc/resolv.conf
cat /etc/resolv.conf

# 测试 DNS 解析
host google.com
nslookup portal
```

### 连接超时

```bash
# 增加超时时间测试
curl --connect-timeout 10 \
     --max-time 30 \
     http://localhost:8080/health

# 检查连接跟踪
cat /proc/net/nf_conntrack | grep <port>
```

---

## 常见错误码

### HTTP 错误码

| 状态码 | 含义 | 常见原因 |
|--------|------|----------|
| 400 | 请求错误 | 参数格式错误、缺少必填字段 |
| 401 | 未认证 | Token 缺失或过期 |
| 403 | 禁止访问 | 权限不足 |
| 404 | 未找到 | 资源不存在 |
| 429 | 请求过多 | 触发限流 |
| 500 | 服务器错误 | 内部异常 |
| 502 | 网关错误 | 后端服务不可用 |
| 503 | 服务不可用 | 服务过载或维护 |
| 504 | 网关超时 | 后端响应超时 |

### 数据库错误码

| 错误码 | 含义 | 解决方案 |
|--------|------|----------|
| 28P01 | 认证失败 | 检查用户名密码 |
| 08006 | 连接失败 | 检查连接配置 |
| 08001 | 连接拒绝 | 检查端口和防火墙 |
| 23505 | 唯一约束冲突 | 检查数据唯一性 |
| 23503 | 外键约束失败 | 检查关联数据 |
| 40001 | 死锁 | 重试事务 |

### 日志关键词

| 关键词 | 含义 |
|--------|------|
| `connection refused` | 连接被拒绝，检查服务是否运行 |
| `connection timed out` | 连接超时，检查网络 |
| `out of memory` | 内存不足，增加内存或优化 |
| `too many connections` | 连接数过多，等待或增加限制 |
| `table does not exist` | 表不存在，检查数据库迁移 |
| `permission denied` | 权限不足，检查用户权限 |

---

## 紧急恢复

### 服务完全不可用

```bash
# 1. 检查基础设施
systemctl status postgresql
systemctl status redis

# 2. 重启所有服务
systemctl restart topems.target

# 3. 检查端口
ss -tlnp | grep -E "(8080|8001)"

# 4. 验证服务
curl http://localhost:8080/health
```

### 数据库损坏

```bash
# 1. 停止所有服务
systemctl stop topems.target

# 2. 检查数据库
pg_dump "$DATABASE_URL" > /tmp/check_backup.dump

# 3. 如果检查失败，尝试修复
psql -h localhost -U topems -c "REINDEX DATABASE topems;"
psql -h localhost -U topems -c "VACUUM FULL;"

# 4. 从备份恢复（如需要）
pg_restore -h localhost -U topems -d topems /path/to/backup.dump
```

---

## 相关文档

- [部署指南](./deployment-guide.md)
- [数据库维护指南](./database-maintenance.md)
- [监控告警运维指南](./monitoring-alerting.md)
- [日志管理指南](./logging-guide.md)
