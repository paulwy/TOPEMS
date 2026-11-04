# 生产库治理实测基线与 P1–P5 分批执行方案（2026-11-04）

> 对象：`topems_prod` @ `192.168.110.115`（PostgreSQL 17.11，1402 表）。
> 对照基线：同实例 `topems_test`（1328 表）。
> 口径：全部数字来自 `pg_catalog` 实测；§2 保留 2026-11-04 执行前基线，§1.1 记录 2026-11-05 的 prod 执行结果与执行后复核。P1/P2/P3/P5 已于 prod 执行；P4 已完成首批 11 张（3 张直接删 + 8 张重指向 FK 后删），余 63 张待确认。

## 1. 结论摘要

| 项 | 状态 |
|---|---|
| 只读盘点 | ✅ 完成（可连库、可 SELECT，不可写） |
| P1 类型安全加宽（17 列） | ✅ **已执行 2026-11-05**；类型差异 296→279（P5a 后总差 284） |
| P2 NULLIF 统一（29 条 master_data 策略） | ✅ **已执行 2026-11-05**；纯文本比较 29→0；策略 1083 / RLS 表 883 均不变 |
| P3 约束补齐（5 PK / 48 UNIQUE / 45 FK） | ✅ **已执行 2026-11-05**；p/u/f 1391/233/253→**1396/281/298**，`NOT VALID`=0。5 张 `schema_defense_ledger` 运行时自建表 PK 仍由启动守卫补齐 |
| P4 反向表收敛（74 张，22 个 FK 依赖） | ✅ **首批 2026-11-05**：删 11 张（3 张直接删 + 8 张重指向 18 条 FK 后删）；保留 qms 3 张 + `core_finance_currencies`（运行时 CRUD）+ 60 张待业务确认 |
| P5 时间戳 + status_standard + 账本 | ✅ **已执行 2026-11-05**；naive 5→0、3 条 `*_status_standard` CHECK 已删；账本 549→556 |

**核心结论：账本 `success = true` ≠ DDL 到位。** 执行前 prod 账本已登记 `20261103000002`（success），但 3 条 `status_standard` CHECK 仍存在；`db04-prod` 头部声称已执行，实测仍残留 5 个 naive timestamp 列。该现象已由 2026-11-05 的 P5a/P5b 修正，但"以 `pg_catalog` 实测为准、不以账本判 DDL"的原则继续适用。

## 1.1 prod 执行记录（2026-11-05）

**结论**：P1/P2/P3/P5 共 7 个迁移全部执行成功；账本 549→**556**，新增 7 条 `success=true` 且 checksum 与仓库文件 SHA-384 一致；每步执行后健康检查（prod `/health`）均为 **200**。未执行 `sqlx migrate run`，未 DROP 任何对象，未使用 `CASCADE`。

**备份**：`~/topems/backups/topems_prod_pre_p1235_20261105_004312.dump`，`pg_dump -Fc`，4,151,219 字节；`pg_restore -l` 列出 8270 行 TOC，备份可用。

| 文件 | 账本 version | 关键校验 | 状态 |
|---|---|---|---|
| `20261104090000_p1_prod_type_widen_17cols.sql` | 20261104090000 | 类型差异 296→279；5 张非空表行数不变；`pm.projects.budget` numeric(18,4) 精度不丢 | ✅ |
| `20261104100000_p5a_prod_naive_timestamps_5cols.sql` | 20261104100000 | naive 5→0 | ✅ |
| `20261104110000_p5b_prod_status_standard_checks_3.sql` | 20261104110000 | 3 条 `*_status_standard` 均查无 | ✅ |
| `20261104120000_p2_nullif_29policies.sql` | 20261104120000 | 纯文本比较 29→0；策略 1083 / RLS 883 不变 | ✅ |
| `20261104130000_p3_pk_5.sql` | 20261104130000 | PK 1391→1396 | ✅ |
| `20261104140000_p3_unique_48.sql` | 20261104140000 | UNIQUE 233→281（含 48 条索引接管） | ✅ |
| `20261104150000_p3_fk_45.sql` | 20261104150000 | FK 253→298；`convalidated=false`=0 | ✅ |

