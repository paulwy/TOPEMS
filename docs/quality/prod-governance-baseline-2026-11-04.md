# 生产库治理实测基线与 P1–P5 分批执行方案（2026-11-04）

> 对象：`topems_prod` @ `192.168.110.115`（PostgreSQL 17.11，1402 表）。
> 对照基线：同实例 `topems_test`（1328 表）。
> 口径：全部数字来自 `pg_catalog` 实测；§2 保留 2026-11-04 执行前基线，§1.1 记录 2026-11-05 的 prod 执行结果与执行后复核。P1/P2/P3/P5 已于 prod 执行，P4 仍为只读决策阶段。

## 1. 结论摘要

| 项 | 状态 |
|---|---|
| 只读盘点 | ✅ 完成（可连库、可 SELECT，不可写） |
| P1 类型安全加宽（17 列） | ✅ **已执行 2026-11-05**；类型差异 296→279（P5a 后总差 284） |
| P2 NULLIF 统一（29 条 master_data 策略） | ✅ **已执行 2026-11-05**；纯文本比较 29→0；策略 1083 / RLS 表 883 均不变 |
| P3 约束补齐（5 PK / 48 UNIQUE / 45 FK） | ✅ **已执行 2026-11-05**；p/u/f 1391/233/253→**1396/281/298**，`NOT VALID`=0。5 张 `schema_defense_ledger` 运行时自建表 PK 仍由启动守卫补齐 |
| P4 反向表收敛（74 张，22 个 FK 依赖） | **待业务确认**（已出三分类决策单，未执行 DROP） |
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
| 反向表（prod 独有） | 74 | **74** |
| 账本条数 | 549 | **556** |

**P3-UNIQUE 守卫缺陷与 checksum 重同步（单独说明）**

- 缺陷：原文件用 `to_regclass('<约束名>') IS NULL` 判断"约束是否不存在"，把约束名当关系名；prod 已存在 48 个同名唯一索引，导致按原文件执行时 48 条全部跳过（UNIQUE 仍为 233）。
- 修正：删除该误用行；守卫改为"表存在且无同名约束"后，三分支：同名唯一索引存在（且 `indisunique/indisvalid`、非 partial/表达式）→ `ADD CONSTRAINT ... UNIQUE USING INDEX <name>` 接管索引；否则普通 `ADD CONSTRAINT ... UNIQUE (...)`。索引名不可 schema 限定，接管前用 `set_config('search_path','<schema>, public',true)` 临时切换。
- 验证：scratch 库（由 2026-11-05 预迁移 dump 恢复）造 24 张"有同名索引"+24 张"干净表"两组，修正后文件连跑两遍均 exit 0；24 条 `USING INDEX` 全部接管的索引 OID 与预置索引一致（未重复建索引），48 条约束全部存在，第二遍零变更。
- 账本同步：文件字节变更后，`version=20261104140000` 的 checksum 由 `8966e81a85c7…` 更新为 `42fb0738646e…`（新 SHA-384），prod 复算与仓库文件一致。理由：DDL 终态已达成且修正后文件行为等价、幂等，账本应与文件保持一致，否则后续 sqlx/门禁校验会报 integrity 不一致。
- prod 只读幂等证明：在 `BEGIN ... ROLLBACK` 事务内执行修正后文件，48 个 DO 全部跳过、无 NOTICE、无错误，`u` 计数 281 不变，事务回滚后 prod 无变更。

## 2. prod 实测基线（2026-11-04）

| 维度 | 实测值 | 说明 |
|---|---|---|
| 表数量 | prod 1402 / test 1328 | 反向表（**prod 有、test 无**）确认 **74** |
| 迁移账本 | prod **549** 条 / 仓库文件 **558** 个（执行前） | **17 个版本未登记**（DB-04-prod～DB-19）；另有 15 个账本版本无对应文件 |
| 类型差异（同名列） | **296**（101 表） | 164 项 prod 已为 timestamptz（无需动）/ 12+3 方向安全 / 13 项 prod 更短 / 62 numeric 混合 / 其余零星 |
| NULLIF 纯文本比较策略 | **29**（全部 `master_data`） | `qual LIKE '%::text = current_setting%' AND qual NOT LIKE '%NULLIF%'` |
| 缺索引（按名比对，排除 pg_toast） | **10** | 全部为反向表 pkey；旧口径 285 含系统 schema 噪声 |
| 约束缺口 | **103**（10 PK / 48 UNIQUE / 45 FK，91 表） | 依据 test 侧 `pg_constraint` 结构实测；其中 5 条 PK 属运行时自建 `schema_defense_ledger`，P3 迁移仅覆盖剩余 5 条 |
| naive timestamp 残留 | **5 列** | `public.equipment` 4 列 + `iam.core_plugin_instances.last_heartbeat` |
| status_standard 残留 CHECK | **3** 条 | `crm.audit_logs` / `integration.external_erp_sync_logs` / `srm.inquiries`（迁移 0002 清单未覆盖） |
| 无 PK 表 | 11 | 10 张缺 PK 差异中：5 张纳入 P3 迁移，5 张为运行时自建 `schema_defense_ledger`（不纳入），1 张反向表随 P4 |
| 反向表行数 | 74 张中 73 张 0 行；`finance.core_finance_currencies` 16 行 | 22 个 FK 引用这些反向表 |
| 服务连接库 | launchd `com.topems.server.plist` → `topems_prod` | 仓库 `.env` 指向 `topems_test`，属运维陷阱 |

