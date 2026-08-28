# APS→MES 合并部署清理指南

## 概述

本文档描述 APS 服务合并到 MES 服务后的部署清理步骤。

## 合并状态

- **合并日期**: 2026-08-28
- **状态**: 代码迁移完成，待生产环境验证
- **兼容层**: 已启用 `/api/aps/*` → `/api/mes/*` 301 重定向

## 已迁移的模块

| APS 模块 | MES 模块 | 说明 |
|---------|---------|------|
| 纯函数工具 | `mes/src/shared/aps_util.rs` | 20 个纯函数，52 测试 |
| 状态机 | `mes/src/shared/aps_fsm.rs` | 5 个状态机定义 |
| 生产计划 | `mes/src/modules/production_plan.rs` | CRUD + 审批状态机 |
| 产能管理 | `mes/src/modules/capacity.rs` | CRUD + 分配/释放/维护 |
| 需求预测 | `mes/src/modules/demand_forecast.rs` | CRUD + 计算/验证/采纳 |
| API 兼容层 | `mes/src/modules/aps_compat.rs` | `/api/aps/*` → `/api/mes/*` 重定向 |

## 未迁移的模块（MES 已有对应功能）

| APS 模块 | MES 对应模块 | 说明 |
|---------|-------------|------|
| 排程管理 | `production_scheduling.rs` + `aps_scheduling.rs` | MES 功能更完整 |
| 物料计划 | `material_requirement.rs` | MES 功能更完整 |

## 部署步骤

### 阶段 1：预部署（测试环境）

```bash
# 1. 备份数据库
pg_dump "$DATABASE_URL" > backup_before_aps_merge.sql

# 2. 部署新版本 MES（包含 APS 模块）
./deploy/docker/build-service.sh mes
docker-compose up -d mes

# 3. 验证 MES 新模块正常
curl http://localhost:8030/api/mes/production-plans
curl http://localhost:8030/api/mes/capacities
curl http://localhost:8030/api/mes/demand-forecasts

# 4. 验证兼容层重定向正常
curl -I http://localhost:8030/api/aps/production-plans
# 应该返回 301 Permanent Redirect，Location: /api/mes/production-plans
```

### 阶段 2：数据迁移

```bash
# 1. 执行数据迁移（先 dry-run）
./scripts/migration/aps_to_mes_migrate.sh --dry-run

# 2. 确认计数对比无误后，实际迁移
./scripts/migration/aps_to_mes_migrate.sh

# 3. 在 psql 中手动 COMMIT（SQL 文件默认使用事务）
psql "$DATABASE_URL" -c "COMMIT;"

# 4. 验证数据完整性
psql "$DATABASE_URL" -c "
    SELECT 'production_plans' AS tbl, COUNT(*) FROM production_plans
    UNION ALL SELECT 'capacities', COUNT(*) FROM capacities
    UNION ALL SELECT 'demand_forecasts', COUNT(*) FROM demand_forecasts;
"
```

### 阶段 3：切换流量

```bash
# 1. 更新前端/第三方集成，使用新的 MES API 路径
#    /api/aps/production-plans → /api/mes/production-plans
#    /api/aps/capacities       → /api/mes/capacities
#    /api/aps/forecasts        → /api/mes/demand-forecasts

# 2. 兼容层会自动重定向旧路径，但建议尽快更新客户端代码

# 3. 监控错误日志，确认没有 404 或 500 错误
```

### 阶段 4：停止 APS 服务（观察期后）

```bash
# 建议观察 1-2 周，确认稳定后再停止 APS 服务

# 1. 停止 APS 服务
docker-compose stop aps

# 2. 从 docker-compose.yml 中移除 aps 服务（可选）

# 3. 从 build-service.sh 中移除 aps 配置（可选，当前已标记为 deprecated）
```

### 阶段 5：清理旧数据（确认无误后）

