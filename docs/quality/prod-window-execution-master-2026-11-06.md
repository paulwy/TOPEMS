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
