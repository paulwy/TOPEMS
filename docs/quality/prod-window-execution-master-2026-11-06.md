# prod 窗口执行总表（字典回灌 + 回填 + 清理 + 收紧 + 冒烟）

- 日期：2026-11-06
- 状态：**本地整套演练通过；prod 未执行任何 DML/DDL/重启/部署**
- 性质：可直接打印照做的窗口执行单；prod 仍只读
- 关联：
  - [字典回灌窗口清单](dict-replay-window-checklist-2026-11-06.md)（先灌后发）
  - [字典回灌方案存档](prod-dict-seed-replay-plan-2026-11-06.md)
  - [7 表回填计划](tenant-backfill-plan-7-tables-2026-11-06.md)
  - [RLS 下一批评估](rls-tenant-isolation-next-batch-2026-11-06.md)
  - [清理确认稿](tenant-cleanup-confirmation-2026-11-06.md)
- 脚本：
  - 一键入口：[window-execution.sh](../../scripts/db/window-execution.sh)
  - 本地整套演练：[window-rehearsal.sh](../../scripts/db/window-rehearsal.sh)
  - 字典段：[dict-replay-window.sh](../../scripts/db/dict-replay-window.sh)
  - 迁移：[20261107000008_dict_tenant_isolation_strict.sql](../../database/migrations/20261107000008_dict_tenant_isolation_strict.sql)、
    [20261107000013_rls_tenant_isolation_backfilled_7.sql](../../database/migrations/20261107000013_rls_tenant_isolation_backfilled_7.sql)

---

## 0. 一键入口（先看这里）

### 0.1 本地演练（本轮已执行，自动跑完并 DROP）

```bash
scripts/db/window-rehearsal.sh
```

- 自动创建 `topems_window_drill` / `topems_window_verify`，从本地 `topems` 克隆；
- 四段全跑：前置 → 9 表备份与恢复验证 → 字典 77/397 → 回填 → 清理/标记 → 发布收紧 → stub 冒烟；
- 成功后 **DROP 两个 scratch 库**，主开发库 `topems` 不动；
- 需要复核时：`KEEP_DRILL_DB=1 scripts/db/window-rehearsal.sh`；
- app 角色密码不入库：运行时设置 `WINDOW_APP_PASSWORD`（或 `PGPASSWORD`），也可直接给 `WINDOW_APP_DSN`。

### 0.2 prod 窗口（需授权后手工执行）

```bash
WINDOW_TARGET=prod ALLOW_PROD_WINDOW=yes WINDOW_CONFIRM=yes \
PROD_WINDOW_REASON='<工单号/审批号>' \
scripts/db/window-execution.sh all \
  --dsn "$OWNER_DSN" --app-dsn "$APP_DSN" \
  --restore-dsn "$RESTORE_DSN" \
  --backup-dir /Users/air/topems/backups \
  --anchor "$(psql "$OWNER_DSN" -tA -c "select max(version) from _sqlx_migrations where success")" \
  --base-url "$BASE_URL" --super-token "$SUPER_TOKEN" --tenant-token "$TENANT_TOKEN" \
  --tenant-id "$TENANT_ID" --notify-user-id "$NOTIFY_USER_ID"
```

**脚本会在以下 5 个位置停下来等人工输入 `yes`（非交互直接 exit 3）**：

| 停点 | 位置 | 人工要看什么 |
| --- | --- | --- |
| 1 | 备份 + 恢复验证后 | `backup_verify.tsv` 9 张表指纹全部一致；备份文件与 SHA256 已登记 |
| 2 | 字典段后 | `dict_verify.txt` 为 `77/397`、legacy `4/17`、6 组 OK |
| 3 | 回填段后 | `backfill.txt` 的 `BACKFILL|audit` / `BACKFILL|rfm` 行数与预统计一致 |
| 4 | 清理段后 | `cleanup_a.txt` 四表 `deleted=target`、非目标行数不变；`cleanup_b.txt` 标记数一致 |
| 5 | 发布收紧后 | `release.txt` 迁移全部 OK；`postcheck.txt` 策略/行数断言通过；**此处才允许人工部署二进制并滚动重启（先 master-data，再 server）** |

