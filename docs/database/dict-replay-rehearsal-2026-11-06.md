# 字典回灌 + 发布窗口本地演练记录

- 日期：2026-11-06
- 环境：本地 PostgreSQL 18.4，scratch 库 `topems_dict_rehearsal`（从本地 `topems` 模板复制后回退为 prod 基线）
- 性质：**演练，不涉及 prod**；未对 prod 执行任何 DML/DDL
- 脚本：[scripts/db/dict-replay-window.sh](../../scripts/db/dict-replay-window.sh)
- 核对 SQL：[scripts/db/sql/dict_replay_verify.sql](../../scripts/db/sql/dict_replay_verify.sql)

## 1. 演练基线

scratch 库重置为 prod 2026-11-06 只读核对到的形态：

| 项 | 值 |
| --- | --- |
| `core_dict_types` | 7 行：`department_type` / `education` / `employee_status` / `gender` / `marital_status` / `position_level` / `zz_b4_probe2` |
| `core_dict_items` | 24 行（legacy 4/4/4/5，`employee_status` 4 项含 `regular`，`gender` 3 项） |
| 租户 | 全部 `00000000-0000-0000-0000-000000000001` |
| 策略 | prod 旧 `rls_tenant_isolation`（含 `app.tenant_id` NULL / 空 / 全零放行） |
| 账本 | 已删除 `20261107000008`，模拟“迁移未应用” |

## 2. 演练序列与输出

### 2.1 备份 + 回灌 + 清理 + 6 组核对

```bash
DICT_WINDOW_CONFIRM=yes scripts/db/dict-replay-window.sh all-pre-release \
  --dsn "$APP_DSN" --out-dir /tmp/dict-window-rehearsal \
  --seed-bin target/debug/examples/seed_dict_replay
```

关键输出：

```text
[backup] pg_dump -> /tmp/dict-window-rehearsal/dict_before_20261106_124344.dump
[backup] window_start=2026-11-06 12:43:44.682044+08
[replay] dict replay done: all_types=78 system_category=71 legacy=4 items=397
[replay] legacy type department_type: 4 items
[replay] legacy type education: 4 items
[replay] legacy type marital_status: 4 items
[replay] legacy type position_level: 5 items
[cleanup] zz_b4_probe2 清理完成（删除类型 1 行）
[verify] G1 OK: types=77, standard_codes=73, items=397
[verify] G2 OK: legacy_types=4 legacy_items=17
[verify] G3 OK: 所有字典行 tenant_id=…0001（无 NULL/全零）
[verify] G4 OK: 标准类无空项，标准类项数=380
[verify] G5 OK: …0001 可见全部，普通租户 0 行
[verify] G6 OK: 无 zz_/B4- 残留
[verify] ALL 6 GROUPS OK
```

结论：**合并而非清空**。回灌前 7 类 / 24 项，回灌后 78 类 / 397 项，清理 probe 后 77 类 / 397 项；
legacy 4 类及其 17 项逐项存在。

### 2.2 先灌后发：应用迁移

```bash
DICT_WINDOW_CONFIRM=yes scripts/db/dict-replay-window.sh release \
  --dsn "postgres:///topems_dict_rehearsal" --anchor 20261107000007
```

scratch 同时应用了并行会话新增的 `20261107000009`（仅演练库；prod 窗口前需核对 pending 清单）。
迁移后复核：

```sql
SET app.rls_system='on';
SELECT tablename, qual FROM pg_policies
 WHERE schemaname='public' AND tablename IN ('core_dict_types','core_dict_items');
```

```text
core_dict_items|((COALESCE(current_setting('app.rls_system'::text, true), ''::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))
core_dict_types|((COALESCE(current_setting('app.rls_system'::text, true), ''::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))
```

迁移后再次执行 6 组核对，仍为 `types=77 / items=397 / ALL 6 GROUPS OK`。

### 2.3 回滚路径 A：增量回滚

```bash
DICT_WINDOW_CONFIRM=yes scripts/db/dict-replay-window.sh rollback-incremental \
  --dsn "$APP_DSN" --out-dir /tmp/dict-window-rehearsal
```

```text
[rollback-incremental] 删除 created_at >= 2026-11-06 12:43:44.682044+08 的字典行
DELETE 373
DELETE 71
NOTICE:  增量回滚 OK，legacy 4 类 / 17 项仍在
```

终态复核：

```text
types=6 legacy=4 probe=0
items=24
```

结论：删除窗口内新增的 373 项 / 71 类，存量 6 类 / 24 项与 legacy 4/17 保留。

### 2.4 再次回灌至 77/397，然后回滚路径 B：备份恢复

```bash
DICT_WINDOW_CONFIRM=yes scripts/db/dict-replay-window.sh replay ...   # 77/397
DICT_WINDOW_CONFIRM=yes scripts/db/dict-replay-window.sh cleanup ...
DICT_WINDOW_CONFIRM=yes scripts/db/dict-replay-window.sh verify ...    # ALL 6 GROUPS OK

DICT_WINDOW_CONFIRM=yes scripts/db/dict-replay-window.sh rollback-restore \
  --dsn "postgres:///topems_dict_rehearsal" --out-dir /tmp/dict-window-rehearsal
```

最终复核：

```text
types=7 legacy=4 probe=1
items=24
```

结论：完整回到备份时点（7 类 / 24 项，含 `zz_b4_probe2`），legacy 4/17 保留。

## 3. 演练发现的真实问题（已修复）

首次执行恢复时出现两类问题，若不修复会**静默丢数据**：

1. **`pg_restore -t public.core_dict_types` 不匹配任何对象**：`pg_restore` 的 `-t` 只匹配表名，
   不匹配 `schema.table`；必须 `-n public -t core_dict_types`。旧脚本因此“成功”但 0 行。
2. **默认按 TOC 顺序先恢复 items、后恢复 types**：`core_dict_items` 外键依赖 `core_dict_types`，
   直接报 `23503`；而 `pg_restore` 默认忽略错误并返回 0，导致只恢复了 types、items 为空。

修复：恢复改为两步、按依赖顺序（types → items），并加 `--exit-on-error`；修复后演练通过。

## 4. 演练结论

- 窗口步骤可执行：备份 → 回灌 → 清理 → 6 组核对 → 迁移 → （冒烟需真实 BFF/Token，窗口时执行）；
- 回灌是合并：legacy 4 类 / 17 项在 77/397 终态逐项存在；
- 两条回滚路径均可用：增量回滚 6/24、备份恢复 7/24；
- 恢复路径依赖表 owner 权限且 `TRUNCATE` 期间字典不可用，窗口内必须先停写；
- 未发现会“锁死业务”的策略问题；发现的数据风险（`pg_restore` 静默丢行）已在脚本中修复并可复现验证。

## 5. 演练环境清理

- scratch 库保留用于复核；不参与 prod 发布。
- prod 仍为只读，未执行回灌、迁移或清理。
