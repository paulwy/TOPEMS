# B161 · EHS 旧约束标准化 + SCM 主数据引用状态（2026-11-22）

## EHS 旧约束统一
文件：`docs/database/ehs-legacy-status-check-standardize-2026-11-22.sql`

将 11 张 EHS 表的 `*_status_check` 旧命名约束替换为 `ck_*_status_standard`，值集不变，全部 `NOT VALID`：

| 表 | 枚举 | 值集 |
| --- | --- | --- |
| `ehs.qa_ehs_risks` | `RiskStatus` | identified / assessed / controlled |
| `ehs.qa_ehs_hazards` | `HazardStatus` | reported / pending_approval / rectifying / pending_verification / verified / closed / rejected / resolved |
| `ehs.qa_ehs_hazard_rectifications` | `RectificationStatus` | pending / in_progress / submitted |
| `ehs.qa_ehs_accidents` | `AccidentStatus` | reported / closed |
| `ehs.qa_ehs_drill_plans` | `DrillPlanStatus` | planned / completed / cancelled |
| `ehs.qa_ehs_drill_records` | `DrillRecordStatus` | in_progress / completed / cancelled |
| `ehs.qa_ehs_risk_controls` | `RiskControlStatus` | active / completed |
| `ehs.qa_ehs_investigations` | `InvestigationStatus` | in_progress / completed |
| `ehs.qa_ehs_treatments` | `TreatmentStatus` | in_progress / completed |
| `ehs.qa_ehs_treatment_actions` | `TreatmentActionStatus` | pending / completed |
| `ehs.qa_ehs_incident_actions` | `IncidentActionStatus` | pending / in_progress / completed / verified |

代码侧这些入口早已绑定对应枚举，本次只做库端约束命名与目录口径对齐。执行后 `ehs` schema 旧 `*_status_check` 约束为 **0**，标准约束 **27**。

拦截验证：9 张有数据表各取一行执行 `status='bogus'`，全部命中对应 `ck_*_status_standard` 并被拒绝。`qa_ehs_treatments`、`qa_ehs_treatment_actions` 本地为空，无法做行级拦截，只验证约束定义。

## SCM 主数据引用
此前发现一个真实缺口：`scm.scm_master_data_refs.status` 无库端约束；代码在 `MasterDataAction::Deleted` 时会写 `deleted`，而 public 镜像表只有 `active / inactive / archived`，一旦落到同名表会被挡。

- 新增 `svc/scm/src/modules/master_data_ref_status.rs`：`MasterDataRefStatus`（active / inactive / deleted，默认 active），`from_action` 与 `from_db_str` 同源，含单测
- `svc/scm/src/event_handlers/mod.rs` 的供应商/物料主数据事件改为枚举 `from_action`，写入前取 `as_db_str()`
- 候选 `docs/database/scm-master-data-ref-status-check-candidates-2026-11-22.sql`：`ck_scm_master_data_refs_status_standard`，三值，`NOT VALID`

存量 644 行（active 636 / deleted 8）全部在集合内；`status='bogus'` UPDATE 被该约束拦截。

## 刷新结果
- catalog：**333 条状态 CHECK / 5 个 PG ENUM / 389 个无约束状态列**
- 盘点：**221 个 Rust 枚举 / 203 个值 / 59 个不在 DB CHECK / 214 个前端键 / 色板缺口 0**
- 缺口队列：**45 个枚举 / 59 个值，全部 `internal_state`**
- 前端键不在 DB CHECK：**70**
- 映射：共 **189 条**

## 门禁
- `cargo clippy -p topems-scm --all-targets -- -D warnings`：PASS
- `cargo test -p topems-scm --lib`：344 passed / 0 failed
- catalog / inventory / queue 的 `--check`：PASS
- request-txn / scope-api / txn-write-non2xx：见提交前记录

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。生产发布需执行候选并按窗口 `VALIDATE`。