**执行前后基线对照**

| 指标 | 执行前 | 执行后 |
|---|---:|---:|
| prod-vs-test 类型差异 | 296 | **284**（P1 后 279，P5a 有意新增 5 处 prod timestamptz vs test naive） |
| NULLIF 纯文本比较策略 | 29 | **0** |
| naive timestamp（5 列口径） | 5 | **0** |
| 约束缺口 | 103 | **5**（仅 5 张运行时自建 `*.schema_defense_ledger` 的 PK） |
| p / u / f 约束数 | 1391 / 233 / 253 | **1396 / 281 / 298** |
| `NOT VALID` 约束 | — | **0** |
| 反向表（prod 独有） | 74 | **63**（P4 首批删 11 张后） |
| 账本条数 | 549 | **556** |

**P3-UNIQUE 守卫缺陷与 checksum 重同步（单独说明）**

- 缺陷：原文件用 `to_regclass('<约束名>') IS NULL` 判断"约束是否不存在"，把约束名当关系名；prod 已存在 48 个同名唯一索引，导致按原文件执行时 48 条全部跳过（UNIQUE 仍为 233）。
- 修正：删除该误用行；守卫改为"表存在且无同名约束"后，三分支：同名唯一索引存在（且 `indisunique/indisvalid`、非 partial/表达式）→ `ADD CONSTRAINT ... UNIQUE USING INDEX <name>` 接管索引；否则普通 `ADD CONSTRAINT ... UNIQUE (...)`。索引名不可 schema 限定，接管前用 `set_config('search_path','<schema>, public',true)` 临时切换。
- 验证：scratch 库（由 2026-11-05 预迁移 dump 恢复）造 24 张"有同名索引"+24 张"干净表"两组，修正后文件连跑两遍均 exit 0；24 条 `USING INDEX` 全部接管的索引 OID 与预置索引一致（未重复建索引），48 条约束全部存在，第二遍零变更。
- 账本同步：文件字节变更后，`version=20261104140000` 的 checksum 由 `8966e81a85c7…` 更新为 `42fb0738646e…`（新 SHA-384），prod 复算与仓库文件一致。理由：DDL 终态已达成且修正后文件行为等价、幂等，账本应与文件保持一致，否则后续 sqlx/门禁校验会报 integrity 不一致。
- prod 只读幂等证明：在 `BEGIN ... ROLLBACK` 事务内执行修正后文件，48 个 DO 全部跳过、无 NOTICE、无错误，`u` 计数 281 不变，事务回滚后 prod 无变更。

## 1.2 账本治理（2026-11-05）

**口径修正**：仓库 `database/migrations` 共 572 个 `.sql`：558 个 14 位版本 + 14 个短版本号 `000`–`013`。此前"15 个账本孤儿"中 **14 个实为短版本号文件**（`000_create_schemas.sql`–`013_login_log.sql`），其账本 checksum 与文件 SHA-384 逐一匹配，**不是孤儿**；真孤儿仅 `20261103000005` 1 个。

**17 个未登记版本分类与处置**

| 分类 | 版本 | 依据 | 处置 |
|---|---|---|---|
| 非 prod（5433 恢复库） | `20261103170000`、`180000`、`190000`、`230000`、`20261104000000`–`04070000`（除 `04030000`），共 11 个 | 文件头明确写 "5433" 或 "5433 对齐 test" | 不登记 |
| 非 prod（test 定向） | `20261103200000`、`210000`、`220000`、`20261104030000` | 文件名/文件头为 `test_*`、`db07/db08/db09/db14 test` | 不登记 |
| prod 已生效缺登记 | `20261103173000` | 174 个目标列在 prod **174/174 均为 timestamptz**（naive 0），DDL 效果已存在 | ✅ 已登记，checksum `f96d432f983d…`（文件 SHA-384 复算一致） |
| 已收敛缺登记 | `20261104080000` | 4 个索引：1 个（`idx_core_sessions_user_id`）prod/test 已存在且等价；3 个经 2026-11-05 核查**不建**（表仅 11/1 行、无独立查询路径），已从迁移文件移除 | ✅ 已登记，checksum `38e19667446b…`（文件 SHA-384 复算一致） |

