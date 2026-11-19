# 窗口验收读数模板（R0-5）

> 用途：任何生产窗口（迁移、数据修复、发行部署）前后各跑一次，固定口径记录「同一组读数」，
> 避免各窗口各自口径、事后无法对比。本文件只读：不建表、不写任何对象。
> 配套：`docs/database/window-preflight-2026-11-19.sql`（窗口前专项门禁）。

## 1. 采集 SQL（只读，单次执行）

```sql
\set ON_ERROR_STOP on
SET default_transaction_read_only = on;

-- 1) 账本水位
SELECT count(*)                                        AS ledger_rows,
       count(*) FILTER (WHERE success)                 AS success_rows,
       count(*) FILTER (WHERE NOT success)             AS failed_rows,
       min(version)                                    AS min_version,
       max(version)                                    AS max_version
FROM _sqlx_migrations;

-- 2) 表 / RLS / 策略
SELECT count(*) FILTER (WHERE c.relkind IN ('r','p'))                          AS tables_rp,
       count(*) FILTER (WHERE c.relkind IN ('r','p') AND c.relrowsecurity)     AS rls_enabled,
       count(*) FILTER (WHERE c.relkind IN ('r','p') AND c.relforcerowsecurity) AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema');

SELECT count(*) AS policies
FROM pg_policies
WHERE schemaname NOT IN ('pg_catalog','information_schema');

-- 3) 参考数据行数（按窗口涉及的域增删；默认取全局口径）
SELECT (SELECT count(*) FROM public.core_permissions)      AS permission_codes,
       (SELECT count(*) FROM public.core_role_permissions) AS role_grants,
       (SELECT count(*) FROM public.core_tenants)          AS tenants,
       (SELECT count(*) FROM public.core_users)            AS users;
```

## 2. 记录表（窗口前后各填一列）

| 读数 | 窗口前 | 窗口后 | delta | 预期 |
|---|---:|---:|---:|---|
| 账本行数 | | | | 窗口新增条数一致 |
| success / failed | | | | failed 必须为 0 |
| `max(version)` | | | | 等于最后一条窗口版本 |
| 表数（`relkind IN ('r','p')`） | | | | 归档时按「移出 + 移入」核对 |
| RLS 启用 / FORCE | | | | 只允许窗口声明的变化 |
| 策略数 | | | | 只允许窗口声明的变化 |
| 权限码 / 角色授权 | | | | 按窗口声明增减 |
| 租户 / 用户 | | | | 预期不变 |
| 二进制 SHA-256 | | | | 部署产物与发布单一致 |
| 备份标识 | | | | 可定位到具体备份文件/时间点 |

## 3. 固定记录项（不进 SQL，随窗口记录）

- **二进制 SHA-256**：`shasum -a 256 <发布产物>`，与发布单登记一致。
- **备份标识**：备份文件路径/对象存储 key + 生成时间 + 校验和。
- **执行人 / 时间窗 / 变更单号**：与生产变更票据一致。
- **异常与人工干预**：没有就写「无」，不要留空。

## 4. 判读规则

1. `failed_rows` 必须为 0；窗口前非 0 即停止，不进入窗口。
2. `max(version)` 必须等于本次最后一个成功版本；否则说明有版本未落账。
3. 表 / RLS / 策略 / 参考数据的 delta 必须与窗口声明逐项相符；出现未声明变化即判 FAIL，
   先查清再继续。
4. 二进制 SHA 与发布单不一致即判 FAIL（部署的不是审批过的产物）。
5. 备份标识缺失即判 FAIL（无法回滚的窗口不允许开始）。

## 5. 与专项门禁的关系

- 本模板回答「整体读数是否与预期一致」，不替代专项检查。
- 迁移窗口仍需先跑 `window-preflight-2026-11-19.sql`（或对应版本）确认前置条件，
  再跑本模板取 before；窗口结束后取 after 并逐项比对。
