# 生产库治理实测基线与 P1–P5 分批执行方案（2026-11-04）

> 对象：`topems_prod` @ `192.168.110.115`（PostgreSQL 17.11，1402 表）。
> 对照基线：同实例 `topems_test`（1328 表）。
> 口径：全部数字来自 `pg_catalog` **只读**实测；**prod 未执行任何 DDL/DML**，本文中所有迁移均为"已生成 + 本地临时库验证通过"，prod 一律标 **待执行（需窗口）**。

## 1. 结论摘要

| 项 | 状态 |
|---|---|
| 只读盘点 | ✅ 完成（可连库、可 SELECT，不可写） |
| P1 类型安全加宽（17 列） | 迁移已生成；本地临时库双跑通过；**prod 待执行（需窗口）** |
| P2 NULLIF 统一（29 条 master_data 策略） | 迁移已生成；本地临时库双跑通过（29→29、纯文本比较 0）；**prod 待执行（需窗口）** |
| P3 约束补齐（5 PK / 48 UNIQUE / 45 FK） | 三个迁移已生成；本地临时库双跑通过（pk=5/uq=48/fk=45/notvalid=0）；**prod 待执行（需窗口）**。prod 实测 10 条缺 PK 中 5 条属 `schema_defense_ledger` 运行时自建表，不纳入迁移 |
| P4 反向表收敛（74 张，22 个 FK 依赖） | **待业务确认**（不可自动执行） |
| P5 时间戳 + status_standard + 账本 | 迁移已生成；本地验证通过；**prod 待执行（需窗口）** |

**核心结论：账本 `success = true` ≠ DDL 到位。** prod 账本已登记 `20261103000002`（success），但 3 条 `status_standard` CHECK 仍存在；`db04-prod` 头部声称已执行，实测仍残留 5 个 naive timestamp 列。治理核验必须落到 `pg_catalog`，禁止仅凭 `_sqlx_migrations` 判定。

## 2. prod 实测基线（2026-11-04）

| 维度 | 实测值 | 说明 |
|---|---|---|
| 表数量 | prod 1402 / test 1328 | 反向表（test 有 prod 无）确认 **74** |
| 迁移账本 | prod **549** 条 / 仓库文件 **565** 个 | **17 个版本未登记**（DB-04-prod～DB-19） |
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

## 4. 已完成迁移清单（均已生成，prod 未执行）

| 批次 | 文件 | 行数 | 内容 | 本地验证 |
|---|---|---|---|---|
| P1 | [20261104090000_p1_prod_type_widen_17cols.sql](database/migrations/20261104090000_p1_prod_type_widen_17cols.sql#L1-L294) | 294 | 17 列安全加宽（16 列 varchar→text + 1 列 numeric(15,2)→numeric(18,4)）；逐列 `format_type` 守卫 | scratch 库 `p1_dryrun_tmp` 双跑 exit 0；5 列 timestamptz 校验、行数不变 |
| P5a | [20261104100000_p5a_prod_naive_timestamps_5cols.sql](database/migrations/20261104100000_p5a_prod_naive_timestamps_5cols.sql#L1-L109) | 109 | 5 列 naive→timestamptz，`USING col AT TIME ZONE 'UTC'` | scratch 双跑 exit 0；UTC→+08 抽样正确 |
| P5b | [20261104110000_p5b_prod_status_standard_checks_3.sql](database/migrations/20261104110000_p5b_prod_status_standard_checks_3.sql#L1-L49) | 49 | 3 条实测名 CHECK（`ck_audit_logs_status_standard` / `ck_external_erp_sync_logs_status_standard` / `ck_inquiries_status_standard`） | scratch 双跑 exit 0；残留计数 0 |
| P2 | [20261104120000_p2_nullif_29policies.sql](database/migrations/20261104120000_p2_nullif_29policies.sql#L1-L403) | 403 | 29 个 DO 守卫块；按 `pg_policies` 原始表达式逐条 NULLIF 包装，成对 `USING ... WITH CHECK ...` | scratch `p2_dryrun_tmp` 双跑：`policies=29 / textcmp=0 / rls_tables=29 / nullif=29` |
| P3-PK | [20261104130000_p3_pk_5.sql](database/migrations/20261104130000_p3_pk_5.sql#L1-L96) | 96 | 5 个 PK；NULL/重复前置校验，不满足则 `RAISE NOTICE` 跳过。排除 5 张 `*.schema_defense_ledger`（运行时 `CREATE IF NOT EXISTS` 自建表，不在迁移链）；其历史库主键改由 [ensure_ledger_table](lib/shared-db/src/schema.rs#L207-L234) 幂等守卫补齐 | scratch 双跑：pk=5；guard 双跑无错、NULL 场景降级 WARNING |
| P3-UQ | [20261104140000_p3_unique_48.sql](database/migrations/20261104140000_p3_unique_48.sql#L1-L684) | 684 | 48 个 UNIQUE；`to_regclass` 守卫 + `GROUP BY ... HAVING count(*)>1` 前置校验 | scratch 双跑：uq=48（另有 29 个 parent 唯一键用于支撑 FK 验证） |
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
2. **296 项类型差异中的 103 项人工项**（prod 更短 varchar 13 / numeric 混合 62 / uuid 5 / date 4 等）：需逐表契约判断方向，本批只做安全加宽。
3. **17 个未登记迁移版本**（DB-04-prod～DB-19）：其中 `db08` 无守卫，是否补登账本取决于是否改写后重放；不建议手工 INSERT checksum。
4. **`crm.audit_logs` 值域**：prod CHECK 不含 `'error'`，而应用真实写入 `'error'`（test 侧 11 条）；P5b 落的是 prod 实测 CHECK，是否扩值域需业务拍板。
5. **索引批次**：prod 实缺 10 个（反向表 pkey），随 P4 收敛；其余库（topems 1137）另行性能批次。

## 7. 参考

- 账本核对：[verify_prod_ledger.sh](scripts/db/verify_prod_ledger.sh#L1-L76)
- 迁移门禁：[check-migrations.mjs](scripts/check-migrations.mjs)、[check-migration-names.mjs](scripts/check-migration-names.mjs)、[validate.sh](scripts/migration/validate.sh)
- 既有 NULLIF 范式：[20261102210000_fix_tenant_policy_nullif.sql](database/migrations/20261102210000_fix_tenant_policy_nullif.sql#L1-L25)
- 进度台账：[TODO.md](TODO.md#L106)（"prod 实测复核修正（2026-11-04，只读盘点）"）