**账本孤儿**

| 版本 | description | 来源判断 | 处置 |
|---|---|---|---|
| 0–13 | `create schemas` … `login log` | 对应仓库 `000`–`013` 短版本号文件，checksum 全部匹配 | 正常，无需处理 |
| `20261103000005` | `db governance check backfill` | 无对应文件；installed_on 2026-11-03 10:02，仓库与文档无引用，无法证明为旧占位 | **待确认，不 DELETE** |

**治理后**：账本 556→**560**（+1 治理补登 `20261103173000`，+1 P4 `20261105100000`，+1 `crm.audit_logs` `20261105130000`，+1 db19 `20261104080000`；checksum 均与仓库文件 SHA-384 一致）。仓库迁移文件 576 个（562 个 14 位版本 + 14 个短版本号）；未登记为 **17**（11 个 5433 + 6 个 test 定向：`20261103200000/210000/220000/04030000/05110000/05120000`）；真孤儿仍 1 个。禁止在任意库执行 `sqlx migrate run`。

## 2. prod 实测基线（2026-11-04）

| 维度 | 实测值 | 说明 |
|---|---|---|
| 表数量 | prod 1402 / test 1328（执行前） | 反向表（**prod 有、test 无**）74；P4 首批后 prod 1391、反向表 63 |
| 迁移账本 | prod **549** 条 / 仓库文件 **558** 个（执行前） | **17 个版本未登记**（DB-04-prod～DB-19）；治理后 P1 补登 →557，P4 `20261105100000` →558，`crm.audit_logs` `20261105130000` →559，db19 `20261104080000` →**560** / 文件 **576** / 未登记 **17**（11 个 5433 + 6 个 test 定向）；"孤儿"中 14 个实为短版本号文件，真孤儿 1 个 |
| 类型差异（同名列） | **296**（101 表） | 164 项 prod 已为 timestamptz（无需动）/ 12+3 方向安全 / 13 项 prod 更短 / 62 numeric 混合 / 其余零星 |
| NULLIF 纯文本比较策略 | **29**（全部 `master_data`） | `qual LIKE '%::text = current_setting%' AND qual NOT LIKE '%NULLIF%'` |
| 缺索引（按名比对，排除 pg_toast） | **10** | 全部为反向表 pkey；旧口径 285 含系统 schema 噪声 |
| 约束缺口 | **103**（10 PK / 48 UNIQUE / 45 FK，91 表） | 依据 test 侧 `pg_constraint` 结构实测；其中 5 条 PK 属运行时自建 `schema_defense_ledger`，P3 迁移仅覆盖剩余 5 条 |
| naive timestamp 残留 | **5 列** | `public.equipment` 4 列 + `iam.core_plugin_instances.last_heartbeat` |
| status_standard 残留 CHECK | **3** 条 | `crm.audit_logs` / `integration.external_erp_sync_logs` / `srm.inquiries`（迁移 0002 清单未覆盖） |
| 无 PK 表 | 11 | 10 张缺 PK 差异中：5 张纳入 P3 迁移，5 张为运行时自建 `schema_defense_ledger`（不纳入），1 张反向表随 P4 |
| 反向表行数 | 执行前 74 张中 73 张 0 行；`finance.core_finance_currencies` 16 行 | P4 首批后 63 张中 62 张 0 行；22 个 FK 引用（18 条已重指向权威表） |
| 服务连接库 | launchd `com.topems.server.plist` → `topems_prod` | 仓库 `.env` 指向 `topems_test`，属运维陷阱 |

