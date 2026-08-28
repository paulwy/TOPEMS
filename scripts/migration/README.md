# APS → MES 数据迁移指南

## 概述

本文档描述如何将 APS（高级计划与排程）服务的数据迁移到 MES（生产执行系统）服务。

## 迁移范围

### 需要迁移的表

| 源表（plugin_aps schema） | 目标表（MES） | 说明 |
|---------------------------|---------------|------|
| `aps_production_plans` | `production_plans` | 生产计划 |
| `aps_capacities` | `capacities` | 产能管理 |
| `aps_demand_forecasts` | `demand_forecasts` | 需求预测 |

### 不迁移的表

| 源表 | 原因 |
|------|------|
| `aps_schedules` | MES 已有 `production_scheduling` 模块，功能更完整 |
| `aps_material_plans` | MES 已有 `material_requirement` 模块，功能更完整 |

## 字段映射差异

### 产能表（capacities）

| 字段 | APS | MES | 转换 |
|------|-----|-----|------|
| `utilization_rate` | DECIMAL(5,4)，0-1 | DECIMAL(5,2)，0-100 | × 100 |

### 需求预测表（demand_forecasts）

| 字段 | APS | MES | 转换 |
|------|-----|-----|------|
| `accuracy_rate` | DECIMAL(5,4)，0-1 | DECIMAL(5,2)，0-100 | × 100 |
| `confidence_level` | DECIMAL(5,4)，0-1 | DECIMAL(5,2)，0-100 | × 100 |
| `status` | 无此字段 | VARCHAR(32) | 默认 'draft' |

### 通用差异

| 字段 | APS | MES | 转换 |
|------|-----|-----|------|
| `created_at` | TIMESTAMPTZ | TIMESTAMP | ::TIMESTAMP |
| `updated_at` | TIMESTAMPTZ | TIMESTAMP | ::TIMESTAMP |

## 迁移步骤

### 1. 准备工作

```bash
# 确保 MES 服务已启动，表已创建
# MES 启动时会自动创建 production_plans, capacities, demand_forecasts 表

# 设置数据库连接
export DATABASE_URL=postgres://user:password@localhost:5432/topems
```

### 2. 备份数据库（强烈建议）

```bash
pg_dump "$DATABASE_URL" > backup_before_aps_migration.sql
```

### 3. 执行迁移（推荐先 dry-run）

```bash
# Dry-run 模式：只查看源表和目标表的计数，不实际迁移
./scripts/migration/aps_to_mes_migrate.sh --dry-run

# 实际迁移
./scripts/migration/aps_to_mes_migrate.sh

# 跳过确认提示（自动化场景）
./scripts/migration/aps_to_mes_migrate.sh --force
```

### 4. 验证迁移结果

脚本执行后会显示计数对比：

```
 table_name      | source_count | target_count | diff
-----------------+--------------+--------------+------
 production_plans| 100          | 100          | 0
 capacities      | 200          | 200          | 0
 demand_forecasts| 50           | 50           | 0
```

如果 `diff` 不为 0，检查是否有重复数据（ON CONFLICT DO NOTHING）。

### 5. 提交事务

SQL 文件默认使用 `BEGIN` 事务，需要手动提交：

```sql
-- 在 psql 中执行
COMMIT;
```

或者修改 SQL 文件，取消 `COMMIT;` 的注释。

### 6. 迁移后清理（可选，确认数据正确后）

#### 方案 A：备份旧 schema

```sql
CREATE SCHEMA IF NOT EXISTS plugin_aps_backup;
ALTER TABLE plugin_aps.aps_production_plans SET SCHEMA plugin_aps_backup;
ALTER TABLE plugin_aps.aps_capacities SET SCHEMA plugin_aps_backup;
ALTER TABLE plugin_aps.aps_demand_forecasts SET SCHEMA plugin_aps_backup;
ALTER TABLE plugin_aps.aps_schedules SET SCHEMA plugin_aps_backup;
ALTER TABLE plugin_aps.aps_material_plans SET SCHEMA plugin_aps_backup;
```

#### 方案 B：删除旧表（危险）

```sql
DROP TABLE IF EXISTS plugin_aps.aps_production_plans;
DROP TABLE IF EXISTS plugin_aps.aps_capacities;
DROP TABLE IF EXISTS plugin_aps.aps_demand_forecasts;
DROP TABLE IF EXISTS plugin_aps.aps_schedules;
DROP TABLE IF EXISTS plugin_aps.aps_material_plans;
DROP SCHEMA IF EXISTS plugin_aps;
```

### 7. 更新配置

```bash
# 停止 APS 服务
# 更新网关配置，移除 /api/aps 路由
# 更新前端配置，使用 MES 的新 API
```

## API 路径变化

| 功能 | 旧 API（APS） | 新 API（MES） |
|------|---------------|---------------|
| 生产计划列表 | `GET /api/aps/production-plans` | `GET /api/mes/production-plans` |
| 创建生产计划 | `POST /api/aps/production-plans` | `POST /api/mes/production-plans` |
| 产能列表 | `GET /api/aps/capacities` | `GET /api/mes/capacities` |
| 需求预测列表 | `GET /api/aps/forecasts` | `GET /api/mes/demand-forecasts` |

## 回滚方案

如果迁移失败，可以回滚：

```bash
# 1. 停止 MES 服务
# 2. 恢复数据库
psql "$DATABASE_URL" < backup_before_aps_migration.sql
# 3. 重启 APS 服务
```

## 注意事项

1. **幂等性**：迁移脚本使用 `ON CONFLICT DO NOTHING`，可以安全地重复执行
2. **事务**：SQL 文件默认在事务中执行，需要手动 COMMIT
3. **大表**：如果表数据量很大（>10万行），建议分批迁移
4. **外键**：确保目标表没有外键约束，或先禁用外键
5. **索引**：迁移后检查目标表的索引是否正确创建

## 故障排查

### 问题：目标表不存在

**原因**：MES 服务未启动，或 init_database 未执行

**解决**：启动 MES 服务，或手动执行表创建 SQL

### 问题：utilization_rate 数值异常

**原因**：APS 存储 0-1，MES 存储 0-100

**解决**：迁移脚本已自动 × 100，检查是否正确转换

### 问题：demand_forecasts 缺少 status

**原因**：APS 表没有 status 字段

**解决**：迁移脚本已默认设置为 'draft'

## 文件清单

- `scripts/migration/aps_to_mes_data_migration.sql` - SQL 迁移脚本
- `scripts/migration/aps_to_mes_migrate.sh` - 执行脚本
- `scripts/migration/README.md` - 本文档
