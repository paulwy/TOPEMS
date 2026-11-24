# NOT VALID 全量收口：C 类 37 条机器判定表（2026-11-24）

## 一句话结论

37 条“无人工映射”的 NOT VALID 约束，**全部可由机器判定并直接 VALIDATE**，不需要人一条条读代码；需要人拍板的只有 2 个产品/设计问题（audit_logs 是否收窄、financial_reports 双列是否合并），且都不阻塞本轮执行。

执行后全库 NOT VALID 从 **251 → 1**（仅剩 `finance.expenses` 那条要靠 3 行数据清洗）。

## 判定规则（每条都过，缺一即跳过）

| 规则 | 断言内容 | 门槛 |
|---|---|---|
| R1 | 声明值集 == 代码 `pub const DB_VALUES`（逐字面值比对） | AUTO |
| R2 | 声明值集 == 代码枚举 serde 归一集合（该枚举无 DB_VALUES 常量，守卫较弱） | AUTO |
| R3 | 非状态列（`incident_type` / `impact_severity` / `metric`），纯域值集、表空 | AUTO-D |
| R4 | 多列不变量（`status == approval_status`），表空 | AUTO-I |
| R5 | 值集是两套正交词表的并集（生命周期 + 日志结果），与代码枚举一致但模型有缺陷 | AUTO* |
| R6 | 存量有越界值 | 阻断，先清洗 |

判定顺序是：先比“值集 vs 代码枚举”，再查“存量是否越界”，最后才 `VALIDATE`。**“能通过”本身不作为放行理由**——`finance.expenses` 能通过 250 条同类验证，但那 3 行 `pending` 说明值集与代码枚举冲突，必须清洗，不放宽。

## 逐条明细