> 访问方式：SSH 免密 `xingzhai@192.168.110.115` + `/opt/homebrew/bin/psql`；基线盘点仅执行 `SELECT`，2026-11-05 的执行会话见 §1.1/§5.1（所有 prod DDL 均单事务 + 备份 + `/health` 校验）。

## 3. 问题清单（按风险序）

1. **类型收窄/降级不可逆**：296 项中 164 项 prod 已是 timestamptz，若照旧记录"prod 215"批量对齐 test 会把时区语义降级为 naive——禁止。只做安全加宽（varchar→text、numeric 加宽）。
2. **NULLIF 缺口导致 RLS 崩溃**：`app.tenant_id=''` 时 `::uuid` cast 报 `invalid input syntax for type uuid: ""`；29 条 master_data 策略仍是裸 `current_setting` 比较。
3. **约束缺口影响正确性**：10 张表无 PK；48 UNIQUE / 45 FK 缺失（test 侧已有）。FK 缺失在并发写入下可产生孤儿行。
4. **账本与 DDL 漂移**：17 个版本未登记；已登记版本存在未生效 DDL（status_standard 3 条、db04-prod 5 列）。
5. **反向表与 FK 依赖**：74 张反向表为运行时自建/历史残留，其中 22 个 FK 依赖，直接 DROP 会因 RESTRICT 失败或破坏引用；`finance.core_finance_currencies` 有 16 行真实数据。首批 11 张已于 2026-11-05 处理（§5.1），余 63 张。
6. **索引噪声**：旧口径 285 含 `pg_toast`/生成名漂移，实测缺 10（仅反向表 pkey），不属正确性问题。

## 4. 迁移清单（本地验证记录；prod 已于 2026-11-05 全部执行）

> 下表为生成阶段的本地验证口径；prod 实际执行顺序、校验值与账本版本见 §1.1。P3-UQ 文件已修正守卫（索引接管路径），行数由 684 增至 878。

