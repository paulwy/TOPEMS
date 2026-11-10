# prod 窗口执行总表（字典回灌 + 回填 + 清理 + 收紧 + 冒烟）

- 日期：2026-11-06
- 状态：**本地整套演练通过（SSH 传输模拟）；prod 未执行任何 DML/DDL/重启/部署**
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
- **白名单负例**：临时塞入 `20261108000000` 清单外迁移，`apply-forward` 必须 exit 1 且零 DDL；
- **SSH 传输模拟**：本地 `ssh`/`scp` shim 承担传输，SQL/迁移/seed 逐件 sha256 校验；
- 发布段只应用白名单 `08 + 13`，其余 pending 显式 `--defer` 保持 pending；
- 成功后 **DROP 两个 scratch 库**，主开发库 `topems` 不动；
- 需要复核时：`KEEP_DRILL_DB=1 scripts/db/window-rehearsal.sh`；
- 演练用 `WINDOW_APP_ROLE=topems_app` + owner `SET ROLE` 实测 RLS，不需要 app 登录密码；
  本地直连模式仍可给 `WINDOW_APP_DSN` / `WINDOW_APP_PASSWORD`。

### 0.2 prod 窗口（需授权后手工执行）

```bash
WINDOW_TARGET=prod ALLOW_PROD_WINDOW=yes WINDOW_CONFIRM=yes \
PROD_WINDOW_REASON='<工单号/审批号>' \
WINDOW_SSH_HOST='xingzhai@192.168.110.115' \
WINDOW_REMOTE_DB='topems_prod' \
WINDOW_REMOTE_DIR='/tmp/topems_window_20261106' \
WINDOW_REMOTE_DSN='postgres://xingzhai@localhost/topems_prod?host=%2Ftmp' \
scripts/db/window-execution.sh all \
  --restore-dsn "$RESTORE_DSN" --app-role topems_app \
  --backup-dir /Users/air/topems/backups \
  --expect-commit '<本轮发布 commit sha>' \
  --anchor "$ANCHOR" \
  --allow-migrations 20261107000008,20261107000013 \
  --defer-migrations '20261105235800,20261106000000,20261106000001,20261107000001,20261107000002,20261107000003,20261107000004,20261107000005,20261107000006,20261107000007,20261107000009,20261107000010,20261107000011,20261107000012,20261107000014,20261107000015,20261107000016' \
  --base-url "$BASE_URL" --super-token "$SUPER_TOKEN" --tenant-token "$TENANT_TOKEN" \
  --tenant-id "$TENANT_ID" --notify-user-id "$NOTIFY_USER_ID"
```

- prod 固定 **SSH 执行物模式**：不向本地暴露 DSN；`psql`/`pg_dump` 在主机本地 socket 执行；
- 执行物（6 个 SQL + 迁移 08/13 + `seed_dict_replay`）先投递到 `$WINDOW_REMOTE_DIR`，
  **逐件 sha256 与本地一致后才执行**；不使用主机仓库里 `0c11b5b90` 的代码；
- 备份在主机本地 `pg_dump -Fc` + CSV → 远端 sha256 → 取回 `/Users/air/topems/backups/` → 本地复核；
- 迁移白名单 fail-closed：`--only` 外且未 `--defer` 的 pending 会在任何 DDL 前 exit 1；
  `WINDOW_TARGET=prod` 时 `apply-forward` 必须带 `--prod`（脚本内强制）；
- 发布基线：`--expect-commit` 必须等于 `git rev-parse HEAD`，工作区必须干净；本轮连带
  batch25/26 代码（`6816f37d3`、`6bf524b2f`）及远端 4 个提交（`c28a4368b`、`e66eaa4bf`、
  `b9beb4f90`、`7b0357aa4`）一起上线。
- 远端已把 tier/auth/refresh 三条迁移重编号为 `000014–000016`；它们与 `07/09–12` 一样
  属本窗口 **defer**，不应用。

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
| 备份账号 | **超级用户**（`xingzhai` / `topems`）。B5 收口后 `finance`/`pdm` 等表已 `FORCE RLS`，**app 角色 `pg_dump --data` 会被拒**（`query would be affected by row-level security policy`），故窗口备份一律用超管，不接受绕道； |
| 数据操作账号 | owner（回灌、回填、清理、迁移） |
| 验证账号 | `topems_prod`（非 superuser，验证 RLS 可见性）；**验证禁止用超户** |
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

本地演练（`20261106_163232`，scratch 库 + stub + SSH 传输模拟，rebase 后最终代码）：

| 段 | 内容 | 实测 |
| --- | --- | --- |
| 0a | 发布基线 + 执行物投递/sha256 | 1.42 s |
| 0 | 前置检查 | 0.09 s |
| 1 | 9 表 dump + CSV（主机本地 → 取回） | 1.46 s |
| 1b | 恢复到 scratch + 逐表指纹比对 | 0.58 s |
| 2 | 字典回灌 + 清理 probe + 6 组核对 | 0.63 s |
| 3 | 回填（rfm + audit） | 0.04 s |
| 4 | A 组清理 + B 组标记 | 0.10 s |
| 5 | 前向迁移 2 条（08+13）+ 收紧 + 后核对 + RLS 实测 | 1.30 s |
| 6 | stub HTTP 冒烟 | 0.08 s |
| — | **四段合计（分段计时）** | **5.69 s** |
| — | **整套脚本墙钟（含克隆库/基线/负例/stub/DROP）** | **11 s** |

> 演练只应用白名单 2 条；其余 pending 显式 defer 保持 pending（prod 为 17 条 defer）。

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
# 由 window-execution.sh s4 调用；手工等价入口（prod 固定带 --prod 与白名单）：
bash scripts/migration/apply-forward.sh \
  --anchor "$ANCHOR" --prod \
  --ssh-host "$WINDOW_SSH_HOST" --remote-db topems_prod \
  --remote-mig-dir "$WINDOW_REMOTE_DIR/migrations" \
  --only 20261107000008,20261107000013 \
  --defer '<其余 17 条已评审 pending>'
```

- **白名单 fail-closed**：`--only` 之外且未 `--defer` 的 pending 会在任何 DDL 之前 exit 1；
  本地演练已用 `20261108000000` 负例验证（exit 1、探针表不存在、账本无新增）；
- 本轮账本**只新增 2 条**：`08`（字典 2 张）+ `13`（7 张收紧）；其余 17 条保持 pending；

- 本批窗口内必须且只收紧 **9 张表**：字典 2 张（迁移 08）+ 已回填 7 张（迁移 13）；
- 迁移 13 删除 7 表全部历史策略，只建一条 `rls_tenant_isolation`：
  `app.rls_system='on' OR tenant_id = app.tenant_id`；`ENABLE + FORCE RLS`；
- 不含 NULL/空串/全零 UUID 放行分支；末尾断言每表恰好 1 条策略。

> 版本号注意：仓库并行批次已占用 `20261107000012`，本批 7 表收紧迁移固定为
> `20261107000013`。演练首次使用 12 触发主键冲突，已修正（见第 10 节问题 1）。

### 8.2 收紧后核对

```bash
# SSH 模式：owner 会话执行后核对；RLS 可见性用 SET ROLE topems_app（非 super/bypassrls）
ssh "$WINDOW_SSH_HOST" "PGHOST=/tmp psql -d topems_prod -X -v ON_ERROR_STOP=1 \
  -f $WINDOW_REMOTE_DIR/sql/window_postcheck.sql"
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
| 窗口日期/时间 | 2026-11-06 17:05:26 – 17:18:31（Asia/Shanghai） |
| 操作人 / 复核人 | Trae（用户授权执行）/ 待复核 |
| 工单/审批号 | `window-2026-11-06-dict-rls` |
| prod 主机 / 库 | `xingzhai@192.168.110.115` / `topems_prod`（SSH 执行物模式） |
| anchor（窗口前） | `20261105235700` |
| pending 迁移清单 | 19 条；应用 2 条（08、13），其余 **17 条 defer 保持 pending** |
| 备份时间戳（9 表） | `20261106_170526` |
| 备份 SHA256 登记 | 9/9 已登记（明细见 9.1.2） |
| 恢复验证结果（9/9） | **9/9 行数 + 整行指纹一致**（scratch `topems_prod_verify_20261106`） |
| 字典回灌 pre→post | `7/24 → 77/397` |
| legacy 4 类分项 | `department_type 4 / education 4 / marital_status 4 / position_level 5 = 17` |
| 回填 audit pre→upd | `17 → 17` |
| 回填 rfm pre→upd | `300 → 300` |
| A 组 refs pre→del | `121 → 121`（表内总数 `158 → 37`） |
| A 组 returns pre→del | `19 → 19` |
| A 组 risks pre→del | `20 → 20` |
| A 组 monitors pre→del | `38 → 38` |
| B 组 audit pre→marked | `64 → 64`（`marked_total=64`） |
| customers 总数（前/后） | `302 / 302` |
| audit 总数（前/后） | `362 / 362`（部署前后均未变） |
| audit …0099（前/后） | `271 / 271` |
| 迁移结果 | 08、13 成功；账本 `576 → 578`；checksum `ce4327e2…`、`12f73d5b…` |
| 策略数 9/9 = 1 | 通过（`policy_ok` 9 张全部打印） |
| FORCE RLS 9/9 | 通过（9 张 `relrowsecurity=t / relforcerowsecurity=t`） |
| 冒烟结果 | 4/4 PASS（超管 77、普通租户 0、通知 200、补测 0001=77） |
| 是否触发回滚 / 路径 | 未触发；首次 s4 因脚本 fail-open 零 DDL，修正后重跑成功 |
| 窗口结束时间 | 2026-11-06 17:18:31（冒烟完成），17:19 收尾 |

---

### 9.1 本次执行证据（2026-11-06）

