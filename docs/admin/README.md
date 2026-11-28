# TOPEMS 运维管理文档

本目录是 TOPEMS 运维人员的统一入口，按主题分为**部署指南、运维手册、监控告警、模板**四个分区。

## 当前生产事实（2026-11-13 实测）

- **服务管理**：macOS launchd，`gui/501/com.topems.server`（`KeepAlive=true`、`RunAtLoad=true`）运行 `/Users/xingzhai/topems/bin/topems-server`，监听 `:8099`。
- **反向代理**：`gui/501/com.topems.nginx` 托管 Homebrew nginx；80/443 全部直接 `proxy_pass http://127.0.0.1:8099`，**无 upstream 块**；配置 `/opt/homebrew/etc/nginx/nginx.conf`（include `servers/topems.conf`、`servers/topems-ssl.conf`），入口日志 `/Users/xingzhai/topems/nginx/logs/access.log`。排障用绝对路径 `/opt/homebrew/bin/nginx -t|-T`（非登录 SSH 的 PATH 不含 brew，裸 `nginx` 会 command not found）。
- **数据库**：生产库 `topems_prod`（`ehs` 71 表）；旧库 `topems`（65 表）**不是生产**；`_sqlx_migrations` **667** 条 success、0 失败、无重复，max `20261112190000`（统计时点 2026-11-13）。
- **适用范围**：本目录中按 Linux + systemd 编写的部署/运维文档（`/etc/systemd`、`/var/log/nginx`、`topems` 库示例）是**通用模板/历史参考**，不是本机现用生产路径；当前生产以 [release-pipeline.md](../deploy/release-pipeline.md) 与 [macos-production-ops.md](../deploy/macos-production-ops.md) 为准。

## 快速开始

```bash
# 环境要求：Rust 1.70+ / Node.js 18+ / PostgreSQL 14+ / Redis 7+

# 使用统一脚本启动全部服务
./scripts/topems.sh start-all

# 访问系统
#   前端: http://localhost:3000
#   API:  http://localhost:8013
```

---

## 一、部署指南

| 文档 | 说明 |
|------|------|
| [deployment-guide-overview.md](./deployment-guide-overview.md) | 主部署指南（总览） |
| [MODULAR_MONOLITH_DEPLOYMENT.md](./MODULAR_MONOLITH_DEPLOYMENT.md) | **模块化单体部署手册（最新架构）** |
| [microfrontend-deployment.md](./microfrontend-deployment.md) | 微前端部署说明 |
| [PRODUCTION_DEPLOYMENT_CHECKLIST.md](./PRODUCTION_DEPLOYMENT_CHECKLIST.md) | 生产部署检查清单 |
| [release-strategies.md](./release-strategies.md) | 发布策略 |
| [production-environment-setup-guide-2026-09-11.md](./production-environment-setup-guide-2026-09-11.md) | 生产环境搭建指南 |
| [rls-full-coverage-deployment-guide.md](./rls-full-coverage-deployment-guide.md) | RLS 全量覆盖部署指南 |
| [AI_BUSINESS_INTELLIGENCE_DEPLOYMENT_GUIDE.md](./AI_BUSINESS_INTELLIGENCE_DEPLOYMENT_GUIDE.md) | AI 商业智能部署指南 |

### PostgreSQL 专项

| 文档 | 说明 |
|------|------|
| [postgresql-deployment-runbook.md](./postgresql-deployment-runbook.md) | PostgreSQL 部署 Runbook |
| [postgresql-production-config-checklist-2026-09-11.md](./postgresql-production-config-checklist-2026-09-11.md) | 生产配置检查清单 |
| [postgresql-production-config-tuning-2026-09-11.md](./postgresql-production-config-tuning-2026-09-11.md) | 生产配置调优 |

---

## 二、运维手册

| 文档 | 说明 |
|------|------|
| [admin-guide.md](./admin-guide.md) | 管理员指南 |
| [operations-manual.md](./operations-manual.md) | 运维手册（10 大类日常操作） |
| [service-stability-best-practices.md](./service-stability-best-practices.md) | 服务稳定性最佳实践 |
| [troubleshooting-cheatsheet.md](./troubleshooting-cheatsheet.md) | 故障排查速查表（9 大类常见问题） |
| [troubleshooting.md](./troubleshooting.md) | 故障排查详细文档 |

---

## 三、监控告警

| 文档 | 说明 |
|------|------|
| [ai-alerts-runbook.md](./ai-alerts-runbook.md) | AI 服务告警处理 Runbook |
| [cache-monitoring-prometheus-guide-2026-09-11.md](./cache-monitoring-prometheus-guide-2026-09-11.md) | 缓存监控 Prometheus 配置指南 |
| [multi-level-cache-monitoring-guide-2026-09-11.md](./multi-level-cache-monitoring-guide-2026-09-11.md) | 多级缓存监控指南 |
| [mcp-agent-integration-guide.md](./mcp-agent-integration-guide.md) | MCP Agent 集成监控指南 |

---

## 四、模板

| 文档 | 说明 |
|------|------|
| [templates/postgresql-deployment-report-template-2026-09-11.md](./templates/postgresql-deployment-report-template-2026-09-11.md) | PostgreSQL 部署报告模板 |

---

## 关联文档

- [端口分配规则](../architecture/ports.md)
- [环境配置](../getting-started/environment-config.md)
- [审计与合规报告](../reports/audit/README.md)

---

*本文档由 TOPEMS 团队维护，最后更新：2026-09-26*
