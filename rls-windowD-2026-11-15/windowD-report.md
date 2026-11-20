**库身份：`topems_prod` @ `xingzhai@192.168.3.129`（PostgreSQL 18.4，psql `/opt/homebrew/bin/psql`，应用 `127.0.0.1:8099`）；`_sqlx_migrations` 账本 **679 行**，`max(version)=20261114202000`；在跑件 sha `98af398c431b86d4…fa7139`，pid **82863**。窗口 D 两笔迁移均已 `success=t`。**

# 窗口 D 报告（2026-11-15）：forecast 合成标记 + erp 合并域统一策略

## 1. 两笔迁移交付

| 版本 | 文件 | 方式 | 账本前后 | success | 迁移自带断言 |
|---|---|---|---|---|---|
| 20261114190000 | `forecast_v53_mark_synthetic.sql` | 单版本 `--apply-deferred`（ticket `TOPEMS-WINDOW-D-20261115`） | 677 → **678** 行（max 仍 20261114202000） | `t` | 三项自检全过（默认值=true、NOT NULL、NULL 行数=0），未抛 `forecast-v53-synthetic ABORT` |
| 20261114180000 | `erp_consolidation_group_tenant_rls.sql` | 单版本 `--apply-deferred`（同 ticket） | 678 → **679** 行（max 仍 20261114202000） | `t` | 形状自检全过（每表 1 条策略、表达式引用 `group_tenant_of`、必须 FORCE），未抛异常 |

命令原文（两笔各执行一次，未并入同一批）：

```
bash scripts/migration/apply-forward.sh --prod --ssh-host xingzhai@192.168.3.129 \
  --remote-db topems_prod \
  --remote-mig-dir /Users/xingzhai/topems/window-2026-11-15-windowD/migrations \
  --apply-deferred 20261114190000 --ticket TOPEMS-WINDOW-D-20261115
# == DEFER 补投模式：version=20261114190000，账本水位=20261114202000（允许 version <= 水位，仅此单版本）
# == OK：应用 1 条，无失败

bash scripts/migration/apply-forward.sh --prod --ssh-host xingzhai@192.168.3.129 \
  --remote-db topems_prod \
  --remote-mig-dir /Users/xingzhai/topems/window-2026-11-15-windowD/migrations \
  --apply-deferred 20261114180000 --ticket TOPEMS-WINDOW-D-20261115
# == DEFER 补投模式：version=20261114180000，账本水位=20261114202000（允许 version <= 水位，仅此单版本）
# == OK：应用 1 条，无失败
```

两笔均为单文件 `psql --single-transaction`，全程未重启服务（停机 0s，pid 始终 82863）。

### 投前门

- **代码依赖核对**：仓库 `/private/tmp/topems-rls-20261114` HEAD `8e6001bd9`、工作树 clean，HEAD 即运行件来源。
  - `erp.group_tenant_of` 命中 7 处：consolidation 6 处 INSERT（`scopes.rs:148`、`elimination_flow.rs:427/1115`、`internal_transactions.rs:274`、`elimination_rules.rs:160`、`scope_companies.rs:111`、`company_relations.rs:199`）。
  - forecast：已删静默伪造历史与硬编码 `0.85` / `sample_count=120`，`sample_count` 取真实训练月数（`forecast_v53.rs:741`）；`1700/1704` 的 `0.85/120` 仅为 `#[test]` 结构体字面量。
- **备份** `~/topems/backups/20261115-windowD-erp-forecast/`（6 文件全非空，sha256 已记）：

| 文件 | sha256 前缀 |
|---|---|
| `ledger_snapshot` | `9d4f3533…` |
| `erp8_policies_raw` | `0d04e9d5…` |
| `restore_ddl` | `18e38cbd…` |
| `rls_flags` | `8f96a335…` |
| `forecast2_columns` | `19ce49ac…` |
| `rowcounts` | `7643060c…` |

## 2. erp 8 表策略与四类判据

策略清单（全部 `relrowsecurity=t`、`relforcerowsecurity=t`，每表恰好 1 条）：