#### 9.1.1 发布基线

| 项 | 值 |
| --- | --- |
| 发布 commit | `bb886972bae0a85fb795e8e989b52381d46c9800`（main，工作区干净） |
| 前序基线 | `c240b32fa`；batch25/26 经 `6816f37d3`、`6bf524b2f` 已包含 |
| 服务二进制 | `aa9b73f7d748ba832610ce580ac08d87e92e8e9a3e1f5e3ad655e6255eb11b0b`（在 `bb886972b` 重建，哈希不变＝仅脚本改动） |
| seed 二进制 | `61b7f9013137dbcaad8940cb3a56eaee23ac693cd0502ae6568c413838f2bf18` |
| 执行物投递 | 9 件投递到 `/tmp/topems_window_20261106`，逐件 sha256 与本地一致 |

#### 9.1.2 备份与恢复（ts `20261106_170526`）

- 主机本地 `pg_dump -Fc --enable-row-security` + CSV，取回 `/Users/air/topems/backups/`，远端/本地 sha256 一致后落 `.dump.sha256`。

| 表 | 行数 | dump sha256（前 16） |
| --- | --- | --- |
| `core_dict_types` | 7 | `973c32c77677b469` |
| `core_dict_items` | 24 | `608d0d5adf8ff3f9` |
| `crm_master_data_refs` | 158 | `bb5dff9949b6bd9d` |
| `returns` | 19 | `9118210d03d92581` |
| `customers` | 302 | `8c81bd43325c383a` |
| `rfm_results` | 300 | `8ba0c20a5c37612b` |
| `qa_ehs_risks` | 20 | `150d044f7d0279da` |
| `qa_ehs_environment_monitors` | 38 | `41872fc1dbe905ae` |
| `audit_logs` | 362 | `24fa5390f7d53152` |

恢复验证：scratch `topems_prod_verify_20261106` 逐表比对，**9/9 行数 + 指纹一致**。

#### 9.1.3 账本前/后

| 项 | 前 | 后 |
| --- | --- | --- |
| `max(version)` | `20261105235700` | `20261107000013` |
| 账本总行数 | 576 | 578 |
| `> anchor` 行 | 0 | 2（`08`、`13`） |

仍 pending 的 17 条（全部 defer，未应用）：

`20261105235800`、`20261106000000`（`tz_unify`，**未应用**）、`20261106000001`、
`20261107000001`、`20261107000002`、`20261107000003`、`20261107000004`、`20261107000005`、
`20261107000006`、`20261107000007`、`20261107000009`、`20261107000010`、`20261107000011`、
`20261107000012`、`20261107000014`、`20261107000015`、`20261107000016`。

#### 9.1.4 字典与 RLS

- 字典 `77` 类 / `397` 项；标准类 `73/380`；legacy `4/17`；G1–G6 全 OK。
- 回填 `audit 17/17`、`rfm 300/300`；回填后 `audit` 租户分布：`NULL 28 / …0000 317 / …0001 17`。
- A 组 `refs 121`、`returns 19`、`risks 20`、`monitors 38`；非目标 `customers 302`、`audit 362`、合成租户 `271` 前后不变。
- B 组 `target=64 / updated=64 / marked_total=64`。
- 9 张表：`relrowsecurity=t`、`relforcerowsecurity=t`、`count(policy)=1`。
- `SET ROLE topems_prod` 实测：`dict_0001=77`、`dict_1111=0`、`audit_1111=0`、`refs_1111=0`。

#### 9.1.5 部署与健康

| 项 | 值 |
| --- | --- |
| 旧二进制 sha256 | `c73c0dae4706f8273b604904b1a193b3e48737b151afa5240768d67c864530f3` |
| 旧二进制留档 | `~/topems/bin/topems-server.sha256`、`~/topems/bin/topems-server.bak-20261106` |
| 新二进制 sha256 | `aa9b73f7…11b0b`（远端与本地一致） |
| 重启方式 | `launchctl kickstart -k gui/501/com.topems.server`，新 pid `59426`，`last exit code = 0` |
| `/health` | 200 `{"data":"healthy"}` |
| `/api/server/health` | 200 `{"status":"ok","modules":31}` |
| `/api/server/ready` | 200 `{"status":"ready","degraded_modules":[]}`（旧二进制为 404，部署后出现） |
| `/ready` | 200 `text/html`（SPA） |

#### 9.1.6 冒烟（4 项）

| 检查 | 结果 |
| --- | --- |
| 超管字典列表 | HTTP 200，`total=77`，legacy 4 类均在 |
| 普通租户可见性 | HTTP 200，`total=0`，无系统字典泄露（tenant `1111…`） |
| 通知创建 | HTTP 200，`id=0582bd96-076a-437f-8244-52254c343dd8`，落库 `public.core_notifications` 1 行 |
| 补测：tenant `…0001` | HTTP 200，`total=77`（自有字典可见） |

> 说明：prod 只有默认租户 `…0001`，无第二个真实租户，故隔离冒烟用非 `0001` 的探针租户
> `11111111-…`（`sub` 为真实员工 `wangy`），并补测 `0001` 自身可见性。

#### 9.1.7 分段耗时（最终成功路径）

| 段 | ms |
| --- | --- |
| artifacts（发布基线 + 投递） | 6079 |
| preflight | 497 |
| backup | 13300 |
| verify-backup | 2366 |
| s1 字典（回灌 + 清理 + 核对） | 3247 |
| s2 回填 | 372 |
| s3 清理 / 标记 | 432 |
| s4 迁移 + 收紧 + 后核对 + RLS | 6567 |
| 冒烟（4 项，含补测） | 约 900 |

墙钟：`17:05:26` 开窗 → `17:18:31` 冒烟完成，约 **13 分钟**（含首次 s4 失败诊断与修正）。

#### 9.1.8 audit_logs 来源判断

`362 → 362`（未新增）；`…0001 17` 来自回填；`…0000 317` 中含 B 组标记 64 行；
`NULL 28` 与合成租户 `271` 未动。本次窗口未产生新的审计行，冒烟通知亦未写 audit。

#### 9.1.9 首次 s4 失败与修正（已留档）

- 现象：`apply-forward` 报“无待应用迁移”，账本零新增；`postcheck` 因 `audit_logs` 仍有 2 条历史策略而失败。
- 根因：SSH 模式下 `while read` 循环内的远端 `psql` 吞掉进程替换 stdin，扫描第 1 条即结束（fail-open）。
- 证据：`release_attempt1_skipped.txt`、`postcheck_attempt1_failed.txt`；本地实测 611 个文件只迭代 1 次。
- 修正：账本查询加 `</dev/null`；新增 fail-closed 断言（`--only` 版本必须被扫描到），提交 `bb886972b`；
  在 prod 主机临时库 `topems_window_ssh_drill` 走真实 SSH 路径验证后重跑 s4，成功（库已 DROP）。

### 9.2 prod `JWT_SECRET` 轮换（2026-11-06 17:32–17:35）

**原因**：一次排查命令的终端输出带出了远端进程环境变量，按“已暴露”处置。

#### 9.2.1 依赖清单（只读排查，值一律未打印）

| 位置 | 用途 | 是否存在 prod 密钥 | 轮换后是否需处理 |
| --- | --- | --- | --- |
| prod `~/topems/.env` | 单体进程运行配置 | 是（活跃） | **已更新**（`fba6af…`，len 64） |
| prod `~/Library/LaunchAgents/com.topems.server.plist` | launchd 环境 | 是（活跃） | **已更新**，与 `.env` 前缀一致 |
| prod `~/topems/.env.bak-20261030-151348` | 旧配置副本 | 是（旧值） | 已移入 `.secrets/retired-20261106/`（600） |
| prod `com.topems.server.plist.bak-be08 / .bak-ehs-20261031 / .prev` | 旧 plist 副本 | 是（旧值） | 同上移入受限目录 |
| 其它 launchd 服务（nginx、logrotate、be08-*） | — | 否 | 无需处理 |
| 仓库 `.env.production` / `.env.local` / `docker/.env` / `config/standalone.env` | 本地/容器开发 | 否（前缀均非 prod） | 无需处理（且均未被 git 跟踪） |
| `config/env/*.template`、`config/production.yaml.example`、`.env.example` | 模板占位 | 否（`<SET_YOUR_OWN…>`） | 无需处理 |
| CI（`.github/workflows/*`）、e2e | 固定测试密钥，非 prod | 否 | 无需处理 |
| `apps/web` 构建 | 不引用 `JWT_SECRET` | 否 | 无需重新构建 |
| `scripts/mobile_contract_smoke.py`、`web_contract_smoke.py` | 由调用方显式传 token | 否 | 冒烟时用新 token 即可 |
| `scripts/lib/service.sh`、`scripts/deploy/*` | 生成/读取 `.env` | 否（不内嵌 prod 值） | 无需处理 |
| `JWT_REFRESH_SECRET`（prod 亦存在） | refresh token 签名 | **独立密钥，本次未轮换** | 见 9.2.4 影响面 |

#### 9.2.2 变更与留档

- 新密钥：`openssl rand -hex 32` 在主机内生成，**未打印**、未入仓库/文档；
- 旧值留档：`~/topems/.secrets/jwt-secret-pre-rotate-20261106.txt`（目录 700、文件 600）；
- 旧副本归档：`~/topems/.secrets/retired-20261106/`（3 个文件，600）；
- 一致性核对：`env_prefix=fba6af env_len=64 plist_prefix=fba6af plist_len=64 consistency=SAME`，`plutil -lint=ok`。

#### 9.2.3 重启与验证