> `WINDOW_AUTO=1` 仅用于本地演练/stub；prod 窗口禁止设置，否则会跳过人工停点。

---

## 1. 口径与范围

| 项 | 口径 |
| --- | --- |
| 备份目录 | `/Users/air/topems/backups/` |
| 备份命名 | `<table>_<yyyyMMdd_HHmmss>.dump` / `.csv` / `.dump.sha256` |
| 备份表 | 字典 2 张 + 本批 7 张，共 9 张 |
| 备份形式 | `pg_dump -Fc` + CSV，双份 |
| 备份账号 | **owner / superuser / bypassrls**（旧策略下表可能对 app 角色不可见） |
| 数据操作账号 | owner（回灌、回填、清理、迁移） |
| 验证账号 | `topems_app`（非 superuser，验证 RLS 可见性） |
| 字典终态 | `77` 类 / `397` 项；legacy 4 类 / 17 项保留 |
| 回填 | 现场重测；prod 基线约 `317` 行 = rfm `300` + audit `17` |
| 清理 | 现场重测；prod 基线约 `194–198` 行（A 组） |
| B 组 | audit 孤儿打 `_orphan` 标记，不删、不归档、不加列；prod 约 `72–74` |
| 收紧 | 窗口内只收紧 **字典 2 张 + 已回填 7 张**；其余 30 高危、271 中危窗口后分批 |
| 段间规则 | **禁止跳段**；任一段失败必须回滚/恢复后再决定是否重跑 |

9 张备份表：

`public.core_dict_types`、`public.core_dict_items`、`crm.crm_master_data_refs`、
`crm.returns`、`crm.customers`、`crm.rfm_results`、`ehs.qa_ehs_risks`、
`ehs.qa_ehs_environment_monitors`、`public.audit_logs`。

---

## 2. 时间线（本地演练实测 + prod 预估）

本地演练（`20261106_153005`，scratch 库 + stub）：

| 段 | 内容 | 实测 |
| --- | --- | --- |
| 0 | 前置检查 | 0.76 s |
| 1 | 9 表 dump + CSV | 9.73 s |
| 1b | 恢复到 scratch + 逐表指纹比对 | 4.83 s |
| 2 | 字典回灌 + 清理 probe + 6 组核对 | 0.71 s |
| 3 | 回填（rfm + audit） | 0.11 s |
| 4 | A 组清理 + B 组标记 | 0.33 s |
| 5 | 前向迁移 7 条 + 收紧 + 后核对 + RLS 实测 | 4.78 s |
| 6 | stub HTTP 冒烟 | 0.22 s |
| — | **四段合计** | **21.46 s** |
| — | **整套脚本墙钟（含克隆库/基线/stub/DROP）** | **41 s** |

prod 预估窗口 **30–45 分钟**：备份与恢复验证 5–10、字典 <2、回填 <1、清理 <1、
发布+重启 10–15、冒烟 5、缓冲 10。`pg_dump` 为 MVCC 快照，不阻塞读写；
回灌为行级 INSERT/UPDATE，不重建表。

---

## 3. 前置检查（段 0，只读）

```bash
psql "$OWNER_DSN" -X -v ON_ERROR_STOP=1 -f scripts/db/sql/window_preflight.sql
```

必须全部满足，否则**中止，不进入备份**：

| 检查 | 失败动作 |
| --- | --- |
| 9 张表存在 | 中止，核对 schema/库名 |
| 7 张表有 `tenant_id`；`crm.returns.created_by`、`ehs.qa_ehs_risks.created_by` 存在 | 中止；`risks.created_by` 缺失说明 schema 漂移 |
| `active_tx = 0` | 等待/摘流量后再执行 |
| 账本 anchor 与现场 `max(version)` 一致 | 中止，禁止窗口内改 anchor |
| pending 迁移都在已评审清单内（本批为 08 + 13，以及已评审并行批次 07/09/10/11/12） | 出现未知迁移，暂停窗口 |

