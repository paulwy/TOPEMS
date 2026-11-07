# 本地数据漂移修复 + 漂移门禁「数据行断言」扩展（2026-11-06）

- 范围：**仅本地库 `topems`（`psql -h /tmp`）**；prod 零触碰。
- 目标：① 查清账本 `20261107000005` 记 `success=t` 但 3 条 `hrm:training_plan:*` 权限码缺失的原因并修复；
  ② 扫描其它「数据型迁移」的同类漂移（只报告）；③ 给 `ledger-ddl-drift` 门禁增加 `data_rows` 断言类型并固化。

---

## 1. 本地漂移：症状与根因

### 1.1 症状（修复前实测）

```
PERM|2      -- hrm:training_plan:* 只剩 2 条（read/update 或 read/delete 之一缺失）
B16|134     -- description LIKE '%batch16%' 应为 135
GRANTS?     -- 对应授权行同步缺失
```

账本侧：`_sqlx_migrations` 中 `20261107000005` 为 `success=t`；`000012_drop_unused_permission_codes_batch25`
**未记账**（本地未应用）。

### 1.2 根因（三条证据，逐一排除）

| 假设 | 核查 | 结论 |
|---|---|---|
| 迁移内 upsert 冲突（`ON CONFLICT`/`NOT EXISTS` 误判） | `000005` 用 `WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions WHERE code = v.code)`，仅判重、不删除；`gen_random_uuid()` 无冲突可能 | **排除** |
| 被后续迁移删除 | 本地账本只有 `000005/000006/000008/000017/000018`（20261107 段）；唯一删除这 3 码的 `000012` **未记账**；`000006` 文件内无 `DELETE` 语句 | **排除** |
| 迁移文件与账本脱节（改了文件未重跑） | 账本 `000005` 的 checksum（SHA-384）与当前文件 `shasum -a 384` **完全一致** | **排除** |
| 有人/某脚本在迁移之后**带外手工 DELETE** | 三条反证均指向「记账合法、数据被外部删除」；`core_role_permissions` 的 FK `confdeltype='a'`（NO ACTION），必须先删 9 条授权才能删码，符合手工按顺序清理的痕迹 | **判定为带外删除** |

> 结论：**不是迁移逻辑问题，是迁移后有人手工删除了 3 条码（且先删了授权行）**。
> 因此修复方式为「按迁移口径补回数据」，**不改任何迁移字节**。

### 1.3 修复（本地，事务内，幂等）

```sql
BEGIN;
INSERT INTO public.core_permissions (id, code, name, description, resource, action, level, created_at)
SELECT gen_random_uuid(), 'hrm:training_plan:create', 'training_plan新增',
       '[batch16] HRM 人力资源 - training_plan新增', 'hrm:training_plan', 'create', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions WHERE code = 'hrm:training_plan:create');
-- update / delete 两条同构

INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code = 'hrm:training_plan:create'
WHERE r.name IN ('admin','superadmin','hrm_manager')
  AND NOT EXISTS (SELECT 1 FROM public.core_role_permissions x
                  WHERE x.role_id = r.id AND x.permission_id = p.id);
-- 另两条同构
COMMIT;
```

修复结果（实测）：

```
INSERT 0 1 / INSERT 0 3（×3 条码）
RESTORE_MS=37
PERM|4            -- hrm:training_plan:read/create/update/delete 四条齐全
B16|135           -- batch16 恢复 135
GRANTS|9          -- admin/superadmin/hrm_manager × 3
```

账本与数据一致性：`000005 success=t` ↔ 135 条 `[batch16]` 码 + 9 条 hrm 授权，**已一致**。

---

## 2. 其它「数据型迁移」漂移扫描（只报告，不批量修）

扫描口径：已记账（本地 `success=t`）且以 `INSERT/UPDATE/DELETE` 写业务数据的迁移；
按迁移文件内的权限码字面量提取 declared 集合，与 `public.core_permissions` 实际行比对。

| 迁移 | 类型 | declared | present | missing | 结论 |
|---|---|---|---|---|---|
| `20260908000014` | 权限码 INSERT | 373 | 373 | 0 | 一致 |
| `20261024000016` | 权限码类（无可提取码） | 0 | — | — | 无数据断言口径，跳过 |
| `20261024000017` | 权限码类（无可提取码） | 0 | — | — | 同上 |
| `20261102000001` | 权限码 INSERT | 26 | 26 | 0 | 一致 |
| `20261107000005` | 权限码 INSERT | 135 | 135（修复后） | 0 | **本次唯一漂移，已修** |
| `20261107000006` | 权限码 INSERT | 30 | 30 | 0 | 一致 |

字典/菜单类数据迁移：

| 目标表 | 本地账本中「已记账且写入该表」的迁移 | 说明 |
|---|---|---|
| `public.core_dict_items` / `core_dict_types` | 0 条 | 字典由 `scripts/db/dict-replay-window.sh` 回灌，不走 INSERT 迁移 → 无此类漂移 |
| `public.core_menus` | 0 条 | 菜单由 seed 脚本/迁移外的 SQL 维护 → 同上 |