| 步骤 | 结果 |
| --- | --- |
| 重启前 pid | `59426` |
| `launchctl kickstart -k` | pid `64853`，但**旧 token 仍 200**（launchd 沿用已加载的旧环境） |
| `launchctl bootout` + `bootstrap` | pid `65124`，`state=running`，新环境生效 |
| 旧 token（旧密钥签发） | **401** |
| 新超管 token | 200，`total=77` |
| 新租户 token（`1111…`） | 200，`total=0`（无泄露） |
| 新租户 token（`…0001`） | 200，`total=77` |
| 登录接口 `/api/core/iam/auth/login` | 错误凭据返回 **401**（服务与 DB 正常） |
| 通知创建 | 200，`id=eee73aad-686b-4cd3-b8a8-8d1c806e344f`，落 `public.core_notifications` |
| `/health` / `/api/server/ready` | 200 / 200 |

#### 9.2.4 影响面与回滚

- **旧 access token 全部失效**：已登录 web/mobile 用户在下次请求会收到 401，**需重新登录**；
- **refresh token 仍有效**：本次未轮换 `JWT_REFRESH_SECRET`，旧 refresh token 仍可换发新 access token，
  直到 refresh 过期；**（已于 9.3 处理：核实 refresh 为 DB 存储不透明串、密钥不参与验签，故轮换密钥 + 吊销全部活跃行）**；
- 无其它在线服务依赖该密钥（CI/e2e/前端构建均不使用 prod 值）；
- 回滚：从 `~/topems/.secrets/jwt-secret-pre-rotate-20261106.txt` 恢复旧值到 `.env` 与 plist，
  再 `launchctl bootout` + `bootstrap`（不可仅 `kickstart -k`）。

### 9.3 prod `JWT_REFRESH_SECRET` 轮换 + 吊销全部 refresh token（2026-11-06 17:57–18:03）

**原因**：补齐 9.2 遗留项（refresh token 仍可换发 access token）。按用户确认的方案 B 执行：
轮换密钥 + 同步三处引用 + 吊销全部活跃 refresh token（保留行，不 DELETE）。

**关键事实（先证实、后执行）**：refresh token 是 **DB 存储的不透明串**（`generate_refresh_token()`
返回 32 字节随机 hex，非 JWT），校验走 `hash_token()`（纯 SHA-256）+ `public.core_refresh_tokens`，
不经过 `JWT_REFRESH_SECRET`；该字段仅用于启动校验（全仓无其它读取点）。
**因此单独轮换密钥不会让已签发 refresh 失效**，旧 refresh 失效必须依赖吊销 DML。

#### 9.3.1 依赖清单（只读排查，值一律打码）

prod 值（轮换前 `00bb**`，len 64）的**全部落点**（精确值反向搜索，不打印明文）：

| 位置 | 用途 | 轮换后处理 |
| --- | --- | --- |
| prod `~/TOPEMS/.env`（600） | 单体进程运行配置 | **已更新**（`3829**`，len 64） |
| `~/Library/LaunchAgents/com.topems.server.plist`（644） | launchd 环境 | **已更新**，与 `.env` 同前缀同长度 |
| `~/TOPEMS/secret/jwt_refresh.txt`（600，`.git/info/exclude` 未入 git） | 装机时密钥落盘 | **已更新**（本轮新增确认的第三处活跃副本） |
| `.secrets/retired-20261106/*.prev / *.bak-be08 / *.bak-ehs-20261031`（600） | 上一轮归档 plist | 保留（内含已失效旧值）；目录权限由 `755` 收紧为 **700** |
| 非 prod 值：`config/standalone.env`（`5871**`）、`deploy/docker/.env` 与 `.bak-20261015`（`56f8**`） | 开发/容器 | 无需处理（与 prod 值不同；主机未装 docker） |
| `config/env/*.template`、`.env.example`、`.env.production.example` | 模板 | `<SET_ME…>` 占位，无真值 |
| CI（`.github/workflows`）、`scripts/topems-docker.sh`、`topems.ps1`、`ports.ps1` | 生成/开发默认值 | 不含 prod 值 |
| `crontab`（`collect-usage-daily.sh`，每日 01:00） | 采集任务 | 走 **login 拿 access token**，不依赖 refresh，不受影响 |
| `~/Library/Application Support/{DoubaoWork,Trae CN}` 会话日志 | 历史终端输出残留（旧值） | 旧值已作废，不作为配置引用 |

#### 9.3.2 变更与留档

| 项 | 值/结果 |
| --- | --- |
| 新密钥 | `openssl rand -hex 32` 主机内生成，前缀 `3829**`，len 64，未打印/未入库 |
| 旧值留档 | `~/TOPEMS/.secrets/jwt-refresh-secret-pre-rotate-20261106.txt`（600，65 字节） |
| 变更前镜像 | `~/TOPEMS/.secrets/jwt-refresh-20261106/`（700；`.env.pre` / plist / txt 均 600） |
| 三处一致性 | `env=3829** len=64` / `txt=3829** len=64` / `plist=3829** len=64` → `consistency=SAME` |
| plist 语法 | `plutil -lint … : OK` |
| 目录权限 | `.secrets` 700、`retired-20261106` 700、`jwt-refresh-20261106` 700 |

#### 9.3.3 吊销（保留行，不 DELETE）

`UPDATE public.core_refresh_tokens SET revoked_at=now(), revoked_reason='rotate-20261106' WHERE revoked_at IS NULL;`

| 分布 | 吊销前 | 吊销后 |
| --- | --- | --- |
| total | 1374 | 1374 |
| active（未吊销） | **1369** | **0** |
| revoked | 5 | 1374（其中 `rotate-20261106` = 1369） |
| expired | 0 | 0 |
| 持有账号 | `admin`（`56f4256f…`）1369 条 | — |
| 精确影响行数 | — | **`UPDATE 1369`**（与预期一致） |

UA 分布（全部自动化）：Playwright/1.62 CI 618、HeadlessChrome 151 525、HeadlessChrome 156 176、
`curl/8.7.1` 39、`node` 5、空 5。

#### 9.3.4 重启

| 步骤 | 结果 |
| --- | --- |
| 重启前 pid | `65124` |
| `launchctl bootout gui/501/com.topems.server` | `unloaded` |
| `launchctl bootstrap gui/501 <plist>` | pid **`74405`**，`state = running`，`runs = 1`，`last exit code = (never exited)` |
| 启动时间 | `18:01:14`（启动校验通过，说明新密钥长度/非默认值合法） |

> `last exit code = (never exited)` 表示该 job 本轮从未异常退出（launchd 对新 bootstrap 进程的正常表述），
> 等价于“无失败退出”；未使用 `kickstart -k`（其不重读 plist）。

#### 9.3.5 验证（全部通过）

| 检查 | 结果 |
| --- | --- |
| 旧 refresh（插入临时行 → 以同一条吊销语义置 `revoked` → 调刷新） | **401**（`Refresh token 无效或已过期`） |
| 临时行基线（吊销前 DB 状态） | `active = t`（确实为可用态） |
| 轮换后刷新链路（临时行 `tmp-rotate-verify`） | **200** |
| 临时行清理 | `DELETE 3`（旧行 + 已轮换行 + 刷新新行），`tmp_residue = 0` |
| 清理后计数 | `total=1374 active=0 revoked_by_reason=1369`（回到吊销后值） |
| 旧 access token（上一轮 `JWT_SECRET` 签发） | **401** |
| 新超管 access | 200，`total=77` |
| 探针租户 `1111…` | 200，`total=0`（无泄露） |
| 租户 `…0001` | 200，`total=77` |
| 通知创建 | 200，`id=43cd3f44-f6f3-4cb7-9572-a2e8903a1c80`，落 `public.core_notifications` 1 行 |
| `/health` / `/api/server/ready` / `/api/server/health` | 200 / 200 / 200 |

#### 9.3.6 影响面

- **人类用户 0**：吊销前 1369 条活跃 refresh 全部属于 `admin` 的自动化会话（Playwright/HeadlessChrome/curl），
  无真实用户持有活跃 refresh；
- **自动化客户端需重新登录**（E2E/巡检脚本下次运行会重新 login，链路本身不受影响）；
- `collect-usage-daily.sh`（cron 01:00）用 `USAGE_USER/USAGE_PASS` 登录换 access token，**不受 refresh 吊销影响**；
- 后台任务/机器人**无**依赖长驻 refresh token 的调用（仓库与主机脚本均未发现 `/auth/refresh` 消费方）；
- 旧 access token 仍 401（其失效来自 9.2 的 `JWT_SECRET` 轮换，与本次 refresh 轮换无关）。

#### 9.3.7 回滚

顺序（两步都做才算恢复会话）：

1. **恢复密钥**：从 `.secrets/jwt-refresh-secret-pre-rotate-20261106.txt` 取旧值，回写三处
   （`.env` / plist / `secret/jwt_refresh.txt`），`plutil -lint` 后 `launchctl bootout` + `bootstrap`；
2. **恢复吊销**：
   ```sql
   UPDATE public.core_refresh_tokens
      SET revoked_at = NULL, revoked_reason = NULL
    WHERE revoked_reason = 'rotate-20261106';
   ```
   影响 1369 行，`active` 回到 1369。

