# TOPEMS 运维手册

## 目录结构

```
devops/
├── README.md                          # 运维手册目录（本文件）
├── deployment-guide.md                # 服务部署指南
├── database-maintenance.md            # 数据库维护指南
├── monitoring-alerting.md             # 监控告警运维指南
├── troubleshooting.md                 # 故障排查指南
├── logging-guide.md                   # 日志管理指南
└── scripts-guide.md                   # 脚本工具说明
```

## 文档索引

| 文档 | 说明 | 适用场景 |
|------|------|----------|
| [部署指南](./deployment-guide.md) | Docker Compose / Kubernetes 部署 | 全新部署、扩容、迁移 |
| [数据库维护指南](./database-maintenance.md) | 备份、恢复、迁移 | 数据管理、灾备 |
| [监控告警运维指南](./monitoring-alerting.md) | Prometheus/Grafana/Loki/AlertManager | 日常监控、告警处理 |
| [分布式追踪指南](./opentelemetry-guide.md) | OpenTelemetry 配置、宏代码使用、排查步骤 | 链路追踪、性能分析 |
| [故障排查指南](./troubleshooting.md) | 常见问题诊断与解决 | 故障处理 |
| [日志管理指南](./logging-guide.md) | 日志收集、分析、轮转 | 日志分析、审计 |
| [脚本工具说明](./scripts-guide.md) | topems.sh 及部署脚本 | 运维操作 |

## 系统架构

### 服务组件

TOPEMS 系统由以下核心服务组成（统一端口规范）：

| 服务 | 端口 | 端口区间 | 说明 |
|------|------|---------|------|
| **平台核心服务** | | **8000-8009** | |
| Unified Core (IAM) | 8000 | | 统一身份认证、文档、工作流、文件等核心服务 |
| **经营管理服务** | | **8010-8019** | |
| ERP | 8010 | | 企业资源计划 |
| **协同办公服务** | | **8020-8029** | |
| HRM | 8020 | | 人力资源管理 |
| PM | 8023 | | 项目管理 |
| CRM | 8029 | | 客户关系管理 |
| **生产制造服务** | | **8030-8039** | |
| MES | 8030 | | 生产执行系统 |
| PDM | 8031 | | 产品数据管理 |
| **供应链服务** | | **8040-8049** | |
| SCM | 8040 | | 供应链管理 |
| WMS | 8041 | | 仓库管理系统 |
| SRM | 8042 | | 供应商管理 |
| **质量/研发服务** | | **8050-8059** | |
| QMS | 8050 | | 质量管理 |
| LIMS | 8051 | | 实验室信息管理 |
| EHS | 8052 | | 环境安全 |
| RS | 8053 | | 研发管理 |
| **数据/门户服务** | | **8060-8069** | |
| BI | 8060 | | 商业智能 |
| Report | 8061 | | 报表服务 |
| Monitor | 8062 | | 系统监控 |
| Portal | 8063 | | 企业门户 |
| AI | 8013 AI 服务 |
| **基础设施服务** | | **8070-8079** | |
| Mobile | 8070 | | 移动端服务 |
| GIS | 8071 | | 地理信息服务 |
| Integration | 8072 | | 系统集成 |

### 基础设施组件

| 组件 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5432 | 主数据库 |
| Redis | 6379 | 缓存（可选） |
| Prometheus | 9090 | 指标收集 |
| Grafana | 3000 | 可视化监控 |
| Loki | 3100 | 日志收集 |
| AlertManager | 9093 | 告警管理 |
| Nginx | 80/443 | 反向代理 |

## 快速开始

### 1. 环境要求

- **操作系统**: Linux (Ubuntu 20.04+ / CentOS 8+)
- **硬件配置**:
  - CPU: 8 核+
  - 内存: 16GB+
  - 磁盘: 100GB+
- **软件依赖**:
  - Docker 20.10+ / Podman 4+
  - Docker Compose 2.0+
  - PostgreSQL 14+
  - Redis 7+ (可选)

### 2. 部署方式

**Docker Compose 部署（推荐用于开发和测试）**
```bash
cd deploy/monitoring
docker-compose up -d

cd ../..
docker-compose -f docker-compose.services.yml up -d
```

**Kubernetes 部署（推荐用于生产）**
```bash
kubectl apply -f deploy/k8s/
```

### 3. 验证部署

```bash
# 检查服务状态
curl http://localhost:8080/health

# 检查监控
curl http://localhost:9090/-/healthy
```

## 日常运维

### 日常检查清单

- [ ] 检查所有服务健康状态
- [ ] 检查磁盘空间使用情况
- [ ] 检查数据库连接数
- [ ] 检查日志中是否有错误
- [ ] 检查备份是否成功执行
- [ ] 检查告警通知是否正常

### 常用命令

```bash
# 查看所有服务状态
systemctl status topems.target

# 查看特定服务日志
journalctl -u topems-unified-core -f

# 重启服务
systemctl restart topems.target

# 检查端口占用
ss -tlnp | grep -E '(8080|8001|8002)'
```

## 紧急联系

- **技术支持**: support@topems.com
- **值班电话**: 400-XXX-XXXX
- **文档更新**: 请提交 PR 到 docs/guides/devops/

## 相关文档

- [部署文档](../../deployment/README.md)
- [端口分配规则](../../port-allocation-rules.md)
- [环境配置](../ENVIRONMENT_CONFIG.md)
- [API 文档](../../api/README.md)
