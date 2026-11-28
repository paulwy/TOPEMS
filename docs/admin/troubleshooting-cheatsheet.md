# TOPEMS 故障排查速查表

> **环境边界（2026-11-13 实测）**：本文命令按 **Linux + systemd** 模板编写，**不是当前本机生产**。当前 xingzhai 生产机为 **macOS launchd**：`com.topems.server`（`/Users/xingzhai/topems/bin/topems-server`，`:8099`）+ `com.topems.nginx`（80/443 直接 `proxy_pass http://127.0.0.1:8099`，无 upstream 块），生产库 `topems_prod`（`ehs` 71 表）；文中 `topems` 库、`/etc/systemd`、`/var/log/nginx` 等为 Linux 模板/历史示例。当前生产排障以 `docs/deploy/macos-production-ops.md` 为准（nginx 用 `/opt/homebrew/bin/nginx -t|-T`，日志在 `~/topems/nginx/logs/`）。

## 快速索引

| 问题类型 | 快速定位 | 解决方案 |
|---------|---------|---------|
| 服务无法启动 | `systemctl status` + `journalctl` | 检查配置、端口、依赖 |
| 服务响应慢 | `top` + 慢查询日志 | 优化数据库、缓存、代码 |
| 服务频繁重启 | `dmesg` + 内存监控 | 修复内存泄漏、增加资源 |
| 502 Bad Gateway | Nginx 错误日志 | 检查后端服务状态 |
| 503 Service Unavailable | 服务状态 + 连接数 | 增加资源、限流 |
| 数据库连接失败 | `mysql -e "SELECT 1"` | 检查服务、连接数、网络 |
| Redis 连接失败 | `redis-cli ping` | 检查服务、内存、网络 |
| 登录失败 | 应用日志 + 认证服务 | 检查用户状态、密码、Token |
| AI 无响应 | AI 服务日志 + 网络 | 检查 API Key、配额、网络 |

---

## 1. 服务问题

### 1.1 服务无法启动

**检查命令：**
```bash
systemctl status topems-backend
journalctl -u topems-backend -n 50 --no-pager
tail -50 /var/log/topems/backend.log
```

**常见原因及解决：**

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `Address already in use` | 端口被占用 | `lsof -i :8013` 找到占用进程，停止或更换端口 |
| `Access denied` | 权限不足 | 检查文件权限，使用正确用户运行 |
| `Connection refused` | 依赖服务未启动 | 启动 MySQL/Redis 等依赖服务 |
| `Config file not found` | 配置文件缺失 | 检查配置文件路径和内容 |
| `No space left on device` | 磁盘空间不足 | 清理磁盘空间，扩容 |
| `FATAL: password authentication failed` | 数据库密码错误 | 检查配置文件中的数据库密码 |

### 1.2 服务响应慢

**检查命令：**
```bash
# 系统资源
top -c
free -h
df -h
iostat -x 1 5

# 应用性能
curl -w "DNS: %{time_namelookup}s\nConnect: %{time_connect}s\nTTFB: %{time_starttransfer}s\nTotal: %{time_total}s\n" http://localhost:8013/health

# 数据库
mysql -e "SHOW PROCESSLIST;"
mysql -e "SHOW STATUS LIKE 'Slow_queries';"

# 缓存
redis-cli INFO stats | grep keyspace
```

**常见原因及解决：**

| 症状 | 原因 | 解决方案 |
|------|------|---------|
| CPU 使用率高 | 计算密集型操作 | 优化算法、异步处理、增加 CPU |
| 内存使用率高 | 内存泄漏或缓存过大 | 修复泄漏、调整缓存大小、增加内存 |
| 磁盘 IO 高 | 大量数据库写入 | 优化查询、增加缓存、升级磁盘 |
| 数据库慢查询多 | 缺少索引或查询低效 | 添加索引、优化 SQL、读写分离 |
| 缓存命中率低 | 缓存策略不当 | 优化缓存键、增加缓存容量、调整过期时间 |
| AI 响应慢 | AI 服务负载高 | 增加 AI 服务实例、优化提示词、使用缓存 |

