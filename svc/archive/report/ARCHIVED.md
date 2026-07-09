# ARCHIVED - Report Service

> **状态**: 已归档，不再维护  
> **归档日期**: 2026-07-08  
> **迁移至**: [svc/analytics](../../analytics) 的 `modules/report/` 模块

## 说明

Report 服务（topems-report）已于 2026-07 整合到 `analytics-service` 中，作为 `modules/report/` 模块统一维护。

### 整合原因

- 减少服务数量，简化部署
- BI + Report 同属数据分析域，共享基础设施
- 消除端口冲突（原 8061 端口，统一到 8060）
- 统一代码组织模式（modules/ 子模块架构）

### 新位置

所有功能已迁移至：
```
svc/analytics/src/modules/report/
├── mod.rs
├── report.rs
├── report_plugin.rs
├── template.rs
├── schedule.rs
├── scheduler.rs
└── subscription.rs
```

### API 路由变更

| 旧路径（8061） | 新路径（8060） | 说明 |
|---------------|---------------|------|
| `/api/report/reports` | `/api/report/reports` | 路径不变，端口变更 |
| `/api/report/templates` | `/api/report/templates` | 路径不变，端口变更 |
| `/api/report/schedules` | `/api/report/schedules` | 路径不变，端口变更 |
| `/api/plugins/info` | `/api/plugins/info` | 插件注册路径不变 |
| `/health` | `/health` | 健康检查路径不变 |

### 前端代理

前端 Vite 代理中的 `/report` 路径已统一指向 `localhost:8060`。

### 注意

本目录保留仅供历史参考，**不会再接收任何更新**。如需修改 Report 相关功能，请在 `svc/analytics/src/modules/report/` 中进行。
