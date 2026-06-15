# PostgreSQL 故障排查与自动修复指南

## 概述

TOPEMS CLI 已内置 PostgreSQL 数据库自动修复功能，能够自动检测并修复常见的数据库启动问题，确保服务顺利启动。

## 自动修复功能

### 检测的问题类型

| 问题类型 | 检测条件 | 修复方式 |
|---------|---------|---------|
| **PostgreSQL 未运行** | `pg_isready` 返回非就绪状态 | 自动启动 PostgreSQL 服务 |
| **残留锁文件** | `postmaster.pid` 文件存在但对应进程不存在 | 自动删除残留的 pid 文件 |
| **数据库连接超时** | 连接超时或拒绝 | 自动重试连接 |

### 自动修复流程

```
启动服务 → 检查数据库健康状态
    ↓
数据库就绪 → 继续启动服务
    ↓
数据库未就绪 → 尝试修复（最多3次）
    ↓
修复成功 → 继续启动服务
    ↓
修复失败 → 提示错误并退出
```

### 修复日志示例

```bash
$ topems start --all
检查数据库连接...
警告: PostgreSQL 未就绪: localhost:5432 - no response
尝试修复 PostgreSQL (1/3)...
已修复: 已删除残留的pid文件: /opt/homebrew/var/postgresql@18/postmaster.pid
PostgreSQL 启动成功
✓ PostgreSQL 已恢复: PostgreSQL 运行正常

准备启动所有 27 个服务...
  • iam (8000)
  ...
```

## 常见问题手动排查

### 问题1：PostgreSQL 无法启动

**现象**：
```
$ brew services start postgresql@18
Bootstrap failed: 5: Input/output error
```

**原因**：通常是 `postmaster.pid` 文件残留导致

**手动修复**：
```bash
# 检查并删除残留的pid文件
rm /opt/homebrew/var/postgresql@18/postmaster.pid

# 重启服务
brew services restart postgresql@18
```

### 问题2：数据库连接失败

**现象**：服务日志显示 `PoolTimedOut` 或连接超时

**排查步骤**：
```bash
# 1. 检查 PostgreSQL 是否运行
pg_isready -h localhost -p 5432

# 2. 检查进程状态
ps aux | grep postgres

# 3. 检查端口占用
lsof -i :5432

# 4. 查看日志
cat /opt/homebrew/var/log/postgresql@18.log
```

### 问题3：数据库认证失败

**现象**：
```
FATAL:  password authentication failed for user "topems"
```

**修复**：
```bash
# 连接到数据库
psql -h localhost -p 5432 -U postgres

# 设置密码
ALTER USER topems WITH PASSWORD 'topems_secret';
```

### 问题4：数据库不存在

**现象**：
```
FATAL:  database "topems" does not exist
```

**修复**：
```bash
# 创建数据库
createdb -h localhost -p 5432 -U topems topems
```

## 配置说明

### 默认数据库连接配置

```bash
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems
```

### PostgreSQL 服务管理

```bash
# 启动服务
brew services start postgresql@18

# 停止服务
brew services stop postgresql@18

# 重启服务
brew services restart postgresql@18

# 查看状态
brew services list | grep postgres
```

### 手动启动（调试模式）

```bash
# 手动启动 PostgreSQL（前台模式，便于调试）
postgres -D /opt/homebrew/var/postgresql@18

# 后台启动
pg_ctl -D /opt/homebrew/var/postgresql@18 start
```

## 日志位置

| 日志类型 | 路径 |
|---------|------|
| PostgreSQL 日志 | `/opt/homebrew/var/log/postgresql@18.log` |
| TOPEMS 服务日志 | `~/.topems/logs/*.log` |
| 启动脚本日志 | `~/.topems/logs/` |

## 自动修复机制说明

### 修复机制实现

1. **健康检查**：使用 `pg_isready` 命令检查数据库状态
2. **PID 文件验证**：检查 `postmaster.pid` 中的进程是否真实存在
3. **自动修复**：如果进程不存在但 pid 文件存在，则删除 pid 文件
4. **服务重启**：尝试启动 PostgreSQL 服务
5. **状态确认**：等待并验证数据库是否就绪

### 重试机制

- 最大重试次数：3 次
- 每次重试间隔：10 秒
- 重试失败后：提示错误信息并退出

## 手动修复步骤

如果自动修复失败，可以按照以下步骤手动修复：

```bash
# 1. 停止 PostgreSQL
brew services stop postgresql@18

# 2. 等待服务停止
sleep 3

# 3. 删除残留的 pid 文件
rm -f /opt/homebrew/var/postgresql@18/postmaster.pid

# 4. 启动 PostgreSQL
brew services start postgresql@18

# 5. 等待启动
sleep 5

# 6. 验证连接
pg_isready -h localhost -p 5432

# 7. 启动 TOPEMS 服务
topems start --all
```

## 预防措施

### 1. 正确关闭服务

```bash
# 使用 TOPEMS CLI 停止服务
topems stop --all

# 停止 PostgreSQL
brew services stop postgresql@18
```

### 2. 避免强制关机

强制关机可能导致：
- 数据文件损坏
- PID 文件残留
- 事务日志问题

### 3. 定期检查

```bash
# 检查 PostgreSQL 状态
brew services list | grep postgres

# 检查数据库连接
psql -h localhost -p 5432 -U topems -c "SELECT 1"
```

## 技术支持

如果自动修复和手动修复都失败，请提供以下信息：

1. PostgreSQL 日志：`/opt/homebrew/var/log/postgresql@18.log`
2. TOPEMS 服务日志：`~/.topems/logs/`
3. 系统信息：
   ```bash
   uname -a
   brew --version
   psql --version
   ```

---

**文档版本**: v1.0  
**更新时间**: 2026-06-15  
**适用范围**: TOPEMS 部署环境