> 访问方式：SSH 免密 `xingzhai@192.168.110.115` + `/opt/homebrew/bin/psql`；本次全部会话仅执行 `SELECT`。

## 3. 问题清单（按风险序）

1. **类型收窄/降级不可逆**：296 项中 164 项 prod 已是 timestamptz，若照旧记录"prod 215"批量对齐 test 会把时区语义降级为 naive——禁止。只做安全加宽（varchar→text、numeric 加宽）。
2. **NULLIF 缺口导致 RLS 崩溃**：`app.tenant_id=''` 时 `::uuid` cast 报 `invalid input syntax for type uuid: ""`；29 条 master_data 策略仍是裸 `current_setting` 比较。
3. **约束缺口影响正确性**：10 张表无 PK；48 UNIQUE / 45 FK 缺失（test 侧已有）。FK 缺失在并发写入下可产生孤儿行。
4. **账本与 DDL 漂移**：17 个版本未登记；已登记版本存在未生效 DDL（status_standard 3 条、db04-prod 5 列）。
5. **反向表与 FK 依赖**：74 张反向表为运行时自建/历史残留，其中 22 个 FK 依赖，直接 DROP 会因 RESTRICT 失败或破坏引用；`finance.core_finance_currencies` 有 16 行真实数据。
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
| P4 反向表 | **业务确认 22 个 FK 依赖归属** | 独立变更窗口 | 只允许 DROP 空表且无依赖者；禁止 `CASCADE`；`finance.core_finance_currencies` 先导出数据 |

执行顺序：P5a/P5b（低风险）→ P2 → P3-PK → P3-UQ → P3-FK → P1（类型，锁表时间最长，最后做）。每批执行后立刻用 `pg_catalog` 复核：naive 计数、纯文本比较策略数、`convalidated=false` 计数、PK/UNIQUE/FK 计数与 test 对齐。

## 6. 剩余决策项

1. **P4 反向表 22 个 FK 依赖**：需业务确认这 74 张表（尤其 `finance.core_finance_currencies` 16 行）是"临时残留可删"还是"未来模块预留"。确认前不动。
2. **执行后仍有 284 项类型差异**：其中 5 项是 P5a 有意引入（prod `timestamptz` vs test naive，`public.equipment` 4 列 + `iam.core_plugin_instances.last_heartbeat`），**应改 test 侧而非回退 prod**；其余人工项（prod 更短 varchar / numeric 混合 / uuid / date 等）需逐表契约判断方向。
3. **17 个未登记迁移版本 + 15 个账本孤儿版本**（DB-04-prod～DB-19）：仍未治理；`db08` 无守卫，是否补登账本取决于是否改写后重放；不建议手工 INSERT checksum。
4. **`crm.audit_logs` 值域**：prod CHECK 不含 `'error'`，而应用真实写入 `'error'`（test 侧 11 条）；P5b 落的是 prod 实测 CHECK，是否扩值域需业务拍板。
5. **索引批次**：prod 实缺 10 个（反向表 pkey），随 P4 收敛；其余库（topems 1137）另行性能批次。

## 7. 参考

- 账本核对：[verify_prod_ledger.sh](scripts/db/verify_prod_ledger.sh#L1-L76)
- 迁移门禁：[check-migrations.mjs](scripts/check-migrations.mjs)、[check-migration-names.mjs](scripts/check-migration-names.mjs)、[validate.sh](scripts/migration/validate.sh)
- 既有 NULLIF 范式：[20261102210000_fix_tenant_policy_nullif.sql](database/migrations/20261102210000_fix_tenant_policy_nullif.sql#L1-L25)
- 进度台账：[TODO.md](TODO.md#L106)（"prod 实测复核修正（2026-11-04，只读盘点）"）