**回滚后旧 refresh 是否重新可用**：只做第 1 步 → **仍不可用**（失效来自 DB 吊销，与密钥无关，且旧 token
有效期最长至 2026-11-13）；必须同时做第 2 步，旧 refresh 才恢复可用（前提是未过期）。
因密钥本身不参与 refresh 校验，回滚密钥对 refresh 可用性没有影响。

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
| 10 | `apply-forward` 只应用 `version > anchor`，账本缺失但版本小于 anchor 的迁移不会补 | 误以为 08 会在窗口内应用 | 窗口 anchor 必须取真实 `max(version)`；本批演练 anchor=06，发布段**只应用白名单 08+13** |
| 11 | 旧入口会把 anchor 之后全部 pending 推到 prod（含 `tz_unify`） | 窗口污染 | `--only` 严格白名单 + `--defer` 显式声明；清单外 pending 在任何 DDL 前 exit 1；负例已验证 |
| 12 | prod 主机仓库停在 `0c11b5b90`，直接借主机代码会跑旧逻辑 | 执行物与发布基线不一致 | 从干净 HEAD 构建 `seed_dict_replay`，与 SQL/迁移一起投递并逐件 sha256 校验；不使用主机仓库代码 |
| 13 | 本地提交基于落后 4 个提交的 origin/main，pre-push `stale-base` 拦截 | 无法推送，且远端已重编号迁移 14–16 | `git pull --rebase origin main` 后重跑演练与门禁；defer 清单补 `14/15/16`，白名单仍为 `08+13` |
| 14 | **prod 窗口实测**：SSH 模式下 `while read` 循环内的远端 `psql` 吞掉进程替换 stdin，pending 扫描第 1 条即结束 | `--only` 白名单未被扫描到 → 报“无待应用迁移”，迁移被静默跳过（fail-open，零 DDL） | 账本查询加 `</dev/null`；新增 fail-closed 断言（`--only` 每个版本必须被扫描到，否则 exit 1）；提交 `bb886972b`；本地演练不覆盖 SSH stdin 行为，需真实主机路径验证 |
| 15 | **密钥轮换实测**：`launchctl kickstart -k` 只重启进程，不重读 plist | 新 `JWT_SECRET` 未生效，旧 token 仍 200 | 改为 `launchctl bootout gui/$UID/<job>` + `bootstrap gui/$UID <plist>`；回滚同样必须走 bootout/bootstrap |

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

- 演练目录：`tmp/window-rehearsal-20261106_163232/`
  - `summary.txt`（分段耗时、总耗时、墙钟、9 表指纹）
  - `whitelist_block.txt` / `whitelist_result.txt`（清单外迁移 exit 1、零 DDL）
  - `sim/remote/`（SSH 模拟投递目录，含 SQL/迁移/seed）
  - `window/artifacts.tsv`（逐件 sha256）、`window/preflight.txt`、`window/backfill.txt`、
    `window/cleanup_a.txt`、`window/cleanup_b.txt`、`window/release.txt`、
    `window/postcheck.txt`、`window/rls_visibility.txt`、`window/dict_verify.txt`
- 备份：`/Users/air/topems/backups/*_20261106_163239.{dump,csv,dump.sha256}`（9 张表全部指纹一致）
- 演练库已 DROP；`select datname ... like 'topems_window%'` 返回 0 行；主开发库 `topems` 未改动。
- **prod 仅做过只读盘点（账本/角色/计数）；未产生任何 DML/DDL/重启/部署。**

---

## 14. 追加短窗口：`20261107000017` / `20261107000018`（2026-11-06 19:16）

- 授权范围：**仅**这两条迁移；prod 其余操作只读，未重启、未部署。
- 锚点 `20261107000013`（执行前账本最大版本），白名单 `--only 20261107000017,20261107000018`，
  显式 `--defer 20261107000014,20261107000015,20261107000016`；SSH 执行物模式，
  两个迁移文件先投递到 `/tmp/topems_window_20261107/migrations/` 并逐件 sha256 一致
  （`4d56cfd8…4907`、`7b40b872…15bb`）。

### 14.1 执行前现场重测（2026-11-06 19:15，prod 只读）

| 指标 | 实测 |
|---|---|
| 账本行数 / max(success) / failed | **579** / `20261107000013` / 0 |
| `mes.production_orders` 行数 / 小数行 | **22** / **0** |
| `quantity` / `completed_quantity` 类型 | `bigint` / `bigint`（prod 已是目标态） |
| 行合计 `quantity/completed_quantity` | **1224 / 0** |
| 全表指纹（`md5(string_agg(t::text … ORDER BY id))`） | **`28e3f2359729ccb6b68335852ea7f7a9`** |
| `mes.batch_records` 行数 / `ck_batch_records_status_standard` 存在数 | **0** / **0**（本就不存在） |

### 14.2 fail-closed 负例（正式执行前，零 DDL）

不带 `--defer` 运行时：

```
== 拒绝：检测到 3 条清单外 pending 迁移（未产生任何 DDL）
  20261107000014_tenant_modules_tier_public_only.sql
  20261107000015_auth_rls_system_context_branch.sql
  20261107000016_drop_iam_refresh_token_privileged_functions.sql
  本轮 --only: 20261107000017,20261107000018
  已评审 defer: <未设置>
清单外迁移必须先评审并显式加入 --only 或 --defer；不允许提示后继续。
```

exit 1；执行后复核账本仍 579、约束仍 0 → 确认负例未产生任何 DDL。

### 14.3 正式执行

```
== 待应用 2 条（anchor=20261107000013，only=20261107000017,20261107000018）
== 显式 defer 3 条（保持 pending）：
  20261107000014_tenant_modules_tier_public_only.sql
  20261107000015_auth_rls_system_context_branch.sql
  20261107000016_drop_iam_refresh_token_privileged_functions.sql
-- 20261107000017_mes_production_orders_quantity_bigint.sql
-- 20261107000018_mes_drop_ck_batch_records_status_standard.sql
== OK：应用 2 条，失败 0
real 2.80
```

窗口墙钟：**19:16:08 → 19:16:16（约 8 s）**，脚本 `real 2.80s`。
17 为幂等空转（`quantity/completed_quantity` 已是 `bigint`，跳过转换），18 输出
`NOTICE: P10：ck_batch_records_status_standard 不存在（已清理）`。

### 14.4 执行后核对

| 项 | 结果 |
|---|---|
| 账本 | **579 → 581**，diff 仅 `+20261107000017|true`、`+20261107000018|true`，failed 0 |
| 账本 checksum | `\x8563d251…305c` / `\x66001ff3…9d41`，与本地 `shasum -a 384` 两文件完全一致 |
| 列类型 | `quantity` / `completed_quantity` 实测均为 **`bigint`** |
| 数据指纹 | 22 行逐行 `id|md5(row)` **diff 为空**；全表指纹仍 **`28e3f2359729ccb6b68335852ea7f7a9`**；合计仍 **1224 / 0**，无取整 |
| 约束 | `ck_batch_records_status_standard` 计数 **0** |
| `batch_records` 其它约束/索引 | 5 个约束 + 3 个索引（`batch_records_pkey`、`batch_records_batch_no_key`、`idx_batch_records_batch_no`）与执行前逐行一致 |
| 14 条 20261107 待定版本 | `IN (…01–07,09–12,14–16)` 账本计数 **0**（仍未记账，符合 defer） |
| 冒烟四项 | super dict 200（77 项，legacy 4 项齐全）/ probe dict 200（0 项，租户隔离生效）/ notify 200 / tenant0001 dict 200 |
| 健康检查 | `/health` 200 healthy；`/api/server/ready` 200 ready（degraded 空）；`/api/server/health` 200 ok（31 模块） |
| 服务 | **未重启**：pid **74405**，启动时间 `2026-11-06 18:01:14`（窗口前），跑在本窗口前后同一进程 |

### 14.5 证据与结论

- 证据目录：`/tmp/topems_window_20261107/`
  - `ledger_before.txt` / `ledger_after.txt`（579 → 581）
  - `po_rows_before.txt` / `po_rows_after.txt`（22 行逐行指纹，diff 空）
  - `batch_after.txt`、`failclosed_neg.log`、`apply.log`、`smoke_after.log`
- 结论：两条迁移在 prod 为**空转 + 2 行账本**，结构与数据零变化；未触碰 14/15/16 及任何其它迁移；
  未重启、未部署，prod 保持可用。

---

## 15. 短窗口批次 1：`000003` / `000004` / `000014` / `000016`（2026-11-06 20:06）

- 授权范围：**仅**上述 4 条；prod 不重启、不部署、不改其它迁移字节。
- 锚点：**`20261107000002`**（方案 A）。原因见 15.0：这 4 条版本号 **≤ 账本 max `20261107000018`**
  且账本未登记，`apply-forward.sh` 只扫 `version > anchor`，用 max 作锚点会把这 4 条直接过滤掉。
- 白名单：`--only 20261107000003,20261107000004,20261107000014,20261107000016`；
  `--defer 000005,000006,000007,000008,000009,000010,000011,000012,000013,000015,000017,000018`
  （其中 08/13/17/18 账本已有记录，脚本按「已应用」跳过；实际保持 pending 的是 8 条）。
- SSH 执行物模式：4 个文件先投递到 `/tmp/topems_window_20261107/migrations/`，本地/远端 sha256 逐件一致。

### 15.0 锚点冲突与选路（首次按 max 锚点的负例）

按 `--anchor 20261107000018` 先跑，脚本在任何 DDL 之前拒绝：

```
== 拒绝：白名单版本 20261107000004 未被扫描到（既不在待应用队列，也不在账本）；疑似扫描截断，未产生任何 DDL
EXIT=1
```

复核：账本仍 581 / max `20261107000018` / failed 0，7 张副本全部仍在 → 负例零 DDL。
改用 `--anchor 20261107000002`（紧邻批次之前的 superseded 版本）后，扫描范围覆盖
`000003–000018`，白名单与 defer 均被逐一分类，fail-closed 仍生效。

### 15.1 执行前现场重测（20:06:18，只读）

