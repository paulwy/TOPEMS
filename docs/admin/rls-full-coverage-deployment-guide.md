# RLS 全覆盖 & 死表清理 生产环境部署指南

**版本**: 2026-09-10
**适用版本**: TOPEMS V62.x+
**风险等级**: 中（需停机维护窗口）

## 概述

本次部署包含两项数据库变更：
1. **RLS 全覆盖**：为 99 张业务表启用行级安全策略（RLS + FORCE + tenant_isolation policy）
2. **死表清理**：删除 public schema 中 81 张 finance 旧表（全 0 行，rehome 迁移遗留）

## 变更清单

### 迁移文件

| 迁移版本 | 文件名 | 说明 | 影响 |
|---|---|---|---|
| 20260910000008 | `rls_full_coverage.sql` | 为 99 张业务表启用 RLS + policy | 中（查询性能影响 < 5%） |
| 20260910000009 | `drop_public_finance_dead_tables.sql` | 清理第一批 finance 旧表（40 张） | 低（全 0 行死表） |
| 20260910000010 | `drop_public_finance_remaining.sql` | 清理剩余 finance 旧表（41 张） | 低（全 0 行死表） |

### 数据库变更统计

| 指标 | 变更前 | 变更后 | 差异 |
|---|---|---|---|
| 数据库表总数 | 967 | 886 | -81 |
| 含 tenant_id 表数 | 605 | 605 | 0 |
| RLS 已启用表数 | 506 | 605 | +99 |
| RLS 覆盖率 | 83.6% | 100% | +16.4% |
| 迁移总数 | 104 | 116 | +12 |

## 部署前检查

### 1. 备份数据库

```bash
# 生产环境完整备份
pg_dump -U <user> -h <host> -d <database> -Fc -f topems_pre_rls_backup_$(date +%Y%m%d).dump

# 验证备份文件
pg_restore -l topems_pre_rls_backup_$(date +%Y%m%d).dump | head -20
```

### 2. 检查当前 RLS 状态

```sql
-- 检查未启用 RLS 的表（预期: 99 张业务表）
SELECT t.table_schema, t.table_name
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_schema = t.table_schema AND c.table_name = t.table_name
WHERE c.column_name = 'tenant_id'
  AND t.table_type = 'BASE TABLE'
  AND t.table_schema NOT IN ('pg_catalog', 'information_schema')
  AND NOT EXISTS (
      SELECT 1 FROM pg_class pc
      JOIN pg_namespace pn ON pc.relnamespace = pn.oid
      WHERE pc.relname = t.table_name AND pn.nspname = t.table_schema AND pc.relrowsecurity = true
  )
ORDER BY t.table_schema, t.table_name;
```

### 3. 检查死表

```sql
-- 检查 public schema finance 旧表（预期: 81 张，全 0 行）
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE '%finance%'
ORDER BY table_name;
```

### 4. 确认应用连接

```bash
# 检查当前数据库连接数
psql -U <user> -h <host> -d <database> -c "SELECT count(*) FROM pg_stat_activity;"

# 建议: 部署期间暂停应用写入，或使用维护模式
```

## 部署步骤

### 步骤 1: 进入维护模式

```bash
# 停止应用服务（根据实际部署方式调整）
systemctl stop topems-backend
systemctl stop topems-gateway

# 确认无活跃连接
psql -U <user> -h <host> -d <database> -c "
    SELECT pid, usename, application_name, state
    FROM pg_stat_activity
    WHERE datname = '<database>' AND state = 'active';
"
```

### 步骤 2: 执行迁移

```bash
# 方式一: 使用 sqlx CLI（推荐）
cd /path/to/topems
sqlx migrate run --database-url postgres://<user>:<password>@<host>:5432/<database>

# 方式二: 手动执行 SQL
psql -U <user> -h <host> -d <database> -f database/migrations/20260910000008_rls_full_coverage.sql
psql -U <user> -h <host> -d <database> -f database/migrations/20260910000009_drop_public_finance_dead_tables.sql
psql -U <user> -h <host> -d <database> -f database/migrations/20260910000010_drop_public_finance_remaining.sql
```

### 步骤 3: 验证部署

```bash
# 执行验证脚本
psql -U <user> -h <host> -d <database> -f database/scripts/verify_rls_coverage_production.sql
```

