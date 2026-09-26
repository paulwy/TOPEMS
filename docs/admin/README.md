# TOPEMS 运维管理文档

本目录是 TOPEMS 运维人员的统一入口，按主题分为**部署指南、运维手册、监控告警、模板**四个分区。

## 快速开始

```bash
# 环境要求：Rust 1.70+ / Node.js 18+ / PostgreSQL 14+ / Redis 7+

# 使用统一脚本启动全部服务
./scripts/topems.sh start

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
