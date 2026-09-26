# TOPEMS 服务稳定性最佳实践

**版本：** v1.0.0  
**最后更新：** 2026-08-28  
**适用对象：** 运维工程师、SRE、系统管理员、开发人员

---

## 目录

1. [概述](#1-概述)
2. [服务部署最佳实践](#2-服务部署最佳实践)
3. [Systemd 服务配置优化](#3-systemd-服务配置优化)
4. [健康检查机制](#4-健康检查机制)
5. [服务监控与告警](#5-服务监控与告警)
6. [自动恢复机制](#6-自动恢复机制)
7. [性能优化](#7-性能优化)
8. [安全加固](#8-安全加固)
9. [故障排查指南](#9-故障排查指南)
10. [应急预案](#10-应急预案)

---

## 1. 概述

### 1.1 目标

本文档提供 TOPEMS 系统服务稳定性的最佳实践，帮助运维团队提高服务可用性（目标：99.9%+），减少故障发生概率，缩短故障恢复时间，建立标准化的运维流程。

### 1.2 服务清单

| 服务名称 | 端口 | 说明 | 优先级 |
|---------|------|------|--------|
| topems-ai | 8013 | AI 智能服务 | P0 |
| topems-srm | 8011 | 供应商关系管理 | P1 |
| topems-pm | 8012 | 项目管理 | P1 |
| topems-analytics | 8014 | 数据分析服务 | P1 |
| topems-master-data | 8015 | 主数据管理 | P1 |
| topems-mobile | 8016 | 移动端服务 | P2 |
| topems-ehs | 8017 | 环境健康安全 | P2 |
| topems-pdm | 8018 | 产品数据管理 | P2 |
| topems-rd | 8019 | 研发管理 | P2 |

---

## 2. 服务部署最佳实践

### 2.1 部署前检查清单

- 服务器资源满足最低要求（CPU、内存、磁盘）
- 操作系统已更新到稳定版本
- 依赖服务已安装并正常运行（PostgreSQL、Redis、Nginx）
- 网络端口已开放（防火墙规则）
- DNS 解析正常
- SSL 证书已配置（如使用 HTTPS）
- 备份策略已配置
- 监控代理已安装

### 2.2 部署流程

1. **准备阶段**：备份当前版本，通知相关团队，准备回滚方案
2. **部署阶段**：停止服务，备份配置和数据，部署新版本，更新配置，启动服务
3. **验证阶段**：检查服务状态，检查健康检查，检查日志，执行冒烟测试，监控 15 分钟
4. **完成阶段**：通知团队部署完成，更新部署记录，监控 24 小时

---

## 3. Systemd 服务配置优化

### 3.1 关键配置项

```ini
[Service]
# 重启策略
Restart=always
RestartSec=5
StartLimitBurst=5
StartLimitIntervalSec=60

# 超时设置
TimeoutStartSec=30
TimeoutStopSec=30

# 资源限制
LimitNOFILE=65536
LimitNPROC=4096

# OOM 评分调整
OOMScoreAdjust=-500

# 安全加固
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
```

### 3.2 服务管理命令

```bash
systemctl start topems-ai      # 启动
systemctl stop topems-ai       # 停止
systemctl restart topems-ai    # 重启
systemctl status topems-ai     # 状态
journalctl -u topems-ai -f     # 实时日志
systemctl daemon-reload         # 重新加载配置
```

---

## 4. 健康检查机制

### 4.1 健康检查端点

| 端点 | 说明 | 预期响应 |
|------|------|---------|
| `/health` | 基础健康检查 | HTTP 200 |
| `/health/detailed` | 详细健康检查 | HTTP 200，包含各组件状态 |
| `/ready` | 就绪检查 | HTTP 200 或 503 |
| `/metrics` | Prometheus 指标 | HTTP 200 |

### 4.2 健康检查脚本

```bash
# 检查所有服务
./scripts/deploy/service-monitor.sh

# 只检查 AI 服务
./scripts/deploy/service-monitor.sh --service ai

# 显示状态摘要
./scripts/deploy/service-monitor.sh --status

# 自动重启异常服务
./scripts/deploy/service-monitor.sh --auto-restart
```

---

## 5. 服务监控与告警

### 5.1 关键监控指标

| 指标类别 | 关键指标 | 告警阈值 |
|---------|---------|---------|
| 服务可用性 | 服务状态 | 宕机立即告警 |
| 性能 | API p95 响应时间 | > 2 秒 |
| 错误率 | 5xx 错误率 | > 5% |
| 资源 | CPU 使用率 | > 80% |
| 资源 | 内存使用率 | > 80% |
| 资源 | 磁盘使用率 | > 80% |

### 5.2 监控工具栈

- Prometheus：指标采集和存储
- Grafana：数据可视化
- Alertmanager：告警管理
- Loki：日志聚合

---

## 6. 自动恢复机制

### 6.1 自动重启

Systemd 配置 `Restart=always` 实现服务崩溃后自动重启。

### 6.2 健康检查自动恢复

使用 cron 定时检查：

```bash
*/5 * * * * /opt/topems/scripts/service-monitor.sh --auto-restart >> /var/log/topems/monitor.log 2>&1
```

### 6.3 守护进程模式

```bash
nohup ./scripts/deploy/service-monitor.sh --daemon --auto-restart &
```

---

## 7. 性能优化

### 7.1 应用层优化

- 连接池：合理配置数据库连接池大小
- 缓存：使用 Redis 缓存热点数据
- 异步处理：耗时操作使用异步队列
- 批量操作：减少数据库交互次数
- 索引优化：为常用查询字段创建索引

### 7.2 数据库优化

PostgreSQL 关键配置：
- `shared_buffers`：总内存的 25%
- `effective_cache_size`：总内存的 50-75%
- `work_mem`：根据查询复杂度调整

### 7.3 操作系统优化

```bash
ulimit -n 65536
sysctl -w net.core.somaxconn=65535
sysctl -w vm.swappiness=10
```

### 7.4 Rust 应用优化

- 发布构建：`cargo build --release`
- 配置 Tokio 工作线程：`TOKIO_WORKER_THREADS=4`
- 开启 LTO：在 `Cargo.toml` 中配置 `lto = true`

---

## 8. 安全加固

### 8.1 系统安全

- 定期更新系统和软件包
- 禁用不必要的服务和端口
- 配置防火墙规则
- 使用 SSH 密钥认证
- 配置 fail2ban

### 8.2 服务安全

- 使用非 root 用户运行服务
- 配置 Systemd 安全选项
- 敏感配置文件权限：`chmod 600`
- 使用 HTTPS 加密通信
- 配置 API 认证和授权

### 8.3 数据安全

- 定期备份数据库
- 备份文件加密存储
- 敏感数据加密存储
- 配置审计日志

---

## 9. 故障排查指南

### 9.1 通用排查步骤

1. 确认问题：查看服务状态、健康检查、最近日志
2. 收集信息：错误日志、系统资源、依赖服务状态、变更记录
3. 定位原因：分析错误日志、检查资源瓶颈、检查依赖服务
4. 解决问题：优先恢复服务，记录处理过程
5. 验证恢复：确认服务正常、健康检查通过、监控指标正常

### 9.2 常见问题排查

#### 服务无法启动

```bash
systemctl status topems-ai -l
journalctl -u topems-ai -n 200
lsof -i :8013
ls -la /opt/topems/bin/ai-service
```

#### 服务频繁重启

```bash
journalctl -u topems-ai | grep "Started\|Stopped\|Failed"
journalctl -u topems-ai | grep -i "error\|panic\|fatal\|oom"
dmesg | grep -i "oom\|killed"
```

#### 响应时间过长

```bash
top
htop
iostat
sudo -u postgres psql -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

---

## 10. 应急预案

### 10.1 P0 级故障（服务完全不可用）

**响应时间：** 立即

1. 确认故障范围
2. 通知应急响应团队
3. 尝试快速恢复：重启服务、回滚版本、切换备用服务
4. 启动降级方案：关闭非核心功能、使用缓存数据
5. 持续监控恢复状态
6. 故障恢复后进行复盘

### 10.2 P1 级故障（核心功能受损）

**响应时间：** 15 分钟内

1. 确认受影响范围
2. 通知相关团队
3. 排查并修复问题
4. 监控恢复状态

### 10.3 回滚流程

```bash
systemctl stop topems-ai
cp -r /opt/topems/backup/ai-previous /opt/topems/svc/ai
systemctl start topems-ai
systemctl status topems-ai
curl http://localhost:8013/health
```

---

## 附录

### A. 相关文件位置

| 文件 | 位置 |
|------|------|
| Systemd 服务配置 | `/etc/systemd/system/topems-*.service` |
| 服务配置文件 | `/opt/topems/config/*.env` |
| 监控脚本 | `/opt/topems/scripts/service-monitor.sh` |
| 备份目录 | `/opt/topems/backup/` |

### B. 常用命令速查

```bash
systemctl status topems-ai          # 查看状态
systemctl restart topems-ai         # 重启服务
journalctl -u topems-ai -f          # 实时日志
curl http://localhost:8013/health   # 健康检查
top                                    # CPU/内存
df -h                                  # 磁盘
free -h                                # 内存
```

### C. 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0.0 | 2026-08-28 | 初始版本 |

---

*本文档最后更新于 2026-08-28*