### 1.3 服务频繁重启

**检查命令：**
```bash
# 查看重启历史
journalctl -u topems-backend | grep -E "Started|Stopped|Main process"

# 检查 OOM
dmesg | grep -i "oom\|killed process"
journalctl -k | grep -i oom

# 内存监控
free -s 5
ps aux --sort=-%mem | head -10
```

**常见原因及解决：**

| 症状 | 原因 | 解决方案 |
|------|------|---------|
| OOM Killer 杀死进程 | 内存不足 | 增加内存、优化内存使用、限制进程内存 |
| 健康检查失败 | 服务无响应 | 增加超时时间、优化启动速度、修复假死 |
| 未捕获异常 | 代码 Bug | 查看错误日志、修复 Bug、增加异常处理 |
| 依赖服务断开 | 数据库/Redis 重启 | 增加重连机制、优化依赖管理 |

---

## 2. HTTP 错误

### 2.1 5xx 错误

| 错误码 | 含义 | 排查方向 |
|--------|------|---------|
| 500 | 内部服务器错误 | 应用异常、代码 Bug、数据库错误 |
| 502 | 错误网关 | 后端服务未启动、Nginx 配置错误 |
| 503 | 服务不可用 | 服务过载、维护中、连接池满 |
| 504 | 网关超时 | 后端响应超时、网络延迟 |

**502 Bad Gateway 排查：**
```bash
# 检查后端服务
systemctl status topems-backend
curl http://localhost:8013/health

# 检查 Nginx
nginx -t
tail -50 /var/log/nginx/error.log

# 检查端口
netstat -tlnp | grep 8013
```

**macOS 生产（当前实际，2026-11-13 实测）：**
```bash
# 服务是 launchd，不是 systemd；nginx 用 brew 绝对路径，日志在项目目录
launchctl print gui/$(id -u)/com.topems.server | grep -E "state|pid"
curl -s http://127.0.0.1:8099/health
/opt/homebrew/bin/nginx -t
tail -50 /Users/xingzhai/topems/nginx/logs/error.log
lsof -nP -iTCP:8099 -sTCP:LISTEN
```

**504 Gateway Timeout 排查：**
```bash
# 测试后端响应时间
curl -w "Total: %{time_total}s\n" http://localhost:8013/slow-endpoint

# 检查 Nginx 超时配置
grep -r "timeout" /etc/nginx/conf.d/topems.conf

# 检查后端慢请求
grep "slow" /var/log/topems/backend.log | tail -20
```

### 2.2 4xx 错误

| 错误码 | 含义 | 排查方向 |
|--------|------|---------|
| 400 | 请求错误 | 参数格式错误、缺少必填参数 |
| 401 | 未授权 | Token 缺失、Token 过期、Token 无效 |
| 403 | 禁止访问 | 权限不足、IP 被封禁 |
| 404 | 未找到 | URL 错误、资源不存在 |
| 429 | 请求过多 | 触发限流、超过配额 |

**401 Unauthorized 排查：**
```bash
# 检查 Token 是否正确
curl -H "Authorization: Bearer <token>" http://localhost:8013/api/users/me

# 检查 Token 过期时间
# 解码 JWT 查看 exp 字段

# 检查认证服务状态
systemctl status topems-backend
grep "auth\|token" /var/log/topems/backend.log | tail -20
```

**429 Too Many Requests 排查：**
```bash
# 检查限流配置
grep -r "rate_limit\|throttle" /etc/topems/

# 检查 Redis 中的限流计数
redis-cli keys "*rate*limit*"

# 临时提高限流阈值（谨慎操作）
# 修改配置文件后重启服务
```

---

## 3. 数据库问题

### 3.1 连接问题

**检查命令：**
```bash
# 服务状态
systemctl status mysql

# 连接测试
mysql -h <host> -u <user> -p -e "SELECT 1;"

# 连接数
mysql -e "SHOW STATUS LIKE 'Threads_connected';"
mysql -e "SHOW VARIABLES LIKE 'max_connections';"

# 错误日志
tail -50 /var/log/mysql/error.log
```