| # | 表 | 策略名 | FORCE RLS |
|---|---|---|---|
| 1 | `erp.company_relations` | `tenant_isolation_company_relations` | t |
| 2 | `erp.internal_transactions` | `tenant_isolation_internal_transactions` | t |
| 3 | `erp.consolidation_scopes` | `tenant_isolation_consolidation_scopes` | t |
| 4 | `erp.consolidation_scope_companies` | `tenant_isolation_consolidation_scope_companies` | t |
| 5 | `erp.consolidation_reports` | `tenant_isolation_consolidation_reports` | t |
| 6 | `erp.consolidation_report_lines` | `tenant_isolation_consolidation_report_lines` | t |
| 7 | `erp.elimination_rules` | `tenant_isolation_elimination_rules` | t |
| 8 | `erp.elimination_candidates` | `tenant_isolation_elimination_candidates` | t |

统一谓词（`qual` 与 `with_check` 完全一致，无 NULL/nil/空串兜底）：

```sql
(tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))
```

函数：`erp.group_tenant_of(uuid) → uuid`；`SET app.tenant_id=''` 后 `group_tenant_of(NULLIF(setting,'')::uuid) IS NULL` = **t**。

四类判据（非超户角色 `topems_prod`，超户先插 1 行 tenant `…0001` 到 `erp.consolidation_scopes`）：

| 判据 | 结果 | 证据 |
|---|---|---|
| 同租户读得到 | ✅ | GUC=0001 → `same_tenant_rows=1` |
| 异租户读不到 | ✅ | GUC=0002 → `other_tenant_rows=0` |
| 裸连接无 GUC 读 0 行 | ✅ | `no_guc=t, bare_rows=0`（同期超户可见 2 行） |
| 跨集团写被拒 | ✅ | GUC=0001 写 tenant 0002 → `ERROR: new row violates row-level security policy for table "consolidation_scopes"` |

补充：同租户写 → `INSERT 0 1`；探针行按精确 id 删除，`consolidation_scopes=0`、`company_relations=0`。

## 3. 接口实测

### 190000（forecast）

| 接口 | 结果 |
|---|---|
| `GET /api/finance/forecast-v53/cash-flow/predictions` | 200，`data:[]` |
| `GET /api/finance/forecast-v53/cash-flow/accuracy` | 200，`data:[]`（不再出现硬编码 0.85 / sample_count=120） |
| `POST /api/finance/forecast-v53/cash-flow/predict` | **500** → 见 K5 |

`is_synthetic`：两表均 `boolean NOT NULL DEFAULT true`，表/列注释已写，两表各 0 行。`sample_count` 为真实训练月数属代码层已改，但两表 0 行、无预测记录，运行时无可观察样本。

### 180000（erp 回归）

| 接口 | 探针行插入后 | 清理后 |
|---|---|---|
| `GET /api/erp/meeting-rooms` | 200，`total=1` | 200，`total=0` |
| `GET /api/erp/meeting-bookings` | 200，`total=1` | 200，`total=0` |
| `GET /api/erp/vehicles` | 200，`total=1` | 200，`total=0` |
| `GET /api/erp/vehicle-requests` | 200，`total=1`（补 `purpose` 后；空值时为 500，见 K4） | 200，`total=0` |

探针行均以超户显式 `tenant_id=…0001` 插入，接口返回条目可读出刚插入记录 → 本租户数据可见。清理用单事务按 4 个精确 id 硬删，4 表物理行数归 0。

## 4. 已知缺陷归属（本轮不改代码）

| 编号 | 位置 | 现象 | 真因 | 归属 |
|---|---|---|---|---|
| **K4** | `svc/erp/src/modules/vehicles.rs:536-544` | `purpose IS NULL` 的行让 `GET /api/erp/vehicle-requests` 整体 500 | `VehicleApplication.purpose` 用 `String` 接 nullable `text` | 探针触发，**非迁移引入**（策略由窗口 C 的 M2b 建，本次未动） |
| **K5** | `svc/finance/src/modules/forecast_v53.rs:352-368` | `POST /api/finance/forecast-v53/cash-flow/predict` 500 | `finance.vouchers.entity_id` 是 `text`，SQL 绑 `$2::uuid` → `text = uuid` | 既有代码缺陷，**与 190000 无关**（该迁移只加列） |

两条已按 K1/K3 格式登记进 `topems-table-inventory-2026-11-14.md` §7「已知缺陷登记」。

## 5. 10 分钟观测

窗口：`2026-11-14T17:14:31Z` → `17:23:31Z`，3 次取样（间隔 270s）：