| 指标 | 实测 |
|---|---|
| 账本行数 / max(success) / failed | **581** / `20261107000018` / **0** |
| 4 条目标版本在账本 | **0 行**（均未登记） |
| 7 张影子副本存在性 / 行数 | 全部存在，全部 **0 行** |
| `communication.core_email_templates` | 存在，0 行，RLS=true/force=true，含 `tenant_id` |
| `master_data.core_dict_*` | 存在，0 行，RLS=true/force=true，含 `tenant_id` |
| `communication.core_notifications / core_emails / core_notification_templates / core_geofences` | 存在，0 行，RLS=false，无 `tenant_id` |
| `public.core_email_templates` | **不存在**（守卫会跳过 communication 副本） |
| 权威表行数 | `core_notifications` **6**、`core_emails` 0、`core_notification_templates` 0、`core_geofences` 0、字典 **77 / 397** |
| `public.core_tenant_modules.tier` | `character varying`、`null=YES`、默认 `'basic'`；表 0 行 |
| `iam_refresh_token_lookup/revoke` | **0 个** |
| 权限码 | **986**，指纹 **`af46d75dadf351c752989fee40f2e719`** |
| 结构指纹（排除 7 张目标副本） | **`f2731dde8c93b1fe12fc0da478b70cd0`**；表数 **1351** |
| 依赖 | 7 张副本无外键、无视图/物化视图引用 |
| 二进制 | pid 74405，`topems-server` 17:17 构建，sha256 `aa9b73f7…`；`strings` 命中的表名均为带 `public.` 的 SQL，**无 TABLE_DEFS 独立建表字面量**；prod 仓库 `0c11b5b90` 的 `TABLE_DEFS` 已移除这些表 |

### 15.2 投递校验（sha256）

| 文件 | sha256 |
|---|---|
| `20261107000003_drop_communication_notification_shadow_tables.sql` | `70c75d11fd54b2940328576bd78804a4ac619e26c74a7aa82f605f0b5912b314` |
| `20261107000004_drop_high_risk_shadow_tables.sql` | `701e3e12944181259d2d0fa95072bcb48657c9247bb472d09f5a41629c90b223` |
| `20261107000014_tenant_modules_tier_public_only.sql` | `5637810cb347e10cf09c3024cd13d178d50e95154e259d94fb084c96cb0cb001` |
| `20261107000016_drop_iam_refresh_token_privileged_functions.sql` | `07100464e98c15b828a5949845ced11b572c0dc32d6d2f24c5de678f3c759c9d` |

### 15.3 正式执行（20:06:57 → 20:07:03，脚本墙钟 6.175s）

```
== 待应用 4 条（anchor=20261107000002，only=000003,000004,000014,000016）
== 显式 defer 8 条（保持 pending）：
  000005 / 000006 / 000007 / 000009 / 000010 / 000011 / 000012 / 000015
-- 20261107000003_drop_communication_notification_shadow_tables.sql
-- 20261107000004_drop_high_risk_shadow_tables.sql
-- 20261107000014_tenant_modules_tier_public_only.sql
-- 20261107000016_drop_iam_refresh_token_privileged_functions.sql
== OK：应用 4 条，失败 0
real 6.175s
```

### 15.4 执行后核对

| 项 | 结果 |
|---|---|
| 账本 | **581 → 585**，仅新增 4 条，均 `success=t`；failed 0；max 仍 `20261107000018` |
| 账本 checksum | `000003`=`21e90a5f…471c`、`000004`=`f47b90df…44b8`、`000014`=`4e29e202…2359`、`000016`=`5df8bdc6…3668`，与本地 `shasum -a 384` **逐条一致** |
| 6 张副本 | `communication.core_notifications`、`communication.core_emails`、`master_data.core_dict_items`、`master_data.core_dict_types`、`communication.core_notification_templates`、`communication.core_geofences` 的 `to_regclass` **全部为空** |
| `communication.core_email_templates` | **保留**（`to_regclass` 非空），行数 0 |
| 保留原因（显式） | `public.core_email_templates` 在 prod **不存在**，`000003` 的权威表守卫因此跳过该副本；`svc/communication/src/mail.rs`（870/992/1098/1200/1309/1401/2161）仍以**裸名** `core_email_templates` 访问，`search_path` 解析到 communication 副本。**标注为「已知功能缺口，待单独修复」，本轮未处理**（不是漏删） |
| `000014` | **空转**：`tier` 仍为 `character varying`、`null=YES`、默认 `'basic'`。迁移的 `ADD COLUMN IF NOT EXISTS` 不会把既有可空列改为 NOT NULL → **`NOT NULL` 未达成，需补迁移**（不在本窗口） |
| `000016` | **空转**：`iam_refresh_token_lookup/revoke` 执行前后均 **0 个**，DROP 无对象 |
| 字典 | `77 / 397` 不变；`public.core_dict_types/items` 正常可读 |
| 通知 | `public.core_notifications` **6 → 6**（冒烟创建 1 行后按 id+title 删除该行；库内另有 1 行上窗口遗留的同名冒烟行，未触碰） |
| 权限码 | **986**，指纹 **`af46d75dadf351c752989fee40f2e719`** 不变 |
| 其它结构 | 排除 7 张目标副本后的结构指纹 **`f2731dde8c93b1fe12fc0da478b70cd0`** 不变；表数 **1351 → 1345**（恰好 −6，无连带对象） |
| 剩余 pending | 8 条：`000005/000006/000007/000009/000010/000011/000012/000015`（均未记账，符合 defer） |

### 15.5 冒烟与健康（服务不重启）

| 项 | 结果 |
|---|---|
| 超管字典 | HTTP **200**，`total=77` |
| 普通租户 `…0001`（非超管）字典 | HTTP **200**，`total=77` |
| probe 租户 `1111…1111`（非超管）字典 | HTTP **200**，`total=0`（租户隔离生效） |
| 通知创建 | HTTP **200**，返回 id `e21d1cc0…bd902`；已按 id+title 清理，行数恢复 6 |
| `/health` | **200** `{"data":"healthy"}` |
| `/api/server/ready` | **200** `{"status":"ready","degraded_modules":[]}` |
| `/api/server/health` | **200** `{"status":"ok","modules":31}` |
| 服务进程 | pid **74405**，启动时间 **2026-11-06 18:01:14**（窗口前），**未重启** |

### 15.6 结论与遗留

- 本窗口只做 **6 张 0 行影子副本 DROP + 2 条空转对账**，加 **4 行账本**；业务数据与字典/权限零变化，
  服务未重启。
- **遗留 1（已知功能缺口）**：`communication.core_email_templates` 因 `public` 权威表缺失而保留，
  `mail.rs` 裸名依赖；后续要么建 `public.core_email_templates` 并迁数据，要么明确长期保留 communication 副本，
  **不写「已处理」**。
- **遗留 2**：`public.core_tenant_modules.tier` 的可空性未收紧（`000014` 空转），如要求与声明一致需另开
  `ALTER COLUMN tier SET NOT NULL`（0 行，安全），不得改 `000014` 字节。
- 证据：本文件 15.1–15.5 的现场数字、账本 checksum 对照、逐张 `to_regclass`、冒烟/健康输出；
  执行脚本墙钟 6.175s，窗口总墙钟 20:06:18 → 20:07:03。

---

## 16. 短窗口批次 3：权限数据 7 条（`000005/000012/000006/000007/000009/000010/000011`，2026-11-06 20:35）

- 授权范围：**仅权限数据 DML**；prod 不重启、不部署、不改其它迁移字节。
- 锚点：**`20261107000002`**（`version > anchor` 扫描到 000005–000012；当前 max 000018 不能作锚点，同 15.0 的教训）。
- 白名单：`--only 20261107000005,000006,000007,000009,000010,000011,000012`；`--defer 20261107000015`。
  已记账版本（000003/000004/000008/000013/000014/000016/000017/000018）由脚本按「已应用」跳过。
- SSH 执行物模式：7 个文件投递到 `/tmp/topems_window_b3_20261106_203254/migrations/`，
  本地/远端 sha256 **7/7 一致**；执行 `--prod`，整批**应用 7 条、失败 0**。

### 16.0 与指令的一处偏差（必须显式登记）

工单写「权限数据 **7 条**」且要求「账本 **585 → 592**」，但清单里同时点名 `000001`。
现场核查：**`000001` 在 prod 与本地都未记账（pending）**，若一并应用则账本为 **593**（+8），
与硬性验收「592」冲突。本窗口按两个数值口径（7 条 / 592）执行：

- **应用 7 条**：000005、000012、000006、000007、000009、000010、000011（按版本升序）；
- **`000001` 保持 defer**（未做任何 DML）；连同 `000015`、`000002`，窗口后 pending 共 3 条。
- `000001` 内容核查：4 条码中 3 条缺、1 条已存在（`wms:stocktake:read`），如授权需另开窗口，
  预计 +3 码 + 1 行账本。

> 其余所有红线均未触发，详见 16.4。

### 16.1 执行前备份与现场核对

| 项 | 值 |
|---|---|
| 备份文件 | `/tmp/topems_window_b3_20261106_203254/perm_grants.dump`（`pg_dump -Fc`，3 表：`core_permissions` / `core_role_permissions` / `core_roles`） |
| 大小 / sha256 | 64,250 B / `8e496cea3b06048c57e726f924251d232794711d8e91b9cd187620fcffa305a5` |
| 本地留档 | `/Users/air/topems/backups/perm_grants.dump`（+ `.sha256`），同目录 `codes_before.csv` / `grants_before.csv` / `ledger_before.txt` |
| 账本 | 585 条 `success=t`，max `20261107000018`，failed 0 |
| 权限码 | **986** 条；指纹口径 `md5(string_agg(code, ',' ORDER BY code))` = **`f0a8e5e5fc762846a0513e46d08d1f12`** |
| 角色授权 | **653** 行；15 个角色；**prod 无 `superadmin` 角色**（超管靠 JWT `is_superuser` 旁路）；`admin` 仅 2 条授权 |
| 目标授权 | `erp_manager` 尚无 `finance:voucher:read`（`000010` 将新增 1 行） |
| 字典 / 通知 / 审计 / 表 | 77 / 397、6、362、1345 |
| 服务 | pid **74405**，启动 **2026-11-06 18:01:14** |