**常见错误：**

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| `Can't connect to MySQL server` | 服务未启动或网络不通 | 启动服务、检查防火墙、检查网络 |
| `Too many connections` | 连接数达到上限 | 增加 max_connections、优化连接池、检查连接泄漏 |
| `Access denied for user` | 用户名或密码错误 | 检查凭据、重置密码、检查主机权限 |
| `Unknown database` | 数据库不存在 | 创建数据库、检查配置中的数据库名 |
| `Lost connection to MySQL server` | 连接超时或网络中断 | 增加超时时间、检查网络、优化长查询 |

### 3.2 性能问题

**检查命令：**
```bash
# 慢查询
mysql -e "SHOW STATUS LIKE 'Slow_queries';"
mysql -e "SHOW VARIABLES LIKE 'slow_query%';"

# 当前查询
mysql -e "SHOW PROCESSLIST;"
mysql -e "SHOW FULL PROCESSLIST;"

# 表状态
mysql -e "SHOW TABLE STATUS FROM topems;"

# 索引使用
mysql -e "SHOW INDEX FROM users;"
```

**优化方法：**

| 问题 | 解决方案 |
|------|---------|
| 慢查询 | 使用 EXPLAIN 分析、添加索引、优化 SQL |
| 锁等待 | 优化事务、减少锁持有时间、使用更低隔离级别 |
| 连接数高 | 优化连接池、检查连接泄漏、增加 max_connections |
| 磁盘 IO 高 | 增加缓存、优化查询、升级硬件、读写分离 |
| 主从延迟 | 优化主库写入、增加从库资源、使用并行复制 |

---

## 4. Redis 问题

### 4.1 连接问题

**检查命令：**
```bash
# 服务状态
systemctl status redis

# 连接测试
redis-cli -h <host> -p <port> ping

# 连接信息
redis-cli INFO clients | grep connected

# 错误日志
tail -50 /var/log/redis/redis-server.log
```

### 4.2 性能问题

**检查命令：**
```bash
# 内存使用
redis-cli INFO memory | grep used_memory_human
redis-cli INFO memory | grep maxmemory_human

# 缓存命中率
redis-cli INFO stats | grep keyspace_hits
redis-cli INFO stats | grep keyspace_misses

# 慢日志
redis-cli SLOWLOG GET 10

# 大键
redis-cli --bigkeys
```

**常见问题：**

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 内存不足 | 数据过多或内存泄漏 | 增加内存、设置 maxmemory、优化数据结构 |
| 缓存命中率低 | 缓存策略不当 | 优化键设计、增加容量、调整过期策略 |
| 响应慢 | 大键或慢命令 | 拆分大键、避免 KEYS、使用 SCAN |
| 连接数高 | 连接泄漏 | 检查客户端、优化连接池、增加 maxclients |

---

## 5. 认证和权限问题

### 5.1 登录失败

**检查命令：**
```bash
# 查看应用日志
grep -i "login\|auth\|password" /var/log/topems/backend.log | tail -20

# 检查用户状态
mysql -e "SELECT id, username, is_active, last_login FROM topems.users WHERE username='testuser';"

# 检查登录尝试
mysql -e "SELECT * FROM topems.login_attempts ORDER BY created_at DESC LIMIT 10;"
```

**常见原因：**

| 症状 | 原因 | 解决方案 |
|------|------|---------|
| 用户名或密码错误 | 凭据错误 | 重置密码、检查大小写 |
| 账号被锁定 | 多次登录失败 | 等待解锁或管理员解锁 |
| 账号已禁用 | 管理员禁用 | 联系管理员启用账号 |
| Token 过期 | 会话超时 | 重新登录、检查 Token 过期时间 |
| Token 无效 | Token 被篡改或撤销 | 重新登录、检查 Token 签名 |

### 5.2 权限不足