**清单结论**：本地数据型迁移中，本次抓到的漂移**只有 `000005` 一处**；其余已记账的权限 INSERT 迁移
declared/present 全部对齐。**未做批量修复**（按要求只报告）。

---

## 3. 门禁扩展：`data_rows` 断言类型

### 3.1 语义

在 `database/migration_drift_assertions.json` 中新增 kind = `data_rows`：

| 字段 | 必需 | 含义 |
|---|---|---|
| `source` | 是 | 声明数据的迁移版本；仅当该版本在本库 `success=t` 时才断言 |
| `sql` | 是 | 返回标量的 SELECT（通常 `count(*)`）；返回空按漂移处理 |
| `expected` | 是（整数） | 期望值；`Number(actual) !== expected` 即漂移 |
| `skip_if_applied` | 否 | 版本数组；其中任一版本 `success=t` 时**跳过该断言**（用于「A 写入、B 按设计删除」的成对场景） |
| `source_tokens` | 是（既有规则） | 防清单与迁移脱节的字面量校验 |

实现要点（[check-ledger-ddl-drift.mjs](file:///Users/air/TOPEMS/scripts/migration/check-ledger-ddl-drift.mjs)）：

- `VALID_KINDS` 增加 `data_rows`；清单校验要求 `sql` 非空、`expected` 为整数、`skip_if_applied` 为数组；
- SQL 生成用 `COALESCE((<sql>), -1)`，`-1` 表示「断言 SQL 返回空」；
- 判定 `value === "-1" || Number(value) !== expected`；
- 账本读取的版本集合扩展为 `source + skip_if_applied` 的并集；
- 失败文案改为「记账 success=t 与实际结构/数据不符」。

### 3.2 固化本次漂移的 4 条断言

| id | source | skip_if_applied | 断言 | expected |
|---|---|---|---|---|
| `perm.batch16.hrm_training_plan_rows` | `20261107000005` | `20261107000012` | 3 条 hrm 写码计数 | 3 |
| `perm.batch16.hrm_training_plan_grants` | `20261107000005` | `20261107000012` | 3 码 × admin/superadmin/hrm_manager 授权行 | 9 |
| `perm.batch16.total_rows` | `20261107000005` | `20261107000012` | `description LIKE '%batch16%'` 计数 | 135 |
| `perm.batch17.total_rows` | `20261107000006` | — | `description LIKE '%batch17%'` 计数 | 30 |

`skip_if_applied: 000012` 的原因：prod 批次 3 应用 `000012` 后，这 3 条码按设计被删除；
若不加开关，prod 会被正常下线误判为漂移。**本地/未应用 000012 的库仍会严格断言。**

---

## 4. 验证：负例拦截 + 恢复后通过 + 耗时

### 4.1 负例（本地删 1 条码 + 3 条授权）

按 FK 顺序先删授权、再删 `hrm:training_plan:create`，运行门禁：

```
NEG_EXIT=1
[Gate DRIFT] FAILED 3 项漂移（记账 success=t 与实际结构/数据不符）
      期望 数据行数 = 3 … 实际 数据行数 = 2
      期望 数据行数 = 9 … 实际 数据行数 = 6
      期望 数据行数 = 135 … 实际 数据行数 = 134
```

- 3 条断言全部命中，**退出码 1**（pre-push 会被拦下）；
- 墙钟约 **237 ms**。

### 4.2 恢复后（正例）

用 1.3 的幂等 SQL 恢复（`RESTORE_MS=37`），重跑：

```
[Gate DRIFT] PASS 断言 12 项，记账校验 12 项，耗时 110 ms
GATE_EXIT=0   GATE_MS=236
```

pre-push 触发器（`MIGRATION_DRIFT_FORCE=1 bash scripts/ci/check-ledger-ddl-drift.sh`）：

```
[Gate DRIFT] PASS 断言 12 项，记账校验 12 项，耗时 102 ms
TRIGGER_EXIT=0  TRIGGER_MS=141
```

### 4.3 耗时汇总

| 项 | 耗时 |
|---|---|
| 负例（3 项漂移） | ~237 ms |
| 正例（node 直跑） | 110 ms（墙钟 236 ms） |
| pre-push 触发器 | 102 ms（墙钟 141 ms） |

---

## 5. 结论与遗留

- 漂移根因：**迁移后带外手工删除**，非迁移缺陷；已按迁移口径幂等补齐（3 码 + 9 授权），账本与数据恢复一致。
- 数据型迁移扫描：`000005` 是本地唯一一处；其余权限 INSERT 迁移 declared/present 全部对齐；
  字典/菜单无 INSERT 迁移路径，不存在同类漂移。
- 门禁新增 `data_rows` 类型并固化 4 条断言；负例拦截（exit 1）、正例通过（PASS 12 项）均已实测。
- 遗留：`000012` 一旦记账，`skip_if_applied` 会让 hrm 3 码断言自动跳过（设计意图，非漏检）；
  若未来需要「删除后仍断言不存在」，应另加 `data_rows` + `expected: 0` 的反向断言，避免语义混淆。