> 指纹口径说明：既有记录里的 `af46d75…` 未写明计算式，无法复现；本窗口改用上面这条**可复现口径**并以此为准，
> 不对旧指纹做等价判定（总数 986 与旧记录一致）。

### 16.2 前端引用零交集校验（铁律，执行前）

`000012` 删除集合共 **92** 个码。用 4 个维度核验：

| 维度 | 覆盖量 | 与删除集合交集 |
|---|---|---|
| `EntitySchema.permissionResource` 派生码（`read/create/update/delete`） | 209 处声明 / 189 个前缀 / **756** 个派生码 | **0** |
| FE 源码字面量（排除 `apps/web/src/config/permissions.ts` 定义文件） | 92 × 全量 src 扫描 | **0** |
| 路由/菜单 `requiredPermissions` / `permission` 字面量 | **399** 个 | **0** |
| prod DB `core_menus.permissions->>'permission'`（67 行菜单） | 92 码逐个比对 | **0**（另 `core_plugin_permissions` / `tenant_permissions` 均 0 行） |

**结论：要删的码与前端/菜单引用零交集，红线未触发，可执行。**

### 16.3 执行影响（逐条实测）

预期口径（prod 角色集合，无 `superadmin`）：

| 迁移 | INSERT 码 | INSERT 授权 | DELETE 码 | DELETE 授权 |
|---|---|---|---|---|
| `000005` | 135 | 180（admin 135 + erp 39 + hrm 3 + qms 3） | 0 | 0 |
| `000006` | 30 | 54（admin 30 + mes 9 + scm 6 + wms 3 + finance 6） | 0 | 0 |
| `000007` | 27 | 30（admin 27 + finance 3） | 0 | 0 |
| `000009` | 2 | 2（admin 2） | 0 | 0 |
| `000010` | 0 | 1（erp_manager `finance:voucher:read`） | 0 | 0 |
| `000011` | 21 | 29（admin 21 + srm 8） | 0 | 0 |
| `000012` | 0 | 0 | **92**（89 既有 + 3 支本窗口新建的 hrm 写码） | **95**（89 + 6） |
| **合计** | **215** | **296** | **92** | **95** |

执行后净变化（差集口径，hrm 3 码建后即删故不计入净增/净删）：

- 权限码：986 + 215 − 92 = **1109**（实测 **1109**）
- 角色授权：653 + 296 − 95 = **854**（实测 **854**）

**顺序校验**：`000005` 先建 3 条 hrm 写码与 6 条授权，`000012` 再删；若反序，`000012` 只能删 89 条、
且会留下 3 条「无授权、已下线仍可点」的写码。账本版本单调递增可回溯两者先后（见 16.5 checksum 表）。

### 16.4 账本与结构/数据核对

| 项 | 执行前 | 执行后 | 判定 |
|---|---|---|---|
| `_sqlx_migrations` `success=t` | 585 | **592** | +7，符合 |
| failed | 0 | **0** | 符合 |
| max version | 000018 | 000018 | 不变 |
| 7 条 checksum（SHA-384） | — | 与本地 7/7 **逐字节一致** | 见 16.5 |
| 权限码总数 | 986 | **1109** | 符合 |
| 权限码指纹 | `f0a8e5e5…1f12` | **`d51a82b37591d52edf1e09a2ec95e97a`**（1109 码） | 重算记录 |
| 角色授权总行 | 653 | **854** | 符合 |
| `admin` 授权 | 2 | **214**（+212） | 符合 |
| 字典 类型/项 | 77 / 397 | **77 / 397** | 不变 |
| 通知行数 | 6 | **6** | 不变 |
| 审计行数 | 362 | **362** | 不变（本窗口 DML 不经应用层，未产生新审计） |
| 全库表数 | 1345 | **1345** | 不变（本批无 DDL） |
| 服务 pid / 启动时间 | 74405 / 18:01:14 | **74405 / 18:01:14** | **未重启** |

**红线复核**：① 删除集合含前端在用码 —— 否（16.2 四维交集 0）；
② 超管权限变少 —— 否（超管走 `is_superuser` 旁路，冒烟 200；`admin` 授权 2 → 214）；
③ 单条迁移影响行数与预期不符 —— 否（16.3 全部命中预期，合计 215/296/92/95）。
**未触发中止，未做任何回滚。**

### 16.5 7 条账本 checksum（prod = 本地，SHA-384）

| 版本 | checksum |
|---|---|
| `20261107000005` | `719a9ae8a8271537cdf5ffdf9c2e3f694ab34d4642a5ef0a768a9308fbdd8f9f421444af0fbc5e4adf29898d3848efe1` |
| `20261107000006` | `a6e7ef1439a9c7cb022e6a717476e740567e7c127cecd470e441429c05d64cf7f44c759c6d7373e30bcad10c1a77cab7` |
| `20261107000007` | `e0d4fd3073d63d1b2cc9ed2b358abd015f8d66bf7c4646012e227b6ef8d3be83eb320aecc0374fdec6f44ed1689871f9` |
| `20261107000009` | `51377ebe84142d7a5d7255a8a8fed48d502647bb9638710affa8afff6187b55df8cece3c755a86f7cea74f3f2e9099eb` |
| `20261107000010` | `339dd0f1ead55a31ccaa182d04e2a33e42de4132c9b504a9b6ad109783569798d6333348debbf6cf25ff9b2d76ab5c4f` |
| `20261107000011` | `cbfd1002b10f86f3b1f35e28e20846d5f8eb4c42ad1597edcff48425e810afab901fa5c34daf981e1a366da834a2b268` |
| `20261107000012` | `39268de93e38e66d7a7e9d7fccacc9cd597160b3449240e1ae4d4e225a7aa422c6971afc34bf1c4df54ea418c097a838` |

### 16.6 权限集合 diff（新增/删除逐条）

渲染「执行前 vs 执行后」两份 CSV 快照后做集合差：

- 净新增 **212** 条（215 建 − 3 条同窗口删除）；净删除 **89** 条（92 删 − 3 条本窗口新建）。
- `000012` 的 92 个目标码**执行后全部不存在**（`DELSET_REMAIN=0`）；
  `hrm:training_plan:*` 仅余 `read`（写码 3 条已按设计下线）。

### 删除（000012，92 条中按批次 3 窗口语义实际可见 89 条净删除 + 3 条 hrm 建后即删）

| 模块 | 条数 | 权限码 |
|---|---|---|
| `crm` | 9 | `crm:opportunity:create` `crm:opportunity:delete` `crm:opportunity:update` `crm:sales_forecast:create` `crm:sales_forecast:delete` `crm:sales_forecast:update` `crm:sales_funnel:create` `crm:sales_funnel:delete` `crm:sales_funnel:update` |
| `ehs` | 3 | `ehs:emergency:create` `ehs:emergency:delete` `ehs:emergency:update` |
| `finance` | 9 | `finance:budget:create` `finance:budget:delete` `finance:budget:update` `finance:consolidation:create` `finance:consolidation:delete` `finance:consolidation:update` `finance:report:create` `finance:report:delete` `finance:report:update` |
| `hrm` | 6 | `hrm:attendance:create` `hrm:attendance:delete` `hrm:attendance:update` `hrm:report:create` `hrm:report:delete` `hrm:report:update` |
| `lims` | 3 | `lims:result:create` `lims:result:delete` `lims:result:update` |
| `mes` | 12 | `mes:anomaly:create` `mes:anomaly:delete` `mes:anomaly:update` `mes:energy:create` `mes:energy:delete` `mes:energy:update` `mes:kanban:create` `mes:kanban:delete` `mes:kanban:update` `mes:traceability:create` `mes:traceability:delete` `mes:traceability:update` |
| `pdm` | 3 | `pdm:stats:create` `pdm:stats:delete` `pdm:stats:update` |
| `pm` | 9 | `pm:report:create` `pm:report:delete` `pm:report:update` `pm:task:create` `pm:task:delete` `pm:task:update` `pm:template:create` `pm:template:delete` `pm:template:update` |
| `qms` | 9 | `qms:inspection:create` `qms:inspection:delete` `qms:inspection:update` `qms:nonconformance:create` `qms:nonconformance:delete` `qms:nonconformance:update` `qms:quality_control:create` `qms:quality_control:delete` `qms:quality_control:update` |
| `report` | 14 | `report:builder:create` `report:builder:delete` `report:builder:read` `report:builder:update` `report:design:create` `report:design:delete` `report:design:read` `report:design:update` `report:schedule:create` `report:schedule:delete` `report:schedule:update` `report:template:create` `report:template:delete` `report:template:update` |
| `srm` | 3 | `srm:portal:create` `srm:portal:delete` `srm:portal:update` |
| `wms` | 9 | `wms:inventory_check:create` `wms:inventory_check:delete` `wms:inventory_check:update` `wms:report:create` `wms:report:delete` `wms:report:update` `wms:supplier:create` `wms:supplier:delete` `wms:supplier:update` |

### 新增（净增 212 条；000005 的 3 条 hrm 写码被 000012 同窗口删除，不计入净增）