现场重测输出（`PREFLIGHT|` 行）填入第 9 节执行记录，**数量不写死**。

---

## 4. 段 1：备份 + 可恢复性验证

### 4.1 备份

```bash
scripts/db/window-execution.sh backup \
  --dsn "$OWNER_DSN" --backup-dir /Users/air/topems/backups --out-dir /tmp/window-prod
```

- 每表 `pg_dump -Fc --enable-row-security`（会话 `app.rls_system=on`）+ CSV；
- 文件名严格 `<table>_<yyyyMMdd_HHmmss>.<dump|csv>`；
- 生成 `.dump.sha256` 与 `backup_manifest.tsv`（base / rows / dump / csv）。

### 4.2 可恢复性验证（不能只看“文件生成成功”）

```bash
scripts/db/window-execution.sh verify-backup \
  --dsn "$OWNER_DSN" --restore-dsn "$RESTORE_DSN" \
  --backup-dir /Users/air/topems/backups --out-dir /tmp/window-prod
```

- 在独立 scratch 库 `TRUNCATE` 9 表（`CASCADE`，scratch 专用）；
- 按依赖顺序 `pg_restore --data-only --enable-row-security --exit-on-error -n <schema> -t <table>`；
- 逐表比对**行数 + 整行 md5 指纹**（等价于全列分布一致）；
- 任一表不一致 → **中止窗口**，不得继续。

演练证据（9/9 全部一致）：

```text
core_dict_types            rows|7|a603bb...
core_dict_items            rows|24|5b987b...
crm_master_data_refs       rows|829|3fd03b...
returns                    rows|183|54a4ab...
customers                  rows|293|e482e1...
rfm_results                rows|271|9efd5c...
qa_ehs_risks               rows|244|a402f5...
qa_ehs_environment_monitors rows|218|752bce...
audit_logs                 rows|2615|e728a1...
```

prod 窗口时把 `$RESTORE_DSN` 指向同版本的独立恢复库；**不要恢复到业务库**。

---

## 5. 段 2：字典回灌（77/397）

```bash
DICT_WINDOW_CONFIRM=yes scripts/db/dict-replay-window.sh replay \
  --dsn "$OWNER_DSN" --out-dir /tmp/window-prod/dict
DICT_WINDOW_CONFIRM=yes scripts/db/dict-replay-window.sh cleanup \
  --dsn "$OWNER_DSN" --out-dir /tmp/window-prod/dict
DICT_WINDOW_CONFIRM=yes scripts/db/dict-replay-window.sh verify \
  --dsn "$APP_DSN" --out-dir /tmp/window-prod/dict
```

- 回灌使用本次发布 commit 构建的 `seed_dict_replay`，只合并、不清表；
- 清理 `zz_b4_probe2` 有守卫（0 项、`category=general`、只删该 code）；
- verify 必须用 **app 角色**（superuser 会绕过 RLS，G5 会假通过）。

终态断言：`types=77`、`items=397`、legacy `4/17`、`tenant_id` 全部 `…0001`、
标准类无空项、普通租户不可见系统字典。

中止点：G1–G6 任一失败；`all_types` 非 78 或清理后非 77；legacy 项数不是 17。

回滚：
- 次选 `rollback-incremental`（按 `window_start` 删除新增行，保留 legacy）；
- 首选 `rollback-restore`（`TRUNCATE` 两表 + 按 types→items 两步恢复，`--exit-on-error`）。

---

## 6. 段 3：317 行回填（现场重测）

```bash
psql "$OWNER_DSN" -X -v ON_ERROR_STOP=1 -f scripts/db/sql/tenant_backfill_7.sql
```

