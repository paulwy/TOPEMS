# 部署指南

## 文档索引

### 快速开始

| 文档 | 说明 |
|------|------|
| [Windows 部署指南](./windows-deployment.md) | Windows 10/11、Windows Server 2019/2022 完整部署指南 |
| [离线部署](./DEPLOYMENT_OFFLINE.md) | 无网络环境下的离线部署方案 |
| [Docker 部署](./DEPLOYMENT_GUIDE.md) | Docker 容器化部署指南 |

### 部署选项概览

| 方式 | 适用场景 | 平台 |
|------|---------|------|
| Python CLI | 开发、测试 | Windows/macOS/Linux |
| Docker Desktop | 生产、团队协作 | Windows 10/11 |
| Windows Server + Docker | 企业生产 | Windows Server 2019/2022 |
| Windows Server 裸机 | 离线、高性能 | Windows Server 2019/2022 |

### 详细部署指南

| 文档 | 说明 |
|------|------|
| [Python CLI 部署](#方式一python-cli-部署) | 使用 Python CLI 管理服务 |
| [Docker Desktop](#方式二docker-desktop-部署-windows-1011) | Docker Desktop 容器化部署 |
| [Windows Server Docker](#方式三windows-server-20192022--docker-部署) | Windows Server + Docker EE |
| [Windows Server 裸机](#方式四windows-server-裸机部署无-docker) | 无 Docker 原生部署 |

### 环境配置

| 文档 | 说明 |
|------|------|
| [环境变量配置](../guides/ENVIRONMENT_CONFIG.md) | 环境变量配置指南 |
| [数据库迁移](../database-migration.md) | 数据库初始化和迁移 |
| [服务端口规划](../architecture/port-planning.md) | 服务端口分配方案 |

### 故障排查

| 文档 | 说明 |
|------|------|
| [Windows 常见问题](./windows-deployment.md#常见问题) | Windows 部署常见问题 |
| [服务启动问题](./DEPLOYMENT_GUIDE.md#故障排查) | 服务启动故障排查 |
| [数据库连接问题](./DEPLOYMENT_OFFLINE.md#故障排查) | 数据库连接问题 |

---

## 快速参考

### Windows PowerShell 常用命令

```powershell
# 查看服务状态
python -m topems_cli status --all

# 启动核心模块
python -m topems_cli start -m core

# Docker 方式
docker-compose ps
docker-compose logs -f

# Windows 服务方式
Get-Service -Name "TOPEMS-*"
```

### 端口分配（27 个服务）

```
核心服务:   IAM(8000), PM(8001), Notification(8002), Portal(8003), Flow(8004), Integration(8005)
ERP服务:    ERP(8010), HRM(8011), CRM(8012)
PLM服务:    RS(8020), LIMS(8022), PDM(8023), DOC(8024)
MES服务:    MES(8030), QMS(8031), EHS(8032)
SCM服务:    SCM(8040), SRM(8041), WMS(8042)
基础设施:   File(8050), Mail(8051), IM(8052), GIS(8053)
数据分析:   BI(8060), Report(8061), AI(8062)
扩展服务:   Mobile(8070)
前端:       Frontend(3000)
```

### 技术支持

- 文档: https://docs.topems.com
- 问题反馈: https://github.com/your-org/topems/issues
- 社区: https://community.topems.com