| 批次 | 文件 | 行数 | 内容 | 本地验证 |
|---|---|---|---|---|
| P1 | [20261104090000_p1_prod_type_widen_17cols.sql](database/migrations/20261104090000_p1_prod_type_widen_17cols.sql#L1-L294) | 294 | 17 列安全加宽（16 列 varchar→text + 1 列 numeric(15,2)→numeric(18,4)）；逐列 `format_type` 守卫 | scratch 库 `p1_dryrun_tmp` 双跑 exit 0；5 列 timestamptz 校验、行数不变 |
| P5a | [20261104100000_p5a_prod_naive_timestamps_5cols.sql](database/migrations/20261104100000_p5a_prod_naive_timestamps_5cols.sql#L1-L109) | 109 | 5 列 naive→timestamptz，`USING col AT TIME ZONE 'UTC'` | scratch 双跑 exit 0；UTC→+08 抽样正确 |
| P5b | [20261104110000_p5b_prod_status_standard_checks_3.sql](database/migrations/20261104110000_p5b_prod_status_standard_checks_3.sql#L1-L49) | 49 | 3 条实测名 CHECK（`ck_audit_logs_status_standard` / `ck_external_erp_sync_logs_status_standard` / `ck_inquiries_status_standard`） | scratch 双跑 exit 0；残留计数 0 |
| P2 | [20261104120000_p2_nullif_29policies.sql](database/migrations/20261104120000_p2_nullif_29policies.sql#L1-L403) | 403 | 29 个 DO 守卫块；按 `pg_policies` 原始表达式逐条 NULLIF 包装，成对 `USING ... WITH CHECK ...` | scratch `p2_dryrun_tmp` 双跑：`policies=29 / textcmp=0 / rls_tables=29 / nullif=29` |
| P3-PK | [20261104130000_p3_pk_5.sql](database/migrations/20261104130000_p3_pk_5.sql#L1-L96) | 96 | 5 个 PK；NULL/重复前置校验，不满足则 `RAISE NOTICE` 跳过。排除 5 张 `*.schema_defense_ledger`（运行时 `CREATE IF NOT EXISTS` 自建表，不在迁移链）；其历史库主键改由 [ensure_ledger_table](lib/shared-db/src/schema.rs#L207-L234) 幂等守卫补齐 | scratch 双跑：pk=5；guard 双跑无错、NULL 场景降级 WARNING |
| P3-UQ | [20261104140000_p3_unique_48.sql](database/migrations/20261104140000_p3_unique_48.sql#L1-L878) | 878 | 48 个 UNIQUE；表级 `to_regclass` 守卫 + 重复值前置校验；同名唯一索引存在时走 `ADD CONSTRAINT ... UNIQUE USING INDEX` 接管 | scratch 双跑：24 条索引接管 + 24 条新建；48/48 约束存在，第二遍零变更 |
| P3-FK | [20261104150000_p3_fk_45.sql](database/migrations/20261104150000_p3_fk_45.sql#L1-L777) | 777 | 45 个 FK；孤儿行前置检查 + `ADD CONSTRAINT ... NOT VALID` → `VALIDATE CONSTRAINT` | scratch 双跑：fk=45、`convalidated=false`=0 |
| 辅助 | [scripts/db/verify_prod_ledger.sh](scripts/db/verify_prod_ledger.sh#L1-L76) | 76 | 账本只读核对（禁止手工 checksum / INSERT） | 本机只读运行 |

**未纳入本批**：17 个未登记版本不补手工 checksum；`db08`（`20261103210000_db08_test_varchar_to_text_190cols.sql`）无守卫直改 190 列，**严禁在 prod 直接运行**，须先改写为带 `to_regclass`/列存在守卫的版本。

## 5. P2–P4 执行窗口与回滚条件

| 批次 | 前置 | 窗口建议 | 回滚条件 / 回滚方式 |
|---|---|---|---|
| P2 NULLIF | prod 备份完成；确认 `master_data` 29 张表存在 | 低峰 30 分钟内；纯策略重设，秒级 | 迁移文件内每条注释保留原始 `qual`，可逐条 `ALTER POLICY ... USING (<原 qual>)` 回滚；策略数/RLS 表数应不变 |
| P3-PK | 备份；5 张表数据量确认（PK 会建索引，锁表） | 低峰；单表 `lock_timeout=5s` | PK 不能 NOT VALID；失败即整表事务回滚。若某表 NULL/重复守卫触发，只跳过该表并 `NOTICE`，不影响其他表 |
| P3-UQ | 备份；48 表重复校验通过 | 低峰 | `DROP CONSTRAINT IF EXISTS <name>`；重复数据存在时迁移自动跳过该表 |
| P3-FK | 备份；45 组孤儿行检查为 0 | 低峰（`VALIDATE` 会短暂持锁） | `DROP CONSTRAINT IF EXISTS <name>`；`NOT VALID` 阶段失败不阻塞后续 |
| P4 反向表 | 首批已完成 2026-11-05（§5.1）；余 63 张需业务确认 | 独立变更窗口 | 只允许 DROP 空表且无依赖者；禁止 `CASCADE`；`finance.core_finance_currencies` 保留（运行时 CRUD） |

执行顺序：P5a/P5b（低风险）→ P2 → P3-PK → P3-UQ → P3-FK → P1（类型，锁表时间最长，最后做）。每批执行后立刻用 `pg_catalog` 复核：naive 计数、纯文本比较策略数、`convalidated=false` 计数、PK/UNIQUE/FK 计数与 test 对齐。

## 5.1 P4 首批执行记录（2026-11-05）

**迁移文件**：[20261105100000_p4_drop_shadow_tables_and_repoint_fks.sql](database/migrations/20261105100000_p4_drop_shadow_tables_and_repoint_fks.sql#L1-L432)（账本 version `20261105100000`，success=true，checksum `06c29710d690…`）。

**备份**：`~/topems/backups/topems_prod_pre_p4_20261105_014629.dump`（`pg_dump -Fc`，4,178,289 字节，`pg_restore -l` 8320 行 TOC）。

| 动作 | 对象 | 当场复核证据 |
|---|---|---|
| 直接 DROP | `core.core_plugin_pricing`、`finance.core_finance_account_opening_balances`、`srm.supplier_users` | 0 行；入站 FK 0；运行时（`svc/lib/web`）引用 0；依赖视图 0 |
| FK 重指向后 DROP | `mes.tenant_permissions`、`public.mobile_users`、`public.qa_ehs_{compliance_evaluations,drill_plans,drill_records,environmental_regulations,hazard_factors,inspection_records}` | 8 张均 0 行、0 依赖视图；19 条入站 FK 逐一删除后按同一约束名重建到权威表（`NOT VALID` + `VALIDATE`），其中 1 条的宿主表随后整体删除，最终保留 **18 条** |
| 保留 | `qms.qa_inspection_items/plans/qa_sampling_plans` | 无明确权威表，3 条 FK 未动 |
| 保留 | `finance.core_finance_currencies` | 16 行；`svc/finance/src/modules/currencies.rs` 有完整 CRUD（`TABLE = "finance.core_finance_currencies"`） |
| 保留 | 其余 60 张 | 业务未确认，仅出清单 |

**执行结果**：单事务（`lock_timeout=5s`、`statement_timeout=60s`）exit 0；表数 **1402→1391**（-11）；FK **298→295**（-19 旧约束 +19 新约束，再随 3 张被删表带走 3 条出站 FK）；`notvalid=0`；11 张目标表 `to_regclass` 均为 NULL。执行后 prod `/health` = **200**。

**验证方式**：先在恢复同一 dump 的 scratch 库连跑两遍（exit 0、第二遍零变更、终态校验通过），再在 prod 单事务执行；脚本内置终态校验（11 表不存在 / `NOT VALID`=0 / 18 条重指向 FK），任一不满足即 `RAISE EXCEPTION` 回滚。

## 6. 剩余决策项

1. **P4 剩余 63 张**：首批 11 张已删（§5.1）；保留 qms 3 张（无明确权威表）、`finance.core_finance_currencies`（运行时 CRUD）、60 张业务未确认。确认前不动。
2. **执行后仍有 99 项类型差异**（284→99，2026-11-05 test 侧对齐后）：62 数值族混用、13 varchar test 更宽（prod 更短）、5 jsonb↔text/text[]、5 UUID 契约、5 timestamptz↔text、4 date↔timestamptz、2 numeric↔text、2 varchar↔text、1 varchar↔jsonb。均属契约/语义类，只分类不执行（见 §7）。
3. **未登记 17 个 + 真孤儿 1 个**（治理后）：11 个 5433 定向、6 个 test 定向（含新增 db20/db21），均不登记；db19 已收敛（1 条已存在 + 3 条评估不建）并登记账本。`20261103000005` 来源不明，保留待确认、不 DELETE。`db08` 无守卫，禁止直接重放。
4. **`crm.audit_logs` 值域**：✅ **已按业务决策执行（2026-11-05，允许 `'error'`）**；prod 执行前 17 行均为 `success`、无非标准值；CHECK 已重建并 `VALIDATE`，见 §8。
5. **索引批次**：prod 实缺 10 个（反向表 pkey），随 P4 收敛；db19 四索引已在 §6.1 逐项收口；其余库（topems 1137）另行性能批次。

### 6.1 db19 四个索引核查（2026-11-05）

**文件**：[20261104080000_db19_index_batch2_4cols.sql](database/migrations/20261104080000_db19_index_batch2_4cols.sql#L1-L21)（原 4 条 `CREATE INDEX IF NOT EXISTS`；核查后文件收敛为 1 条）。prod 与 test 现状一致：仅 `idx_core_sessions_user_id` 存在，其余 3 条两库均无。

| 索引 | 表 / 列 | 表行数（prod / test） | 现有等价索引 | 判定 | 动作 |
|---|---|---|---:|---|---|---|
| `idx_core_sessions_user_id` | `public.core_sessions(user_id)` | 11 / 229 | 同名索引 `CREATE INDEX … USING btree (user_id)`，非 unique/非 partial | **A 已存在且等价** | 无 |
| `idx_core_sessions_expires_at` | `public.core_sessions(expires_at)` | 11 / 229 | 无 | **不建（评估非必要）**：唯一查询为 `user_id + expires_at` 组合过滤（`auth.rs`），`user_id` 已索引；仓库无按 `expires_at` 的清理任务；11 行表建索引纯冗余 | 从迁移移除 |
| `idx_bi_reports_tenant_id` | `bi.reports(tenant_id)` | 1 / 1 | 无 | **不建（评估非必要）**：RLS 已启用且策略含 `tenant_id`，但表仅 1 行，顺序扫描成本为零；代码查询仅 `WHERE id` | 从迁移移除 |
| `idx_bi_reports_status` | `bi.reports(status)` | 1 / 1 | 无 | **不建（评估非必要）**：代码无按 `status` 过滤 `bi.reports` 的查询（调度器 `status='active'` 针对 `report_schedules`） | 从迁移移除 |

**结论**：无需任何 prod DDL（未补建、未删索引、未备份，因无 schema 变更）；`/health` 复核 **200**。文件内应生效 DDL（`user_id` 索引）已存在且等价，故登记 prod 账本 `20261104080000`（`success=true`、`execution_time=0`、checksum `38e19667446b…` 与文件 SHA-384 一致），**未重放迁移**。

## 7. test 侧类型对齐（2026-11-05）

**范围**：仅 `topems_test`（prod 机同实例），prod 未做任何变更（执行前后 prod 类型快照 `diff` 一致，`/health`=200）。

**前置只读核对**：185 个目标列在 test 中 **FK / 视图 / 生成列依赖均为 0**，**默认值 0**，RLS 策略引用 0；169 个 timestamp 列 **非空行数全部为 0**。

| 分类 | 数量 | 处置 | 证据 |
|---|---:|---|---|
| prod `timestamptz` / test `timestamp` | **169** | ✅ 执行 test→timestamptz，`USING col AT TIME ZONE 'UTC'`（含 P5a 引入 5 列） | 169 列全 NULL，无依赖 |
| varchar 加宽（含 1 项 varchar→text） | **13** | ✅ 执行（`varchar(200)→(256)` 等） | 无依赖，加宽不截断 |
| numeric 加宽 | **3** | ✅ 执行（`numeric(12,2)→(15,3)`，`qa_ehs_hazardous_materials`） | 精度/整数位均不缩 |
| 数值族混用（double precision / numeric / int） | 62 | ⏸ 只分类 | 精度语义不同，需业务定方向 |
| varchar test 更宽（prod 更短） | 13 | ⏸ 不执行 | 对齐会收窄 test，存在截断风险 |
| jsonb ↔ text/text[] | 5 | ⏸ 只分类 | 需数据合法性甄别 |
| UUID 契约（uuid ↔ varchar/bigint） | 5 | ⏸ 只分类 | 跨库契约 |
| timestamptz ↔ text | 5 | ⏸ 只分类 | `mdm_sla_measurements` 字段族 |
| date ↔ timestamptz | 4 | ⏸ 只分类 | 语义方向待定 |
| numeric ↔ text / varchar ↔ text / varchar ↔ jsonb | 5 | ⏸ 只分类 | 类型族不同 |
| **合计** | **284** | 执行 185 / 不执行 99 | |

**迁移文件**（test 定向，禁止在 prod 执行）：

- [20261105110000_db20_test_timestamptz_align_prod_169cols.sql](database/migrations/20261105110000_db20_test_timestamptz_align_prod_169cols.sql#L1-L182)（169 个 DO 守卫块）
- [20261105120000_db21_test_varchar_numeric_widen_16cols.sql](database/migrations/20261105120000_db21_test_varchar_numeric_widen_16cols.sql#L1-L28)（16 个 DO 守卫块，按 `format_type` 精确匹配旧类型）

**执行**：`BEGIN; \i db20; \i db21; COMMIT;`，`ON_ERROR_STOP=1`、`lock_timeout=5s`，exit 0；先在同事务 `ROLLBACK` 预演 185 个 DO 全通过。执行后 prod-vs-test 类型差异 **284→99**（=86 只分类 + 13 prod 更短），prod 类型快照逐行比对无变化。两个文件不登记 prod 账本（属 test 定向，与 db07–db09/db14 同口径）。

## 8. crm.audit_logs status 值域扩展（2026-11-05）

**决策**：允许 `'error'`。审计日志必须能记录失败结果；禁止把失败伪造成 `success`，也禁止旁路到其他表。

**执行前只读核对**

| 库 | status 分布 | 结论 |
|---|---|---|
| prod `crm.audit_logs` | `success` 17 行 | 无非标准值，可安全加约束 |
| test `crm.audit_logs` | `success` 121 + `error` 12 | 应用真实写入 `error`，与本次决策一致 |

**代码侧核对**：`AuditLog.status` 为自由文本 `String`，无状态枚举/DTO 校验；实际写入值来自
`shared-auth` 中间件（`success` / `error`(5xx) / `failed`(4xx) / `unknown`）、CRM handlers（`success` / `error`）、
SRM 审计（`pending`）。历史标准值另有 `active/inactive/archived/failure`。
据此在 [audit.rs](lib/shared-db/src/audit.rs#L6-L19) 增加 `AUDIT_LOG_STATUS_STANDARD` 常量与
`is_valid_audit_log_status()`，显式纳入 `'error'`，保持既有写入值与历史值全部合法（向后兼容、不改 API 契约）。

**DB 侧迁移**：[20261105130000_p4_audit_logs_status_check_error.sql](database/migrations/20261105130000_p4_audit_logs_status_check_error.sql#L1-L61)
（账本 version `20261105130000`，success=true，checksum `0f9f2c45249b…`；账本 **558→559**）。

**值域**：`status IS NULL OR status IN ('active','inactive','archived','success','failure','failed','error','pending','unknown')`。

**执行**：备份 `~/topems/backups/topems_prod_pre_p4_audit_20261105.dump`（4,150,530 字节，TOC 8265 行）；
先在事务内 `ROLLBACK` 预演，再单事务 `lock_timeout=5s` 执行 exit 0；`convalidated=true`。

**验证**：
- `INSERT ... status='error'` 成功（事务内插入后 `ROLLBACK`，不落库）；
- `INSERT ... status='bogus'` 被拒：`violates check constraint "ck_audit_logs_status_standard"`（exit 3）；
- 表行数保持 **17**；prod `/health` = **200**。

## 9. 参考

- 账本核对：[verify_prod_ledger.sh](scripts/db/verify_prod_ledger.sh#L1-L76)
- 迁移门禁：[check-migrations.mjs](scripts/check-migrations.mjs)、[check-migration-names.mjs](scripts/check-migration-names.mjs)、[validate.sh](scripts/migration/validate.sh)
- 既有 NULLIF 范式：[20261102210000_fix_tenant_policy_nullif.sql](database/migrations/20261102210000_fix_tenant_policy_nullif.sql#L1-L25)
- 进度台账：[TODO.md](TODO.md#L106)（"prod 实测复核修正（2026-11-04，只读盘点）"）