| 表 | 归因规则 | prod 基线 | 断言 |
| --- | --- | --- | --- |
| `public.audit_logs` | `entity_type='project'` 且 `entity_id` 关联 `pm.projects` 非零租户 | 17 | UPDATE 行数 = 预统计；回填后残留 0；非目标租户行数不变 |
| `crm.rfm_results` | `customer_id` 关联 `crm.customers` 非零租户 | 300 | 同上 |

- **绝不兜底到 `…0001`**；孤儿保持 NULL/0，留待 B 组标记。
- 命中 0 行直接中止（判据或数据已变）。
- 输出 `BACKFILL|audit|pre|upd`、`BACKFILL|rfm|pre|upd` 与租户分布。

演练实测（本地 probe 数据，数量与 prod 不同，机制一致）：
`BACKFILL|audit|3|3`、`BACKFILL|rfm|189|189`。

中止/回滚：任一行数不一致 → 事务内抛错，psql 立即退出；用段 1 备份恢复该表。

---

## 7. 段 4：A 组清理 + B 组标记

### 7.1 A 组（4 表，按表独立事务）

```bash
psql "$OWNER_DSN" -X -v ON_ERROR_STOP=1 -f scripts/db/sql/tenant_cleanup_a_group.sql
```

| 表 | 判据 | prod 基线 |
| --- | --- | --- |
| `crm.crm_master_data_refs` | `tenant_id=0 AND local_entity_id IS NULL` | 121 |
| `crm.returns` | `tenant_id=0 AND customer_id IS NULL AND created_by=<冒烟账号>` | 18（14:14 实测 19） |
| `ehs.qa_ehs_risks` | `tenant_id=0 AND title='未命名风险' AND created_by IS NULL` | 19（实测 20） |
| `ehs.qa_ehs_environment_monitors` | `tenant_id=0 AND name='未命名监测点' AND COALESCE(created_by,'')=''` | 36（实测 38） |

每表断言：`DELETE 行数 = 预统计`、目标残留 0、非目标行数不变。目标 0 行按失败处理
（防止判据失效后“静默成功”）。**不删** `crm.customers`（2 行软删）、**不删** audit 合成行。

演练实测（本地 probe 数据）：refs `814`、returns `183`、risks `180`、monitors `218`，
非目标行数分别为 `15 / 0 / 64 / 0` 且前后不变。

### 7.2 B 组（audit 孤儿标记）

```bash
psql "$OWNER_DSN" -X -v ON_ERROR_STOP=1 -f scripts/db/sql/tenant_orphan_mark_b.sql
```

- 复用 `request_details` JSONB，合并 `{"_orphan":"b72-20261106"}`；
- 排除合成租户 `…0099`；判据用 `IS DISTINCT FROM` 避开 NULL 陷阱；
- 幂等：已带 `_orphan` 的行不再更新；
- 演练实测 `target=337 / updated=337 / marked_total=337`（本地 probe 数量）。

回滚 B 组：

```sql
UPDATE public.audit_logs
   SET request_details = request_details - '_orphan'
 WHERE request_details ? '_orphan';
```

### 7.3 守住不动的基线

执行记录必须登记：`crm.customers` 总数、`public.audit_logs` 总数、合成 `…0099` 行数，
三段前后一致；任何变化都按误伤回滚。

---

## 8. 段 5：发布并收紧 + 段 6 冒烟

### 8.1 前向迁移

```bash
bash scripts/migration/apply-forward.sh --dsn "$OWNER_DSN" --anchor "$ANCHOR" --prod
```

- 本批窗口内必须且只收紧 **9 张表**：字典 2 张（迁移 08）+ 已回填 7 张（迁移 13）；
- 迁移 13 删除 7 表全部历史策略，只建一条 `rls_tenant_isolation`：
  `app.rls_system='on' OR tenant_id = app.tenant_id`；`ENABLE + FORCE RLS`；
- 不含 NULL/空串/全零 UUID 放行分支；末尾断言每表恰好 1 条策略。

> 版本号注意：仓库并行批次已占用 `20261107000012`，本批 7 表收紧迁移固定为
> `20261107000013`。演练首次使用 12 触发主键冲突，已修正（见第 10 节问题 1）。

