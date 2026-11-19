# `bi.audit_logs` RLS 定性（`USING(true)` 双侧）

- 日期：2026-11-19
- 数据源：`topems_prod`（2026-11-18 生产只读快照）+ 全仓代码静态核查
- 结论：**不收紧**；同时**不应按「纯有意放行」登记**——它是 `svc/analytics` 的 schema-defense 骨架表，部署期会被重建。详见 §4。

## 1. 现状（生产只读实测）

| 项 | 值 |
|---|---|
| 行数 | 0 |
| RLS | `ENABLE` + `FORCE` |
| 策略 | 仅 1 条：`bi_allow_all_audit_logs`，`ALL` / PERMISSIVE / `USING(true)` / `WITH CHECK(true)` |
| 租户列 | 有，`tenant_id uuid NULL` |
| 触发器 | 无 |
| 入向外键 / 依赖视图 | 无 |

## 2. 写入方核查

### 2.1 动态 schema 前缀链路（共享审计）

写入器在 [audit.rs](file:///Users/xingzhai/TOPEMS/lib/shared-db/src/audit.rs#L626)：

```rust
/// Render `{prefix}.audit_logs`（前缀必填，不再生成裸表名）。
fn table(&self) -> String {
    format!("{}.audit_logs", self.schema_prefix)
}
```

全仓 `SchemaAwareAuditLogService::new*()` 的 `schema_prefix` 实参只有 6 个：

```
crm ×2, erp ×1, hrm ×1, mes ×2, rs ×1, wms ×1
```

**没有 `bi`**。即共享审计的动态前缀链路不会写 `bi.audit_logs`。

其余动态拼接（`format!("%I.%I")`、`quote_ident`、schema 前缀变量）在 `bi` 上零命中。

### 2.2 部署/运维脚本

- [rls-app-exemption.sql](file:///Users/xingzhai/TOPEMS/scripts/db/rls-app-exemption.sql#L13) 含一条手工运维 DDL：为 `bi.audit_logs` 建 `tenant_isolation_audit_logs`（含 `tenant_id IS NULL` 兜底）。
- 生产实际策略名是 `bi_allow_all_audit_logs`，可证该脚本**未在现网执行**（或已被后续迁移覆盖）。它是运维脚本，不在迁移链内。

### 2.3 业务代码

`svc/analytics` 对审计的查询全部指向 `public.audit_logs`（[routes.rs](file:///Users/xingzhai/TOPEMS/svc/analytics/src/routes.rs#L1094)、[main.rs](file:///Users/xingzhai/TOPEMS/svc/analytics/src/main.rs#L485)），无 `bi.audit_logs` 的 INSERT/UPDATE/DELETE。

**写入结论：运行期无任何写入方。**

## 3. 读取方核查

- 共享审计的查询方法 `query_audit_logs` 固定读 `public.audit_logs`（[audit.rs](file:///Users/xingzhai/TOPEMS/lib/shared-db/src/audit.rs#L462)），不按 prefix 路由。
- 全仓（Rust/TS/YAML/部署配置/定时任务）对字符串 `bi.audit_logs` 零命中；对裸名 `audit_logs` 的命中均解析到各自 search_path 下的其他 schema（`public.audit_logs` / `crm.audit_logs` 等）。

**读取结论：运行期无读取方。**

## 4. 前提被推翻：它是 `svc/analytics` 的 schema-defense 骨架表

[svc/analytics/src/models/schema_defense.rs](file:///Users/xingzhai/TOPEMS/svc/analytics/src/models/schema_defense.rs#L17)：

```rust
pub const SERVICE_SCHEMA: &str = "bi";
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[ ..., ("audit_logs", &[ ... ]), ... ];
```

启动链路 [run_schema_migration_and_verify](file:///Users/xingzhai/TOPEMS/svc/analytics/src/models/schema_defense.rs#L103-L125)：

1. 阶段 0：`CREATE TABLE IF NOT EXISTS "bi"."audit_logs" (id UUID PRIMARY KEY ...)`；
2. 阶段 1：按 `TABLE_DEFS` 逐列 `ALTER TABLE ADD COLUMN IF NOT EXISTS`；
3. 阶段 2：`run_schema_defense` 一致性自检。

生产表当前有 25 列，正好是「共享审计 15 列」+「analytics `TABLE_DEFS` 专有列（`resource_type/resource_id/request_method/execution_time_ms/...`）」的并集，证明该 schema-defense 已在生产生效。

因此：

- 表**不是死表**，而是 analytics 服务的自有骨架表（虽然当前没有数据写入）；
- 若按 `20261119110000_drop_dead_tables_batch2.sql:103` 的 `('bi','audit_logs')` 归档删除，**下次 analytics 启动会立即重建空表**；
- 重建时 `tenant_id` 属于「本次 ensure 新增列」且表为空，[schema.rs](file:///Users/xingzhai/TOPEMS/lib/shared-db/src/schema.rs#L586) 的 `harden_new_tenant_tables` 会补 `ENABLE`+`FORCE` 并创建 `tenant_isolation_audit_logs`（谓词含 nil-UUID 兜底、无 `app.rls_system` 通道），与 `20261119141000` 守卫期望的 `bi_allow_all_audit_logs` 不一致。

## 5. 结论与建议

| 选项 | 判定 | 依据 |
|---|---|---|
| 收紧为严格 B | **不做** | 无租户读写路径，收紧无收益；且会与 schema-defense 重建策略冲突 |
| 保持有意放行 + 守卫 | **保持现状，但需更正登记理由** | 现状 `bi_allow_all_audit_logs` 已由 `20261119141000` 守卫钉住；但它不是「共享审计系统通道」表，理由是「schema-defense 骨架表、无租户数据通路」 |
| 归档删除（batch2 现值） | **建议移出** | 启动即重建，DROP 不持久，且会打乱守卫不变量 |

### 已处理（2026-11-19 后续变更）

1. 已将 `('bi','audit_logs')` 从 `20261119110000_drop_dead_tables_batch2.sql` 移除（187 张），并在 `database/migration-exemptions.json` 登记 `B20261119-batch2-bi-audit-logs-keep`；analytics 的 `SERVICE_SCHEMA`/`TABLE_DEFS` 不动。
2. `20261119141000` 的 `v_dropped` 保留 `bi.audit_logs` 不改：表存在时守卫走正常断言，`bi_allow_all_audit_logs` 仍被校验；策略快照随同批迁移更新。
3. 该表保留期间维持 `bi_allow_all_audit_logs` 不动；若要收紧，必须先让 analytics 停止维护该表。

## 6. 复现命令

```sql
-- 策略与租户列
select p.polname, p.polcmd, p.polpermissive,
       pg_get_expr(p.polqual, p.polrelid) as qual,
       pg_get_expr(p.polwithcheck, p.polrelid) as with_check
from pg_policy p where p.polrelid = 'bi.audit_logs'::regclass;

select attname from pg_attribute
where attrelid = 'bi.audit_logs'::regclass and attnum > 0 and not attisdropped;
```

```bash
# 动态前缀实参
grep -rhoE 'SchemaAwareAuditLogService::new(_system_channel)?\([^,]+, *"[a-z_]+"' svc lib
# schema-defense 归属
grep -n 'SERVICE_SCHEMA\|audit_logs' svc/analytics/src/models/schema_defense.rs
```