```bash
# 警告：此操作不可逆，请确保数据已正确迁移！

# 方案 A：备份旧 schema（推荐）
psql "$DATABASE_URL" -c "
    CREATE SCHEMA IF NOT EXISTS plugin_aps_backup;
    ALTER TABLE plugin_aps.aps_production_plans SET SCHEMA plugin_aps_backup;
    ALTER TABLE plugin_aps.aps_capacities SET SCHEMA plugin_aps_backup;
    ALTER TABLE plugin_aps.aps_demand_forecasts SET SCHEMA plugin_aps_backup;
    ALTER TABLE plugin_aps.aps_schedules SET SCHEMA plugin_aps_backup;
    ALTER TABLE plugin_aps.aps_material_plans SET SCHEMA plugin_aps_backup;
"

# 方案 B：直接删除（危险）
psql "$DATABASE_URL" -c "
    DROP TABLE IF EXISTS plugin_aps.aps_production_plans;
    DROP TABLE IF EXISTS plugin_aps.aps_capacities;
    DROP TABLE IF EXISTS plugin_aps.aps_demand_forecasts;
    DROP TABLE IF EXISTS plugin_aps.aps_schedules;
    DROP TABLE IF EXISTS plugin_aps.aps_material_plans;
    DROP SCHEMA IF EXISTS plugin_aps;
"
```

## API 路径变化

| 功能 | 旧路径（APS） | 新路径（MES） | 兼容层 |
|------|---------------|---------------|--------|
| 生产计划列表 | `GET /api/aps/production-plans` | `GET /api/mes/production-plans` | ✅ 301 |
| 创建生产计划 | `POST /api/aps/production-plans` | `POST /api/mes/production-plans` | ✅ 301 |
| 生产计划详情 | `GET /api/aps/production-plans/{id}` | `GET /api/mes/production-plans/{id}` | ✅ 301 |
| 提交审批 | `POST /api/aps/production-plans/{id}/submit` | `POST /api/mes/production-plans/{id}/submit` | ✅ 301 |
| 审批通过 | `POST /api/aps/production-plans/{id}/approve` | `POST /api/mes/production-plans/{id}/approve` | ✅ 301 |
| 产能列表 | `GET /api/aps/capacities` | `GET /api/mes/capacities` | ✅ 301 |
| 分配产能 | `POST /api/aps/capacities/{id}/allocate` | `POST /api/mes/capacities/{id}/allocate` | ✅ 301 |
| 释放产能 | `POST /api/aps/capacities/{id}/release` | `POST /api/mes/capacities/{id}/release` | ✅ 301 |
| 需求预测列表 | `GET /api/aps/forecasts` | `GET /api/mes/demand-forecasts` | ✅ 301 |
| 计算预测 | `POST /api/aps/forecasts/{id}/calculate` | `POST /api/mes/demand-forecasts/{id}/calculate` | ✅ 301 |
| 验证预测 | `POST /api/aps/forecasts/{id}/validate` | `POST /api/mes/demand-forecasts/{id}/validate` | ✅ 301 |

## 注意事项

1. **兼容层保留期**: 建议保留 3 个月（至 2026-11-28），之后移除
2. **POST 请求重定向**: 301 重定向可能导致 POST 请求变为 GET，建议客户端直接使用新路径
3. **数据库事务**: 迁移脚本默认使用事务，需手动 COMMIT
4. **幂等性**: 迁移脚本可重复执行（ON CONFLICT DO NOTHING）
5. **监控**: 部署后密切监控 MES 服务的错误率和响应时间

## 回滚方案

如果合并后出现严重问题，可以回滚：

```bash
# 1. 停止新版本 MES
docker-compose stop mes

# 2. 恢复旧版本 MES（不包含 APS 模块）
docker-compose up -d mes

# 3. 启动 APS 服务
docker-compose start aps

# 4. 恢复数据库（如果已执行数据迁移）
psql "$DATABASE_URL" < backup_before_aps_merge.sql
```

## 文件清单

- `svc/mes/src/shared/aps_util.rs` - APS 纯函数迁移
- `svc/mes/src/shared/aps_fsm.rs` - APS 状态机迁移
- `svc/mes/src/modules/production_plan.rs` - 生产计划模块
- `svc/mes/src/modules/capacity.rs` - 产能管理模块
- `svc/mes/src/modules/demand_forecast.rs` - 需求预测模块
- `svc/mes/src/modules/aps_compat.rs` - API 兼容层
- `scripts/migration/aps_to_mes_data_migration.sql` - 数据迁移 SQL
- `scripts/migration/aps_to_mes_migrate.sh` - 数据迁移执行脚本
- `scripts/migration/README.md` - 数据迁移指南
- `docs/aps_mes_merge_deployment.md` - 本文档