### 8.2 收紧后核对

```bash
psql "$APP_DSN" -X -v ON_ERROR_STOP=1 -f scripts/db/sql/window_postcheck.sql
```

必须通过：
- 字典 `77/397`、legacy `4/17`；
- 4 表目标残留均为 0；rfm/audit 租户分布符合预期；
- 9 表策略数 = 1，表达式含 `app.rls_system` 与 `app.tenant_id`，不含全零放行；
- `ENABLE + FORCE RLS` 均开启；
- RLS 实测：`dict_0001=77`、`dict_1111=0`、`audit_1111=0`、`refs_1111=0`。

### 8.3 部署与冒烟（人工）

- 迁移完成后才部署新二进制；**先 master-data，再 server**，滚动重启；
- 冒烟：

```bash
DICT_WINDOW_CONFIRM=yes scripts/db/dict-replay-window.sh smoke \
  --base-url "$BASE_URL" --super-token "$SUPER_TOKEN" --tenant-token "$TENANT_TOKEN" \
  --tenant-id "$TENANT_ID" --notify-user-id "$NOTIFY_USER_ID" --expect-tenant-total 0
```

- 超管字典列表 `total≥77` 且含 4 个 legacy 类；普通租户 `total=0` 且不泄露系统字典；
- 通知创建 HTTP 200。

失败中止：迁移任一失败、策略数≠1、后核对任一断言失败、5xx 明显上升、字典列表为空、
写接口大面积 RLS 错误、主数据业务阻塞 → 立即停止，按第 11 节回滚。

---

## 9. 执行记录表（窗口时手填）

| 项 | 值 |
| --- | --- |
| 窗口日期/时间 | |
| 操作人 / 复核人 | |
| 工单/审批号 | |
| prod 主机 / 库 | |
| anchor（窗口前） | |
| pending 迁移清单 | |
| 备份时间戳（9 表） | |
| 备份 SHA256 登记 | |
| 恢复验证结果（9/9） | |
| 字典回灌 pre→post | 7/24 → 77/397 |
| legacy 4 类分项 | / / / |
| 回填 audit pre→upd | |
| 回填 rfm pre→upd | |
| A 组 refs pre→del | |
| A 组 returns pre→del | |
| A 组 risks pre→del | |
| A 组 monitors pre→del | |
| B 组 audit pre→marked | |
| customers 总数（前/后） | |
| audit 总数（前/后） | |
| audit …0099（前/后） | |
| 迁移结果 | |
| 策略数 9/9 = 1 | |
| FORCE RLS 9/9 | |
| 冒烟结果 | |
| 是否触发回滚 / 路径 | |
| 窗口结束时间 | |

---

## 10. 演练发现的问题与修正

| # | 问题 | 影响 | 修正 |
| --- | --- | --- | --- |
| 1 | 迁移版本 `20261107000012` 与并行批次 `drop_unused_permission_codes_batch25` 冲突 | 发布段 `duplicate key _sqlx_migrations_pkey`，最后一条失败 | 本批迁移改为 `20261107000013`；窗口前必须核对 pending 版本唯一 |
| 2 | 用 `topems_app` 做备份时 `crm.customers` 只导出 **0 行**（旧策略无系统通道，app 看不到） | 备份“成功”但不可恢复，且自我比对 0=0 假通过 | 备份/指纹/恢复验证统一用 **owner/bypassrls**；app 仅用于收紧后的可见性验证 |
| 3 | `pg_restore -t public.core_dict_types` 不匹配对象 | 恢复 0 行 | 改 `-n public -t core_dict_types`，types→items 两步 + `--exit-on-error` |
| 4 | 恢复库 `TRUNCATE` 被 `crm.return_items` 外键拦截 | 恢复中断，后续出现重复键 | scratch 使用 `TRUNCATE ... CASCADE`；prod 恢复前必须停写 |
| 5 | 本地库缺 `ehs.qa_ehs_risks.created_by`（prod 为 uuid） | 清理 SQL 在本地无法执行 | 演练库加 prod 形态 shim；前置检查断言该列存在，prod 缺列即中止 |
| 6 | superuser 跑字典 verify，G5 隔离断言假通过 | 看不到“普通租户泄露系统字典” | verify/postcheck 固定用 app 角色 DSN |
| 7 | `run_timed` 关闭 errexit，段内失败后仍继续 | 备份恢复失败后还进了下一段 | 每个关键命令显式 `|| return 1`，管道 `pipefail` |
| 8 | 指纹采集把 `SET` 回显混入结果 | 比对字符串污染 | psql 加 `-q` |
| 9 | bash 变量紧邻全角中文（`$ts（`）被当作变量名 | `unbound variable` | 统一写 `${var}` |
| 10 | `apply-forward` 只应用 `version > anchor`，账本缺失但版本小于 anchor 的迁移不会补 | 误以为 08 会在窗口内应用 | 窗口 anchor 必须取真实 `max(version)`；本批演练 anchor=06，发布段应用 07–13 共 7 条 |