| # | 约束 | 列 | 声明值数 | 代码背书 | 存量实际值 | 判定 | 备注 |
|---|---|---|---|---|---|---|---|
| 1 | `bi.audit_logs`<br>`ck_audit_logs_status_standard` | `status` | 10 | `AuditLogStatus` | （空表/无数据） | **AUTO*** | 值集 == lib/shared-db AuditLogStatus（生命周期+日志结果 10 值并集）；实际仅写 success/er… |
| 2 | `crm.audit_logs`<br>`ck_audit_logs_status_standard` | `status` | 10 | `AuditLogStatus` | success, error | **AUTO*** | 值集 == lib/shared-db AuditLogStatus（生命周期+日志结果 10 值并集）；实际仅写 success/er… |
| 3 | `erp.audit_logs`<br>`ck_audit_logs_status_standard` | `status` | 10 | `AuditLogStatus` | success, error | **AUTO*** | 值集 == lib/shared-db AuditLogStatus（生命周期+日志结果 10 值并集）；实际仅写 success/er… |
| 4 | `hrm.audit_logs`<br>`ck_audit_logs_status_standard` | `status` | 10 | `AuditLogStatus` | success, error | **AUTO*** | 值集 == lib/shared-db AuditLogStatus（生命周期+日志结果 10 值并集）；实际仅写 success/er… |
| 5 | `iam.audit_logs`<br>`ck_audit_logs_status_standard` | `status` | 10 | `AuditLogStatus` | （空表/无数据） | **AUTO*** | 值集 == lib/shared-db AuditLogStatus（生命周期+日志结果 10 值并集）；实际仅写 success/er… |
| 6 | `mes.audit_logs`<br>`ck_audit_logs_status_standard` | `status` | 10 | `AuditLogStatus` | （空表/无数据） | **AUTO*** | 值集 == lib/shared-db AuditLogStatus（生命周期+日志结果 10 值并集）；实际仅写 success/er… |
| 7 | `plugin_mes.audit_logs`<br>`ck_audit_logs_status_standard` | `status` | 10 | `AuditLogStatus` | （空表/无数据） | **AUTO*** | 值集 == lib/shared-db AuditLogStatus（生命周期+日志结果 10 值并集）；实际仅写 success/er… |
| 8 | `rs.audit_logs`<br>`ck_audit_logs_status_standard` | `status` | 10 | `AuditLogStatus` | success, error | **AUTO*** | 值集 == lib/shared-db AuditLogStatus（生命周期+日志结果 10 值并集）；实际仅写 success/er… |
| 9 | `scm.audit_logs`<br>`ck_audit_logs_status_standard` | `status` | 10 | `AuditLogStatus` | success, error | **AUTO*** | 值集 == lib/shared-db AuditLogStatus（生命周期+日志结果 10 值并集）；实际仅写 success/er… |
| 10 | `shared.audit_logs`<br>`ck_audit_logs_status_standard` | `status` | 10 | `AuditLogStatus` | （空表/无数据） | **AUTO*** | 值集 == lib/shared-db AuditLogStatus（生命周期+日志结果 10 值并集）；实际仅写 success/er… |
| 11 | `srm.audit_logs`<br>`ck_audit_logs_status_standard` | `status` | 10 | `AuditLogStatus` | （空表/无数据） | **AUTO*** | 值集 == lib/shared-db AuditLogStatus（生命周期+日志结果 10 值并集）；实际仅写 success/er… |
| 12 | `wms.audit_logs`<br>`ck_audit_logs_status_standard` | `status` | 10 | `AuditLogStatus` | error, success, not_found | **AUTO*** | 值集 == lib/shared-db AuditLogStatus（生命周期+日志结果 10 值并集）；实际仅写 success/er… |
| 13 | `analytics.report_schedules`<br>`ck_report_schedules_status_standard` | `status` | 4 | `ScheduleStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 14 | `erp.erp_production_orders`<br>`ck_erp_erp_production_orders_status_standard` | `status` | 6 | `ProductionOrderStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 15 | `erp.fin_reconciliations`<br>`ck_erp_fin_reconciliations_status_standard` | `status` | 4 | `FinReconciliationStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 16 | `erp.payables`<br>`ck_erp_payables_status_standard` | `status` | 2 | `PayableStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 17 | `finance.core_finance_periods`<br>`ck_core_finance_periods_status_standard` | `status` | 3 | `PeriodStatus (serde)` | open | **AUTO** | 代码枚举一致，死值多仅因低流量; 枚举无 DB_VALUES 常量，仅 serde 归一，守卫强度较弱 |
| 18 | `finance.payables`<br>`ck_finance_payables_status_standard` | `status` | 4 | `ReceivablePayableStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 19 | `finance.receivables`<br>`ck_finance_receivables_status_standard` | `status` | 4 | `ReceivablePayableStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 20 | `hrm.attendance_records`<br>`ck_hrm_attendance_records_status_standard` | `status` | 4 | `AttendanceStatus` | active | **AUTO** | 枚举含 active（clock-in 兜底值）与 normal 并存，存量仅 active，建议产品收敛口径 |
| 21 | `hrm.candidates`<br>`ck_hrm_candidates_status_standard` | `status` | 7 | `CandidateStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 22 | `hrm.interviews`<br>`ck_hrm_interviews_status_standard` | `status` | 4 | `InterviewStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 23 | `hrm.job_openings`<br>`ck_hrm_job_openings_status_standard` | `status` | 5 | `JobOpeningStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 24 | `hrm.payroll_items`<br>`ck_hrm_payroll_items_status_standard` | `status` | 2 | `PayrollItemStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 25 | `hrm.payroll_runs`<br>`ck_hrm_payroll_runs_status_standard` | `status` | 3 | `PayrollRunStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 26 | `hrm.performance_goals`<br>`ck_hrm_performance_goals_status_standard` | `status` | 4 | `PerformanceGoalStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 27 | `hrm.performance_reviews`<br>`ck_hrm_performance_reviews_status_standard` | `status` | 8 | `PerformanceReviewStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 28 | `hrm.salary_adjustments`<br>`ck_hrm_salary_adjustments_approval_status_standard` | `approval_status` | 3 | `SalaryAdjustmentStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 29 | `hrm.salary_adjustments`<br>`ck_hrm_salary_adjustments_status_standard` | `status` | 3 | `SalaryAdjustmentStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 30 | `qms.quality_inspections`<br>`ck_quality_inspections_status_standard` | `status` | 6 | `QmsInspectionStatus` | pending | **AUTO** | 代码枚举一致，死值多仅因低流量 |
| 31 | `wms.outbound_orders`<br>`ck_outbound_orders_packing_status_standard` | `packing_status` | 3 | `OutboundExecutionStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 32 | `wms.outbound_orders`<br>`ck_outbound_orders_shipping_status_standard` | `shipping_status` | 3 | `OutboundExecutionStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 33 | `wms.stock_take_items`<br>`ck_stock_take_items_adjustment_status_standard` | `adjustment_status` | 2 | `StockTakeAdjustmentStatus` | （空表/无数据） | **AUTO** | 值集 == 代码 DB_VALUES，存量无越界 |
| 34 | `master_data.mdm_sla_configs`<br>`mdm_sla_configs_metric_check` | `metric` | 3 | `— (无枚举)` | （空表/无数据） | **AUTO-D** | 非状态列（域值集），表空，与代码无枚举冲突 |
| 35 | `master_data.mdm_sla_incidents`<br>`mdm_sla_incidents_severity_check` | `impact_severity` | 4 | `— (无枚举)` | （空表/无数据） | **AUTO-D** | 非状态列（域值集），表空，与代码无枚举冲突 |
| 36 | `master_data.mdm_sla_incidents`<br>`mdm_sla_incidents_type_check` | `incident_type` | 4 | `— (无枚举)` | （空表/无数据） | **AUTO-D** | 非状态列（域值集），表空，与代码无枚举冲突 |
| 37 | `finance.financial_reports`<br>`ck_financial_reports_status_pair` | `approval_status,status` | — | `—` | （空表/无数据） | **AUTO-I** | 双列同值不变量：status == approval_status；表空。设计冗余（两列同值），建议后续合并列 |

## 分组解读

- **AUTO（21 条）**：单列 + 代码 `DB_VALUES` 逐值相等 + 存量无越界。这是最干净的一档，可以直接批量跑。
- **AUTO\*（12 条 audit_logs）**：见下方更正，属于“约束忠实复刻了一个坏枚举”，不是脏约束。
- **AUTO-D（3 条 mdm_sla）**：`incident_type` / `impact_severity` / `metric` 根本不是状态列，是 SLA 的域值集；表空、无越界，单独 VALIDATE 即可，不参与状态值集议题。
- **AUTO-I（1 条 financial_reports）**：`CHECK (status = approval_status)` 是跨列不变量，不是值集；表空成立。顺带记一笔：两列长期同值属冗余设计，建议后续合并列（不影响本轮验证）。

## 一处必须更正：audit_logs 不是“模板误贴”

上一轮我把 11 条同名 `ck_audit_logs_status_standard` 判为“模板误贴”，这一轮读了代码，**结论要改**：

```rust
// lib/shared-db/src/audit.rs
pub enum AuditLogStatus { Active, Inactive, Archived, Success, Failure, Failed, Error, Pending, Unknown, NotFound }
pub const DB_VALUES: [&'static str; 10] = [ ... 同 10 值 ... ];
```

DB 约束和代码枚举逐值一致，所以它**不是脏约束**——是共享枚举本身把“生命周期”（active/inactive/archived）和“执行结果”（success/failure/error/not_found…）两套正交词表塞进了一个类型。全库检索 `AuditLogStatus::` 的用法，生命周期那 3 个变体**一次都没被写入**，实际数据只有 `success` / `error`（wms 另有 `not_found`）。

- 所以：**VALIDATE 是安全的**（不会拒绝任何合法写入，只是允许了 8 个死值）。
- 但 validate 会把坏模型固化，收窄要动 `lib/shared-db` + 各模块写入方，属于独立的一次改动。建议顺序：本轮先 validate 拿到护栏，收窄单独立项。

## 断言引擎的一次自检（它确实在干活）

首版 A 脚本把 8 条约束判成“值集冲突”，全是假警报：`PaymentStatus` 同名枚举在两个文件各有一份（`ap_payment_status.rs` 6 值、`settlement_v55.rs` 5 值含 `reversed`），抽取时取错了那份。改为按 `impl` 块做花括号定界后，8 条全部通过。

这件事说明两点：
- 断言比的是**真实字面值**，不是把库里现成的声明抄一遍当期望值；否则永远不会报错。
- **同名枚举是这套代码里的真隐患**：`PaymentStatus`、`Status` 这类名字在多个模块重复，靠名字定位枚举并不可靠。9 条约束（`PaymentStatus` / `RegionStatus` / `TransferStatus` / `ReviewWorkflowStatus` / `ScheduleExecutionStatus` / `ContinuityPlanStatus` / `FailoverStatus` / `RecoveryPlanStatus` / `ReplicationStatus`）因为枚举里没有 `DB_VALUES` 也没有可用字面量，只能退化为“用存量声明”兜底——这 9 条是**唯一没有代码级断言**的，建议后续给这些枚举补 `DB_VALUES`，下一轮就能全量断言。

## 怎么执行

脚本已备好并做过事务内演练（`ok=37 skip=0 bad=0`，NOT VALID 251→214，rollback 还原 251）：

```bash
psql -h /tmp -U air -d topems -v ON_ERROR_STOP=1 \
  -f docs/database/validate-a-class-2026-11-24.sql

psql -h /tmp -U air -d topems -v ON_ERROR_STOP=1 \
  -f docs/database/validate-c-class-2026-11-24.sql
```

两批合计：A 类 `ok=213 bad=0`，C 类 `ok=37 bad=0`，NOT VALID 251 → 1（仅 `finance.expenses`）。

脚本是**断言式**的：逐条检查“约束存在 + 未验证 + 字面值集 == 期望值集”，任一不满足就 `SKIP` 并计数，`FAIL` 走异常分支不中断整批。不会出现“批量跑完等于批量盖章”。

## 收口后的账

| 批次 | 条数 | 说明 |
|---|---|---|
| A 类（有映射） | 213 | 值集 == 代码枚举，白名单批量 VALIDATE |
| C 类（本文） | 37 | 机器判定全部通过（含 3 条域检查、1 条不变量） |
| 脏数据 | 1 | `finance.expenses`：3 行 `pending` → 清洗为 `submitted` 后再验证 |
| **合计可验证** | **250 / 251** | 剩 1 条待清洗 |
| 参考库 | 1 | `hrm.contracts`，可直接 VALIDATE |

## 拍板结论（已按此执行）

**1. audit_logs：先按 10 值 VALIDATE，收窄单独立项。**
理由：现在 12 张审计表是零护栏，任何字符串都能写进去；10 值超集只是“允许了 8 个死值”，不会拒绝合法写入，风险等级远低于无约束。收窄要动 `lib/shared-db` 共享枚举 + 12 个模块的写入方 + 前端色板，属跨模块改造，不该捆进这次收口；且收窄后重新 VALIDATE 成本很低（约束可 DROP 重建），不存在“改不回来”的问题。

**2. financial_reports：不合并双列，按不变量 VALIDATE。**
理由：`status == approval_status` 已由约束保证一致，合并列动的是 API 契约、前端表单和报表口径，收益只是少一列冗余，成本与风险不对等。表为空，没有历史数据债，将来真要合并反而更轻。列入技术债，不阻塞。

**3. finance.expenses：清洗 3 行 + 修默认值，再 VALIDATE。**
理由：3 行 `pending` 全是 E2E 造数标记（`EXP2099` / `PROBE-2099` / `VERIFY-2099`），代码注释明确 `pending` 是历史别名、归一为 `submitted`，所以清洗是“修正数据”，不是“放宽约束”。更关键的连带问题：列默认值还是 `'pending'`，约束一旦 VALIDATE，**默认值自己就会违反约束**——任何省略 status 的 INSERT 都会失败。拍板一并修成 `'draft'`（与 `ExpenseStatus::DEFAULT` 一致），并补了可复现迁移，否则重建库会把这个坑带回来。

**4. 参考库那 1 条一并 VALIDATE。**
理由：参考库是 CI 比对基线，留一条 NOT VALID 会让“基线是否干净”这件事永远有例外，后续再排查时又要重新判定一次。

**5. 不把 250 条做成一个 bulk 迁移。**
理由：生产端的约束集合与本地不同（prod-only 418 条），把本地 250 条写进迁移，在 prod 上要么大面积 skip、要么在有脏数据时阻断部署；两种都不好。改为“带断言的维护脚本 + 判定表”固化，可重放、可审计，且不会在别的环境上假装成功。

## 执行记录（2026-11-24）

| 步骤 | 结果 |
|---|---|
| A 类批量 VALIDATE | `ok=213 skip=0 bad=0` |
| C 类批量 VALIDATE | `ok=37 skip=0 bad=0` |
| `finance.expenses` 3 行清洗 | `pending -> submitted`，3 行；原值已备份（EXP2099 / PROBE-2099 / VERIFY-2099） |
| `finance.expenses.status` 默认值 | `'pending' -> 'draft'`（迁移 `20261124110000`，本地 + 参考库各执行，重复执行幂等） |
| `ck_expenses_status_standard` | VALIDATE 通过 |
| 参考库 `ck_hrm_contracts_status_standard` | VALIDATE 通过 |
| 本地 NOT VALID | **251 → 0** |
| 参考库 NOT VALID | **1 → 0** |
| `validate.sh` | 857 文件 / 0 errors |
| `gen-manifest.sh --check` | 无漂移 |

## 仍未处理（已排序，不阻塞）

1. **audit_logs 收窄**：`AuditLogStatus` 拆成“结果”单维（success / failure / error / pending），生命周期 3 值删除，同步 12 个模块写入方与前端色板，最后重建约束。
2. **9 个枚举补 `DB_VALUES`**（`PaymentStatus` / `RegionStatus` / `TransferStatus` / `ReviewWorkflowStatus` / `ScheduleExecutionStatus` / `ContinuityPlanStatus` / `FailoverStatus` / `RecoveryPlanStatus` / `ReplicationStatus`）：补齐后这 9 条约束才有代码级断言，否则只能靠存量声明兜底。
3. **financial_reports 双列合并**：技术债，随报表 API 改造一起做。
4. **映射台账回写**：`status-db-check-mappings.json` 301 → 338 条，把这次判定的 37 条登记进去，下次同类不再重复判定。

## 附：原两个待拍板项

1. **audit_logs 值集**：本轮按 10 值 validate（与代码一致），还是先收窄成 `success/error/pending`（要改 `lib/shared-db` 与各写入方）再 validate？
2. **financial_reports 双列**：`status` 与 `approval_status` 长期同值，本轮按不变量 validate；是否另开一项把两列合并？

另外建议：本轮结论回写 `docs/database/status-db-check-mappings.json`（301 → 338 条），下次同类约束直接进 A 类，不再重复判定。

---

## 四项收口结果（2026-11-24，接上文）

上游「未处理」四项已全部落地，逐条记录如下（先前的“仍未处理”清单据此作废）。

### 1. audit_logs 状态收窄

- **问题**：`AuditLogStatus` 把两套正交词表塞进一个枚举——生命周期 `active/inactive/archived` + 执行结果 `success/failure/failed/error/pending/unknown/not_found`。全库检索确认生命周期 3 个变体**从未被任何写入方使用**，`failure` 也只是历史别名。
- **代码**：`lib/shared-db/src/audit.rs` 收窄为 6 个结果态（`success/failed/error/pending/unknown/not_found`），`as_db_str`/`from_db_str` 同步删除生命周期分支，`failure` 不再接受；`DB_VALUES` 与实际一致。
- **DB**：迁移 `20261124120000_audit_logs_status_narrow.sql`，对 13 个 schema 的 `ck_audit_logs_status_standard` 做 DROP + ADD NOT VALID + VALIDATE；定义已是收窄口径的跳过；无该约束名的 schema 跳过（本迁移只收窄、不新建）。
- **fail-closed**：某 schema 存在值集外历史行则 `RAISE EXCEPTION` 中止，不静默保留宽约束。
- **结果**：本地 13/13 收窄且 `convalidated=true`；参考库仅 `crm.audit_logs` 有此约束，已同步收窄。
- **往返**：事务内回滚脚本 → 13 条恢复 10 值并集 → 重放迁移 → 13 条收窄且全部 VALIDATE，事务回滚后库不变。
- **测试**：`cargo test -p topems-shared-db --lib` 182 passed。

### 2. 枚举补 `DB_VALUES`（9 个 + 2 个补漏）

- 新增常量：`PaymentStatus`（ap）、`ScheduleExecutionStatus`、`ReviewWorkflowStatus`、`TransferStatus`、`RecoveryPlanStatus`、`ContinuityPlanStatus`、`RegionStatus`、`ReplicationStatus`、`FailoverStatus`；另补 `settlement_v55::PaymentStatus`（同名双定义，此前漏）与 `AuditLogStatus`。
- **关键点**：光有常量只是“写进代码”，没有断言等于没做。因此新增契约文件 `docs/database/status-enum-db-contract.json`（11 条：file / enum / table / column / constraint / values）与门禁 `scripts/ci/check-status-enum-contract.mjs`：
  - 逐条在 `impl <Enum> {` 块内抽 `pub const DB_VALUES`，与契约值集**双向比对**（无缺、无多）；
  - 校验值集为小写 snake_case、无重复；`audit_logs` 条目必须列全 13 个 schema；
  - 命中不一致即 exit 1。
- **验证**：`OK 11/11 条契约逐条一致`；负例注入（给契约塞一个 `bogus`）确认 `FAIL` 且 exit 1，恢复后回到 11/11。
- **接线**：`lefthook.yml` 新增 `status-enum-contract` 钩子，改常量/契约/相关 Rust 文件即触发。
- **测试**：finance 1133 / master-data 467 / shared-db 182 全通过。

### 3. financial_reports 双列合并

- **问题**：`status` 与 `approval_status` 取值完全同值，靠 `ck_financial_reports_status_pair` 维持；写入口双写、读侧只为回填 API 字段，没有任何“审批态 ≠ 报表态”的合法场景。
- **DB**：迁移 `20261124130000_financial_reports_single_status.sql` 删除 `approval_status` 列；依赖该列的 `ck_financial_reports_status_pair` 与 `ck_financial_reports_approval_status_standard` 随列自动删除（不再单独 DROP CONSTRAINT，避免多发一条破坏性语句）。
- **代码**：`financial_reports.rs` 13 处 SQL 全部单列化（INSERT / RETURNING / 3 处 SELECT / 5 处 UPDATE 去掉列与 `AND approval_status ...` 谓词）；API 响应仍返回 `approval_status` 字段，值取自 `status`，**前端 0 改动**。
- **安全**：前置断言存在 `status <> approval_status` 行则 `RAISE EXCEPTION`；列不存在则跳过（幂等）。迁移带破坏性豁免标记（ticket `B255-FIN-REPORT-20261124`，`rows-at-review=0`，expires 2027-05-20）。
- **结果**：本地与参考库均删列；重复执行跳过。
- **往返**：事务内回滚（重加列 + 回填 `approval_status = status` + 重建 2 条 CHECK）→ 重放迁移（删列）→ 列数 1→0，事务回滚后库不变。

### 4. 映射台账回写（301 → 324，不是 338）

- **实际**：`status-db-check-mappings.json` 从 301 条增至 **319 条 mappings + 4 条 `non_enum_checks` = 323 条记录**（320 条里另有 1 条 `approval_status` 映射随后随列删除，见“台账自检”）。
- **338 的算术**：`301 + 33 + 4 = 338` 是把 37 条判定全部当成“新增”算出来的；实际 33 条里有 **14 条原本已在台账**，缺的是 `candidate` 指针（早前误判为“无映射”），只新增 19 条。所以 338 不是可达目标；收尾后正确基数是 323（319 mappings + 4 non_enum）。
- **覆盖校验**（机器核对，不靠印象）：把 `/tmp/final_rows.json` 的 37 条判定按 `table + column` 与台账比对，**37/37 命中，0 遗漏**。
- **台账同步**：`financial_reports` 的 `ck_financial_reports_status_pair` 条目补 `resolution: merged_2026-11-24` 与合并说明，避免下次又被当作待办。


### 台账自检（2026-11-24，机器核对而非抽查）

不再凭“台账有这条”就认为约束存在，而是把台账逐条拿去和本地 `pg_constraint` 对账：

| 检查 | 结果 |
|---|---|
| 台账总数 | 319 mappings + 4 `non_enum_checks` |
| 带表列坐标（可落约束） | 255 条 |
| 能在本地约束里定位且已 VALIDATE | **254 条** |
| 无表列坐标（进程内状态/无独立列） | 64 条，按设计不适用列级 CHECK |
| 唯一未定位项 | `master_data.mdm_workflows.steps(jsonb)`：步骤状态嵌在 jsonb 数组里，`persisted=false`，列级 CHECK 无法表达（保留说明，不是缺口） |

自检过程中发现并修掉两处真实问题：

1. **陈旧映射**：`FinancialReportStatus → financial_reports.approval_status` 这行在 B255 删列后已失效，属于“台账说有、DB 里没有”。已删除该行，并在 `status` 那行补 B255 合并说明。
2. **真实缺口**：`crm.customer_finance.risklevel` 此前只有候选 SQL、没有约束。补迁移 `20261124140000`（`risklevel IN (low, medium, high, critical)`，前置断言值集外即中止，ADD NOT VALID + VALIDATE），本地与参考库均 `convalidated=true`；台账 `candidate` 由 SQL 文档改为真实约束名，契约文件同步增至 12 条（`check-status-enum-contract` 12/12 通过）。

### 本轮门禁汇总

| 项目 | 结果 |
|---|---|
| `scripts/migration/validate.sh` | 859 文件 / Checksum 0 / Drift 0 / Errors 0（Warnings 4 为既存） |
| `gen-manifest.sh --check` | 无漂移（registered 252 / disk 845 / mismatch 0） |
| `check-destructive-sql.mjs` | PASS（新增 B255 已带豁免标记） |
| `dump-status-checks.mjs --check`（参考库） | PASS（35 CHECK / 5 enum / 681 uncovered） |
| `check-status-enum-contract.mjs` | PASS 11/11 |
| `dump-status-code-inventory.mjs --check --strict-palette` | PASS（315 枚举 / 241 值 / 色板缺口 0） |
| 本地 NOT VALID | 0 |
| 参考库 NOT VALID | 0 |

### 仍未处理（本轮收口后剩余）

1. 全部改动**未提交**；仓库另有 B253 并发未提交文件（`svc/rd/*`、`demo/`、`docs/database/rd-rs-project-status-*`），需按文件挑拣后再提。
2. `audit_logs` 在参考库只有 `crm` 一个 schema 有该约束（基线快照如此），本地 13 schema 的差异属历史演进；本轮迁移按“只收窄已有约束”处理，未新建。
3. 生产端 `audit_logs` 若存在 `active/archived` 历史行，B254 会在部署时 `RAISE EXCEPTION` 阻断——这是有意的 fail-closed，需先按 `UPDATE ... SET status='unknown'` 口径清洗（本轮未授权改 prod）。


### 运行期探针（2026-11-24，事务内回滚，不落库）

只验证“约束已生效”不够，还要验证“行为符合预期”：

| 探针 | 结果 |
|---|---|
| 13 个 schema 各插一行 `status='active'` | **13/13 被 `ck_audit_logs_status_standard` 拒绝**（bi/crm/erp/hrm/iam/mes/plugin_mes/public/rs/scm/shared/srm/wms 逐一验证） |
| `public.audit_logs` 插 `status='success'` | 接受（合法值未被误伤） |
| `finance.financial_reports` 只写 `status` 插一行 | 接受；`\d` 确认列清单已无 `approval_status`，仅 `status` 与 `approval_comment` |
| 本地 `audit_logs` 全量扫描（55,008 行） | `outside_narrow_set = 0`，13 个 schema 无历史生命周期值 |