| 取样 | 时间(UTC) | health | pid | idle_in_txn | deadlocks | 累计 ERROR 行 |
|---|---|---|---|---|---|---|
| 1 | 17:14:31 | 200 | 82863 | 0 | 0 | 5 |
| 2 | 17:19:01 | 200 | 82863 | 0 | 0 | 5 |
| 3 | 17:23:31 | 200 | 82863 | 0 | 0 | 5 |

观测期内 ERROR 无新增（始终 5 行），即窗口内 5 行 ERROR 全部来自功能实测的探针，归属：

- 1 行 = K5（`operator does not exist: text = uuid`，17:09:38Z，predict 探针）
- 4 行 = K4（17:13:16Z / 17:13:19Z 两次各 2 行：`decoding column "purpose"` + 同名失败的通用 `内部错误` 伴生行），即 **3 个主事件：1×K5 + 2×K4**，另 2 行为同一 K4 失败的伴生行。

**结论：无迁移引入的 ERROR、无常驻会话泄漏、无死锁、服务未重启。**

## 6. 回滚命令与判据

回滚文件已在仓库 `database/rollback/`；执行前需先暂存到生产（两笔都单独执行，均用 `--single-transaction`）：

```bash
scp database/rollback/20261114190000_forecast_v53_mark_synthetic.rollback.sql \
    xingzhai@192.168.3.129:/Users/xingzhai/topems/window-2026-11-15-windowD/rollback/
scp database/rollback/20261114180000_erp_consolidation_group_tenant_rls.rollback.sql \
    xingzhai@192.168.3.129:/Users/xingzhai/topems/window-2026-11-15-windowD/rollback/
```

### 6.1 回滚 20261114190000

```bash
ssh xingzhai@192.168.3.129 '/opt/homebrew/bin/psql -d topems_prod -v ON_ERROR_STOP=1 --single-transaction \
  -f /Users/xingzhai/topems/window-2026-11-15-windowD/rollback/20261114190000_forecast_v53_mark_synthetic.rollback.sql'
```

判据：`NOTICE 'rollback 完成：2 张表的 is_synthetic 列与表注释已移除'`，且

```sql
SELECT count(*) FROM information_schema.columns
 WHERE table_schema='finance'
   AND table_name IN ('finance_cash_flow_predictions_v53','finance_prediction_models_v53')
   AND column_name='is_synthetic';   -- 期望 0
```

⚠️ **前置约束**：在跑件 INSERT 已写 `is_synthetic`，单独回滚此迁移会让写路径报「列不存在」，因此只有在**同时回退二进制**时才用它；账本行需另行人工处理（`_sqlx_migrations` 中该版本行不会被脚本删除）。

### 6.2 回滚 20261114180000

```bash
ssh xingzhai@192.168.3.129 '/opt/homebrew/bin/psql -d topems_prod -v ON_ERROR_STOP=1 --single-transaction \
  -f /Users/xingzhai/topems/window-2026-11-15-windowD/rollback/20261114180000_erp_consolidation_group_tenant_rls.rollback.sql'
```

判据：`NOTICE 'rollback 完成：8 张表恢复为迁移前策略形状'`，且

```sql
-- 8 表策略数各为 1；7 张回到 erp_allow_all_*，elimination_candidates 回到 tenant_isolation（GUC 兜底写法）
SELECT c.relname, p.polname FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_policy p ON p.polrelid=c.oid
 WHERE n.nspname='erp' AND c.relname IN ('company_relations','internal_transactions',
   'consolidation_scopes','consolidation_scope_companies','consolidation_reports',
   'consolidation_report_lines','elimination_rules','elimination_candidates')
 ORDER BY 1;   -- 期望：7 条 erp_allow_all_* + 1 条 tenant_isolation

-- 期望 0
SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='erp' AND p.proname='group_tenant_of';
```

注意：回滚恢复的是**迁移前 fail-open 原文**（`USING(true)`），只用于回退，不作为长期口径；账本行同样需另行人工处理。

## 7. 结论

窗口 D 两笔迁移均落库且自检通过，账本 **679**、`max(version)=20261114202000`；erp 合并域 8 表已换成 `group_tenant_of` 单一谓词并保持 FORCE RLS，四类隔离判据全过；接口回归 200 且本租户数据可见；10 分钟观测无新增 ERROR、无死锁、无 idle-in-transaction、未重启。窗口内 ERROR 全部可归因于两条已登记代码缺陷（K4/K5），非迁移引入。