| 批次 | 模块 | 条数 | 权限码 |
|---|---|---|---|
| batch16 | `aps` | 9 | `aps:capacity:create` `aps:capacity:delete` `aps:capacity:update` `aps:forecast:create` `aps:forecast:delete` `aps:forecast:update` `aps:schedule:create` `aps:schedule:delete` `aps:schedule:update` |
| batch16 | `bi` | 6 | `bi:data_source:create` `bi:data_source:delete` `bi:data_source:update` `bi:report:create` `bi:report:delete` `bi:report:update` |
| batch16 | `doc` | 3 | `doc:document:create` `doc:document:delete` `doc:document:update` |
| batch16 | `erp` | 39 | `erp:announcement:create` `erp:announcement:delete` `erp:announcement:update` `erp:asset:create` `erp:asset:delete` `erp:asset:update` `erp:bank_account:create` `erp:bank_account:delete` `erp:bank_account:update` `erp:budget:create` `erp:budget:delete` `erp:budget:update` `erp:customer:create` `erp:customer:delete` `erp:customer:update` `erp:inventory:create` `erp:inventory:delete` `erp:inventory:update` `erp:material:create` `erp:material:delete` `erp:material:update` `erp:meeting_room:create` `erp:meeting_room:delete` `erp:meeting_room:update` `erp:office_supply:create` `erp:office_supply:delete` `erp:office_supply:update` `erp:purchase_order:create` `erp:purchase_order:delete` `erp:purchase_order:update` `erp:supplier:create` `erp:supplier:delete` `erp:supplier:update` `erp:vehicle:create` `erp:vehicle:delete` `erp:vehicle:update` `erp:vehicle_request:create` `erp:vehicle_request:delete` `erp:vehicle_request:update` |
| batch16 | `iam` | 3 | `iam:permission:create` `iam:permission:delete` `iam:permission:update` |
| batch16 | `integration` | 9 | `integration:connection:create` `integration:connection:delete` `integration:connection:update` `integration:event:create` `integration:event:delete` `integration:event:update` `integration:mapping:create` `integration:mapping:delete` `integration:mapping:update` |
| batch16 | `mobile` | 3 | `mobile:notification:create` `mobile:notification:delete` `mobile:notification:update` |
| batch16 | `monitor` | 6 | `monitor:alert:create` `monitor:alert:delete` `monitor:alert:update` `monitor:log:create` `monitor:log:delete` `monitor:log:update` |
| batch16 | `qms` | 3 | `qms:action:create` `qms:action:delete` `qms:action:update` |
| batch16 | `rd` | 33 | `rd:bug:create` `rd:bug:delete` `rd:bug:update` `rd:build:create` `rd:build:delete` `rd:build:update` `rd:deploy:create` `rd:deploy:delete` `rd:deploy:update` `rd:doc:create` `rd:doc:delete` `rd:doc:update` `rd:experiment:create` `rd:experiment:delete` `rd:experiment:update` `rd:formula:create` `rd:formula:delete` `rd:formula:update` `rd:material:create` `rd:material:delete` `rd:material:update` `rd:milestone:create` `rd:milestone:delete` `rd:milestone:update` `rd:project:create` `rd:project:delete` `rd:project:update` `rd:settings:create` `rd:settings:delete` `rd:settings:update` `rd:test:create` `rd:test:delete` `rd:test:update` |
| batch16 | `tms` | 12 | `tms:carrier:create` `tms:carrier:delete` `tms:carrier:update` `tms:driver:create` `tms:driver:delete` `tms:driver:update` `tms:route:create` `tms:route:delete` `tms:route:update` `tms:vehicle:create` `tms:vehicle:delete` `tms:vehicle:update` |
| batch16 | `workflow` | 6 | `workflow:instance:create` `workflow:instance:delete` `workflow:instance:update` `workflow:monitor:create` `workflow:monitor:delete` `workflow:monitor:update` |
| batch17 | `finance` | 6 | `finance:accounting_subject:create` `finance:accounting_subject:delete` `finance:accounting_subject:update` `finance:receivable_payable:create` `finance:receivable_payable:delete` `finance:receivable_payable:update` |
| batch17 | `mes` | 9 | `mes:material_issue:create` `mes:material_issue:delete` `mes:material_issue:update` `mes:material_requirement:create` `mes:material_requirement:delete` `mes:material_requirement:update` `mes:material_return:create` `mes:material_return:delete` `mes:material_return:update` |
| batch17 | `monitor` | 3 | `monitor:rule:create` `monitor:rule:delete` `monitor:rule:update` |
| batch17 | `scm` | 6 | `scm:incoming_inspection:create` `scm:incoming_inspection:delete` `scm:incoming_inspection:update` `scm:incoming_notice:create` `scm:incoming_notice:delete` `scm:incoming_notice:update` |
| batch17 | `wms` | 3 | `wms:stocktake:create` `wms:stocktake:delete` `wms:stocktake:update` |
| batch17 | `workflow` | 3 | `workflow:definition:create` `workflow:definition:delete` `workflow:definition:update` |
| batch18 | `finance` | 3 | `finance:account:create` `finance:account:delete` `finance:account:update` |
| batch18 | `integration` | 9 | `integration:lims_qms_sync:create` `integration:lims_qms_sync:delete` `integration:lims_qms_sync:update` `integration:mes_erp_sync:create` `integration:mes_erp_sync:delete` `integration:mes_erp_sync:update` `integration:wms_scm_sync:create` `integration:wms_scm_sync:delete` `integration:wms_scm_sync:update` |
| batch18 | `migration` | 3 | `migration:service:create` `migration:service:delete` `migration:service:update` |
| batch18 | `notification` | 6 | `notification:archived_notification:create` `notification:archived_notification:delete` `notification:archived_notification:update` `notification:notification:create` `notification:notification:delete` `notification:notification:update` |
| batch18 | `plugin` | 3 | `plugin:plugin:create` `plugin:plugin:delete` `plugin:plugin:update` |
| batch18 | `ticket` | 3 | `ticket:ticket:create` `ticket:ticket:delete` `ticket:ticket:update` |
| batch19 | `tenant` | 2 | `tenant:member:delete` `tenant:member:update` |
| untagged | `aps` | 6 | `aps:material_plan:create` `aps:material_plan:delete` `aps:material_plan:update` `aps:production_plan:create` `aps:production_plan:delete` `aps:production_plan:update` |
| untagged | `notification` | 4 | `notification:template:create` `notification:template:delete` `notification:template:read` `notification:template:update` |
| untagged | `srm` | 8 | `srm:scoring_dimension:create` `srm:scoring_dimension:delete` `srm:scoring_dimension:read` `srm:scoring_dimension:update` `srm:supplier_product:create` `srm:supplier_product:delete` `srm:supplier_product:read` `srm:supplier_product:update` |
| untagged | `workflow` | 3 | `workflow:template:create` `workflow:template:delete` `workflow:template:update` |

### 16.7 角色授权受影响面

| 角色 | 新增 | 删除 | 净变化 |
|---|---|---|---|
| `admin` | 212 | 0 | +212 |
| `crm_manager` | 0 | 9 | -9 |
| `ehs_manager` | 0 | 3 | -3 |
| `erp_manager` | 40 | 0 | +40 |
| `finance_manager` | 9 | 9 | +0 |
| `hrm_manager` | 0 | 6 | -6 |
| `lims_manager` | 0 | 3 | -3 |
| `mes_manager` | 9 | 12 | -3 |
| `pdm_manager` | 0 | 3 | -3 |
| `pm_manager` | 0 | 9 | -9 |
| `qms_manager` | 3 | 9 | -6 |
| `report_manager` | 0 | 14 | -14 |
| `scm_manager` | 6 | 0 | +6 |
| `srm_manager` | 8 | 3 | +5 |
| `wms_manager` | 3 | 9 | -6 |

**新增明细（按角色）**