---

## 11. 回滚手册

| 范围 | 动作 | 前置 |
| --- | --- | --- |
| 字典 | `dict-replay-window.sh rollback-incremental`（删窗口新增，保留 legacy） | `DICT_WINDOW_CONFIRM=yes`，`window_start.txt` |
| 字典（完整） | `rollback-restore`：`TRUNCATE` 两表 + 按依赖恢复 | 停写；owner 账号；dump 存在 |
| 回填/清理（单表） | `pg_restore --data-only --exit-on-error -n <schema> -t <table>` 从段 1 dump 恢复 | 停写该表；owner |
| B 组标记 | `request_details - '_orphan'` | 只减键，不触碰原有键 |
| 收紧策略 | 不建议回退到 NULL/0 放行；如必须，先恢复旧策略并立刻安排修复 | DBA + 变更审批 |
| 迁移账本 | 不从账本删行来“假装没应用”；按备份/前向修复 | DBA |

**回滚触发**：接口 5xx 明显上升、字典列表为空、写接口大面积 RLS 错误、主数据业务阻塞、
恢复验证不一致、策略/行数断言失败。

---

## 12. 收紧排期（窗口后）

窗口内只做：字典 2 张 + 已回填 7 张（本表第 8.1 节）。

窗口后分批（已写入 [TODO.md](../../TODO.md)）：

| 批次 | 范围 | 前置 | 排期位置 |
| --- | --- | --- | --- |
| 下一批 A | 30 张普通高危（无 NULL/0 存量或已确认可回填） | 每表先只读出分布；有脏行先回填 | 窗口后第 1 个变更窗口 |
| 下一批 B | 271 张中危（含放行分支但当前调用方均带租户） | 后台任务/裸 SQL 调用方清单确认 | 窗口后第 2–3 个变更窗口，按 50–80 张/批 |
| 收尾 | 全库 `FORCE RLS` 覆盖核对 + fail-closed 回归 | A/B 完成 | 最后 1 个窗口 |

硬规则：**先回填后收紧**；任何表在收紧前必须完成“现场重测 → 回填/清理 → 备份 → 再收紧”。

---

## 13. 证据索引（本轮本地）

- 演练目录：`tmp/window-rehearsal-20261106_153005/`
  - `summary.txt`（分段耗时、总耗时、墙钟、9 表指纹）
  - `window/preflight.txt`、`window/backfill.txt`、`window/cleanup_a.txt`、
    `window/cleanup_b.txt`、`window/release.txt`、`window/postcheck.txt`、
    `window/rls_visibility.txt`、`window/dict_verify.txt`
- 备份：`/Users/air/topems/backups/*_20261106_153025.{dump,csv,dump.sha256}`
- 演练库已 DROP；`select datname ... like 'topems_window%'` 返回 0 行；主开发库 `topems` 未改动。
- **prod 连接数：0；prod audit_logs 未读取、未写入。**