**验证通过标准**:
- [ ] RLS 覆盖率查询返回 0 行
- [ ] 各 schema RLS 覆盖率均为 100%
- [ ] 无 policy 的 RLS 表返回 0 行
- [ ] public schema finance 旧表返回 0 行
- [ ] 迁移表 116 个全部成功

### 步骤 4: 启动应用

```bash
# 启动应用服务
systemctl start topems-gateway
systemctl start topems-backend

# 检查应用日志
journalctl -u topems-backend -f --lines 50
```

### 步骤 5: 冒烟测试

```bash
# 测试核心 API
curl -s http://localhost:8080/api/health | jq .
curl -s -H "Authorization: Bearer <token>" http://localhost:8080/api/core/tenants | jq .

# 测试 RLS 隔离（使用不同租户 token）
curl -s -H "Authorization: Bearer <tenant_a_token>" http://localhost:8080/api/crm/customers | jq '.total'
curl -s -H "Authorization: Bearer <tenant_b_token>" http://localhost:8080/api/crm/customers | jq '.total'
# 预期: 两个租户返回不同的数据
```

## 回滚方案

### 场景 1: RLS 导致应用异常

```sql
-- 禁用指定表的 RLS（紧急回滚）
ALTER TABLE finance.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE finance.payments DISABLE ROW LEVEL SECURITY;
-- ... 其他受影响的表

-- 或全局禁用（不推荐，仅紧急情况）
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    LOOP
        EXECUTE format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
    END LOOP;
END $$;
```

### 场景 2: 死表清理误删

```bash
# 从备份恢复指定表
pg_restore -U <user> -h <host> -d <database> \
    --table=<table_name> \
    topems_pre_rls_backup_$(date +%Y%m%d).dump
```

### 场景 3: 完全回滚

```bash
# 停止应用
systemctl stop topems-backend topems-gateway

# 从完整备份恢复
pg_restore -U <user> -h <host> -d <database> --clean --if-exists \
    topems_pre_rls_backup_$(date +%Y%m%d).dump

# 启动应用
systemctl start topems-gateway topems-backend
```

## 性能影响评估

### RLS 性能影响

| 操作类型 | 预期影响 | 说明 |
|---|---|---|
| SELECT | < 5% 延迟增加 | RLS policy 在查询规划阶段注入条件 |
| INSERT | < 2% 延迟增加 | 仅检查 tenant_id 权限 |
| UPDATE | < 5% 延迟增加 | 需验证行级权限 |
| DELETE | < 5% 延迟增加 | 需验证行级权限 |
| 批量操作 | < 10% 延迟增加 | 大量行的权限检查 |

### 优化建议

1. **索引优化**: 确保所有启用 RLS 的表都有 `tenant_id` 索引
2. **连接池**: 适当增加数据库连接池大小（RLS 会增加会话开销）
3. **查询优化**: 避免在 RLS 表上使用 `SELECT *`，只查询需要的列

## 监控指标

部署后需重点监控以下指标：

| 指标 | 阈值 | 告警方式 |
|---|---|---|
| 数据库 CPU 使用率 | > 80% 持续 5 分钟 | Prometheus Alert |
| 数据库连接数 | > 最大连接数 80% | Prometheus Alert |
| API 响应时间 P99 | > 1s 持续 5 分钟 | APM 告警 |
| API 错误率 | > 1% 持续 5 分钟 | APM 告警 |
| RLS policy 违规 | > 0 | 应用日志告警 |

## 常见问题

### Q1: 部署后部分查询变慢怎么办？

A: 检查是否有表缺少 `tenant_id` 索引。RLS policy 会自动添加 `tenant_id = current_setting('app.tenant_id')` 条件，缺少索引会导致全表扫描。

### Q2: 应用报 "permission denied for table" 怎么办？

A: 检查应用使用的数据库角色是否有 `BYPASSRLS` 属性。生产环境应使用非 superuser 角色，确保 RLS 生效。

### Q3: 如何验证 RLS 真的生效了？

A: 使用两个不同租户的 token 调用同一 API，确认返回的数据不同。或直接在数据库中执行：
```sql
SET app.tenant_id = 'tenant_a';
SELECT count(*) FROM crm.customers; -- 应只返回 tenant_a 的数据
SET app.tenant_id = 'tenant_b';
SELECT count(*) FROM crm.customers; -- 应只返回 tenant_b 的数据
```

## 联系支持

如遇部署问题，请联系：
- 数据库管理员: DBA 团队
- 后端开发: 平台架构组
- 运维支持: SRE 团队