**检查命令：**
```bash
# 检查用户角色
mysql -e "SELECT u.username, r.name FROM topems.users u JOIN topems.user_roles ur ON u.id=ur.user_id JOIN topems.roles r ON ur.role_id=r.id WHERE u.username='testuser';"

# 检查角色权限
mysql -e "SELECT r.name, p.name FROM topems.roles r JOIN topems.role_permissions rp ON r.id=rp.role_id JOIN topems.permissions p ON rp.permission_id=p.id WHERE r.name='admin';"
```

---

## 6. AI 服务问题

### 6.1 AI 无响应

**检查命令：**
```bash
# 检查 AI 服务配置
grep -i "ai\|openai\|llm" /etc/topems/backend.env

# 检查 AI 服务日志
grep -i "ai\|llm\|openai" /var/log/topems/backend.log | tail -20

# 测试 AI 服务连通性
curl -w "HTTP %{http_code} Time: %{time_total}s\n" https://api.openai.com/v1/models
```

**常见原因：**

| 症状 | 原因 | 解决方案 |
|------|------|---------|
| API Key 无效 | Key 错误或过期 | 更新 API Key、检查环境变量 |
| 配额不足 | 超过 API 配额 | 升级套餐、等待配额重置、优化使用 |
| 网络不通 | 防火墙或代理问题 | 检查网络、配置代理、测试连通性 |
| 响应超时 | AI 服务慢或请求过大 | 增加超时、优化提示词、减少上下文 |
| 内容被拒绝 | 触发内容安全策略 | 修改提示词、检查输入内容 |

### 6.2 AI 响应质量差

**优化方向：**
- 优化提示词（Prompt Engineering）
- 增加上下文信息
- 使用更高级的模型
- 调整温度（temperature）参数
- 增加 Few-shot 示例

---

## 7. 网络问题

### 7.1 网络不通

**检查命令：**
```bash
# 基本连通性
ping <host>
traceroute <host>

# 端口连通性
telnet <host> <port>
nc -zv <host> <port>

# DNS 解析
nslookup <domain>
dig <domain>

# 防火墙
iptables -L -n
ufw status
```

### 7.2 网络慢

**检查命令：**
```bash
# 网络延迟
ping -c 10 <host>

# 带宽测试
iperf3 -c <server>

# 网络连接
netstat -an | grep ESTABLISHED | wc -l
ss -s

# 网络接口
ifconfig
ip addr
ethtool <interface>
```

---

## 8. 紧急恢复命令

### 8.1 服务恢复

```bash
# 重启所有服务
systemctl restart topems-backend topems-web nginx

# 强制重启（如服务无响应）
systemctl kill -s SIGKILL topems-backend
systemctl start topems-backend

# 清理临时文件后重启
rm -rf /tmp/topems/*
systemctl restart topems-backend
```

### 8.2 数据库恢复

```bash
# 重启数据库
systemctl restart mysql

# 修复表
mysql -e "REPAIR TABLE users;"

# 优化表
mysql -e "OPTIMIZE TABLE users;"

# 从备份恢复
mysql -u root -p topems < /backup/topems_latest.sql
```

### 8.3 缓存清理

```bash
# 清理所有缓存（谨慎操作）
redis-cli FLUSHALL

# 清理特定模式的键
redis-cli --scan --pattern "session:*" | xargs redis-cli del

# 重启 Redis
systemctl restart redis
```

### 8.4 回滚版本

```bash
# 使用回滚脚本
./scripts/deploy/rollback.sh --version v1.2.3

# 手动回滚
systemctl stop topems-backend
ln -sfn /opt/topems/v1.2.3 /opt/topems/current
systemctl start topems-backend
```

---

## 9. 联系方式

遇到无法解决的问题，请及时联系：

| 角色 | 电话 | 邮箱 | 响应时间 |
|------|------|------|---------|
| 运维值班 | | | 5 分钟 |
| 开发负责人 | | | 15 分钟 |
| 数据库管理员 | | | 30 分钟 |
| 安全负责人 | | | 30 分钟 |

---

*本文档由 TOPEMS 团队维护，最后更新：2026-08-28*