- `admin`（+212）：`aps:capacity:create` `aps:capacity:delete` `aps:capacity:update` `aps:forecast:create` `aps:forecast:delete` `aps:forecast:update` `aps:material_plan:create` `aps:material_plan:delete` `aps:material_plan:update` `aps:production_plan:create` `aps:production_plan:delete` `aps:production_plan:update` `aps:schedule:create` `aps:schedule:delete` `aps:schedule:update` `bi:data_source:create` `bi:data_source:delete` `bi:data_source:update` `bi:report:create` `bi:report:delete` `bi:report:update` `doc:document:create` `doc:document:delete` `doc:document:update` `erp:announcement:create` `erp:announcement:delete` `erp:announcement:update` `erp:asset:create` `erp:asset:delete` `erp:asset:update` `erp:bank_account:create` `erp:bank_account:delete` `erp:bank_account:update` `erp:budget:create` `erp:budget:delete` `erp:budget:update` `erp:customer:create` `erp:customer:delete` `erp:customer:update` `erp:inventory:create` `erp:inventory:delete` `erp:inventory:update` `erp:material:create` `erp:material:delete` `erp:material:update` `erp:meeting_room:create` `erp:meeting_room:delete` `erp:meeting_room:update` `erp:office_supply:create` `erp:office_supply:delete` `erp:office_supply:update` `erp:purchase_order:create` `erp:purchase_order:delete` `erp:purchase_order:update` `erp:supplier:create` `erp:supplier:delete` `erp:supplier:update` `erp:vehicle:create` `erp:vehicle:delete` `erp:vehicle:update` `erp:vehicle_request:create` `erp:vehicle_request:delete` `erp:vehicle_request:update` `finance:account:create` `finance:account:delete` `finance:account:update` `finance:accounting_subject:create` `finance:accounting_subject:delete` `finance:accounting_subject:update` `finance:receivable_payable:create` `finance:receivable_payable:delete` `finance:receivable_payable:update` `iam:permission:create` `iam:permission:delete` `iam:permission:update` `integration:connection:create` `integration:connection:delete` `integration:connection:update` `integration:event:create` `integration:event:delete` `integration:event:update` `integration:lims_qms_sync:create` `integration:lims_qms_sync:delete` `integration:lims_qms_sync:update` `integration:mapping:create` `integration:mapping:delete` `integration:mapping:update` `integration:mes_erp_sync:create` `integration:mes_erp_sync:delete` `integration:mes_erp_sync:update` `integration:wms_scm_sync:create` `integration:wms_scm_sync:delete` `integration:wms_scm_sync:update` `mes:material_issue:create` `mes:material_issue:delete` `mes:material_issue:update` `mes:material_requirement:create` `mes:material_requirement:delete` `mes:material_requirement:update` `mes:material_return:create` `mes:material_return:delete` `mes:material_return:update` `migration:service:create` `migration:service:delete` `migration:service:update` `mobile:notification:create` `mobile:notification:delete` `mobile:notification:update` `monitor:alert:create` `monitor:alert:delete` `monitor:alert:update` `monitor:log:create` `monitor:log:delete` `monitor:log:update` `monitor:rule:create` `monitor:rule:delete` `monitor:rule:update` `notification:archived_notification:create` `notification:archived_notification:delete` `notification:archived_notification:update` `notification:notification:create` `notification:notification:delete` `notification:notification:update` `notification:template:create` `notification:template:delete` `notification:template:read` `notification:template:update` `plugin:plugin:create` `plugin:plugin:delete` `plugin:plugin:update` `qms:action:create` `qms:action:delete` `qms:action:update` `rd:bug:create` `rd:bug:delete` `rd:bug:update` `rd:build:create` `rd:build:delete` `rd:build:update` `rd:deploy:create` `rd:deploy:delete` `rd:deploy:update` `rd:doc:create` `rd:doc:delete` `rd:doc:update` `rd:experiment:create` `rd:experiment:delete` `rd:experiment:update` `rd:formula:create` `rd:formula:delete` `rd:formula:update` `rd:material:create` `rd:material:delete` `rd:material:update` `rd:milestone:create` `rd:milestone:delete` `rd:milestone:update` `rd:project:create` `rd:project:delete` `rd:project:update` `rd:settings:create` `rd:settings:delete` `rd:settings:update` `rd:test:create` `rd:test:delete` `rd:test:update` `scm:incoming_inspection:create` `scm:incoming_inspection:delete` `scm:incoming_inspection:update` `scm:incoming_notice:create` `scm:incoming_notice:delete` `scm:incoming_notice:update` `srm:scoring_dimension:create` `srm:scoring_dimension:delete` `srm:scoring_dimension:read` `srm:scoring_dimension:update` `srm:supplier_product:create` `srm:supplier_product:delete` `srm:supplier_product:read` `srm:supplier_product:update` `tenant:member:delete` `tenant:member:update` `ticket:ticket:create` `ticket:ticket:delete` `ticket:ticket:update` `tms:carrier:create` `tms:carrier:delete` `tms:carrier:update` `tms:driver:create` `tms:driver:delete` `tms:driver:update` `tms:route:create` `tms:route:delete` `tms:route:update` `tms:vehicle:create` `tms:vehicle:delete` `tms:vehicle:update` `wms:stocktake:create` `wms:stocktake:delete` `wms:stocktake:update` `workflow:definition:create` `workflow:definition:delete` `workflow:definition:update` `workflow:instance:create` `workflow:instance:delete` `workflow:instance:update` `workflow:monitor:create` `workflow:monitor:delete` `workflow:monitor:update` `workflow:template:create` `workflow:template:delete` `workflow:template:update`
- `erp_manager`（+40）：`erp:announcement:create` `erp:announcement:delete` `erp:announcement:update` `erp:asset:create` `erp:asset:delete` `erp:asset:update` `erp:bank_account:create` `erp:bank_account:delete` `erp:bank_account:update` `erp:budget:create` `erp:budget:delete` `erp:budget:update` `erp:customer:create` `erp:customer:delete` `erp:customer:update` `erp:inventory:create` `erp:inventory:delete` `erp:inventory:update` `erp:material:create` `erp:material:delete` `erp:material:update` `erp:meeting_room:create` `erp:meeting_room:delete` `erp:meeting_room:update` `erp:office_supply:create` `erp:office_supply:delete` `erp:office_supply:update` `erp:purchase_order:create` `erp:purchase_order:delete` `erp:purchase_order:update` `erp:supplier:create` `erp:supplier:delete` `erp:supplier:update` `erp:vehicle:create` `erp:vehicle:delete` `erp:vehicle:update` `erp:vehicle_request:create` `erp:vehicle_request:delete` `erp:vehicle_request:update` `finance:voucher:read`
- `finance_manager`（+9）：`finance:account:create` `finance:account:delete` `finance:account:update` `finance:accounting_subject:create` `finance:accounting_subject:delete` `finance:accounting_subject:update` `finance:receivable_payable:create` `finance:receivable_payable:delete` `finance:receivable_payable:update`
- `mes_manager`（+9）：`mes:material_issue:create` `mes:material_issue:delete` `mes:material_issue:update` `mes:material_requirement:create` `mes:material_requirement:delete` `mes:material_requirement:update` `mes:material_return:create` `mes:material_return:delete` `mes:material_return:update`
- `qms_manager`（+3）：`qms:action:create` `qms:action:delete` `qms:action:update`
- `scm_manager`（+6）：`scm:incoming_inspection:create` `scm:incoming_inspection:delete` `scm:incoming_inspection:update` `scm:incoming_notice:create` `scm:incoming_notice:delete` `scm:incoming_notice:update`
- `srm_manager`（+8）：`srm:scoring_dimension:create` `srm:scoring_dimension:delete` `srm:scoring_dimension:read` `srm:scoring_dimension:update` `srm:supplier_product:create` `srm:supplier_product:delete` `srm:supplier_product:read` `srm:supplier_product:update`
- `wms_manager`（+3）：`wms:stocktake:create` `wms:stocktake:delete` `wms:stocktake:update`

**删除明细（按角色）**

- `crm_manager`（-9）：`crm:opportunity:create` `crm:opportunity:delete` `crm:opportunity:update` `crm:sales_forecast:create` `crm:sales_forecast:delete` `crm:sales_forecast:update` `crm:sales_funnel:create` `crm:sales_funnel:delete` `crm:sales_funnel:update`
- `ehs_manager`（-3）：`ehs:emergency:create` `ehs:emergency:delete` `ehs:emergency:update`
- `finance_manager`（-9）：`finance:budget:create` `finance:budget:delete` `finance:budget:update` `finance:consolidation:create` `finance:consolidation:delete` `finance:consolidation:update` `finance:report:create` `finance:report:delete` `finance:report:update`
- `hrm_manager`（-6）：`hrm:attendance:create` `hrm:attendance:delete` `hrm:attendance:update` `hrm:report:create` `hrm:report:delete` `hrm:report:update`
- `lims_manager`（-3）：`lims:result:create` `lims:result:delete` `lims:result:update`
- `mes_manager`（-12）：`mes:anomaly:create` `mes:anomaly:delete` `mes:anomaly:update` `mes:energy:create` `mes:energy:delete` `mes:energy:update` `mes:kanban:create` `mes:kanban:delete` `mes:kanban:update` `mes:traceability:create` `mes:traceability:delete` `mes:traceability:update`
- `pdm_manager`（-3）：`pdm:stats:create` `pdm:stats:delete` `pdm:stats:update`
- `pm_manager`（-9）：`pm:report:create` `pm:report:delete` `pm:report:update` `pm:task:create` `pm:task:delete` `pm:task:update` `pm:template:create` `pm:template:delete` `pm:template:update`
- `qms_manager`（-9）：`qms:inspection:create` `qms:inspection:delete` `qms:inspection:update` `qms:nonconformance:create` `qms:nonconformance:delete` `qms:nonconformance:update` `qms:quality_control:create` `qms:quality_control:delete` `qms:quality_control:update`
- `report_manager`（-14）：`report:builder:create` `report:builder:delete` `report:builder:read` `report:builder:update` `report:design:create` `report:design:delete` `report:design:read` `report:design:update` `report:schedule:create` `report:schedule:delete` `report:schedule:update` `report:template:create` `report:template:delete` `report:template:update`
- `srm_manager`（-3）：`srm:portal:create` `srm:portal:delete` `srm:portal:update`
- `wms_manager`（-9）：`wms:inventory_check:create` `wms:inventory_check:delete` `wms:inventory_check:update` `wms:report:create` `wms:report:delete` `wms:report:update` `wms:supplier:create` `wms:supplier:delete` `wms:supplier:update`

### 16.8 冒烟、隔离与健康

| 检查 | 结果 |
|---|---|
| 超管 token（`is_superuser=true`）拉字典 | HTTP **200**，`total=77`（权限面正常） |
| probe 租户 `1111…1111`（非超管，仅 `master-data:read`） | HTTP **200**，`total=0`（租户隔离生效） |
| `/health` | **200** |
| `/api/server/ready` | **200** |
| 服务进程 | pid **74405**，启动时间 **2026-11-06 18:01:14**（窗口前），**未重启** |

### 16.9 结论、遗留与回滚

- 本窗口只做**权限码/授权数据 DML**：7 行账本、净 +212 码、净 +201 授权行；结构与字典/通知/审计零变化，服务未重启。
- **遗留 1**：`000001`（IAM 权威同步，4 码中 3 缺）按 592 口径 defer，需另开窗口授权后应用（预计 +3 码 +1 账本）。
- **遗留 2**：`000015`（RLS 系统上下文）显式 defer；`000002` 仍为 anchor 以下未记账（triage 已标为被 000003 取代）。
- **回滚手册（未执行）**：本窗口无自动回滚；如需回退，按
  `pg_restore -d topems_prod --data-only -t core_permissions -t core_role_permissions /tmp/topems_window_b3_20261106_203254/perm_grants.dump`
  恢复两张表数据，并手工清理这 7 行 `_sqlx_migrations`（仅限评审后操作，禁止脚本自动执行）。
- 证据目录 `/tmp/topems_window_b3_20261106_203254/`：`perm_grants.dump`、`codes_before.csv` / `codes_after.csv`、
  `grants_before.csv` / `grants_after.csv`、`ledger_before.txt` / `ledger_after.txt`；
  `apply.log`（本地 `/tmp/b3_apply.log`）与 sha256 投递清单。
