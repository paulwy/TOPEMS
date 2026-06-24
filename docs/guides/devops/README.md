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
| [故障排查指南](./troubleshooting.md) | 常见问题诊断与解决 | 故障处理 |
| [日志管理指南](./logging-guide.md) | 日志收集、分析、轮转 | 日志分析、审计 |
| [脚本工具说明](./scripts-guide.md) | topems.sh 及部署脚本 | 运维操作 |

## 系统架构

### 服务组件

TOPEMS 系统由以下核心服务组成：

| 服务 | 端口 | 说明 |
|------|------|------|
| Portal (API Gateway) | 8080 | API 网关，统一入口 |
| Unified Core | 8001 | IAM、文档、工作流、文件等核心服务 |
| AI Service | 8002 | AI 服务（Ollama 集成） |
| Analytics Service | 8003 | BI 报表服务 |
| Manufacturing Service | 8004 | MES/PDM 服务 |
| Quality Assurance | 8005 | QMS/LIMS/EHS 服务 |
| HRM Service | 8006 | 人力资源管理 |
| CRM Service | 8007 | 客户关系管理 |
| PM Service | 8008 | 项目管理 |
| ERP Service | 8009 | 企业资源计划 |
| GIS Service | 8010 | 地理信息服务 |
| RS Service | 8011 | 资源服务 |
| SCM Service | 8012 | 供应链管理 |
| WMS Service | 8013 | 仓库管理系统 |
| Mobile Service | 8014 | 移动端服务 |
| Monitor Service | 8015 | 系统监控服务 |

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
