# W7-B6a · qms 核心质量闭环写路径租户化（2026-11-12）

## 0. 结论

`quality_issue` / `eight_d` / `quality_inspection` / `corrective_action` 四个文件共 **36 条写路由**及其子表完成改造：写作用域统一为 `require_tenant` + `state.db.scope_for_tenant(t)`，子表全部与主表同事务，删除类 0 行 → 404、状态类 0 行 → 409。副本矩阵 80 项全绿，门禁全绿，生产短窗口换二进制成功（health 200），生产复验 17 项全绿且库内零残留。

| 项 | 值 |
|---|---|
| 提交 1 | `70101610c` refactor(qms): 质量问题写路径改 require_tenant 与作用域事务 |
| 提交 2 | `899e4bfb8` refactor(qms): 8D 写路径改 require_tenant 并事务化七处审计 |
| 提交 3 | `f3f2ad52a` refactor(qms): 检验写路径改 require_tenant 并事务化结果/审计 |
| 提交 4 | `ebac4155a` fix(qms): 整改措施写路径改作用域并事务化明细 |
| 远端 main | `ebac4155a2c32a80d99aa79ebd87fccb8dd04875`（`git ls-remote origin main` 实测） |
| 二进制 HEAD | `ebac4155a`（release 构建 02:08:53） |
| 新二进制 sha256 | `14a101751db114febdc6d37bcc9e842fec95fbf6fe7401b0776f4cf0afb1e4d7` |
| 旧二进制 sha256 | `28991521afbf6aa0e11e8e5568f2047ec0405c0224c8284b8bbee92b9e882c97` |
| 回滚备份 | `~/topems/bin/topems-server.bak-20261112-b6a` |
| 迁移 | 无 |

## 1. 范围（36 条写路由）

| 文件 | 条数 | 路由 |
|---|---|---|
| [quality_issue.rs](file:///Users/air/TOPEMS/svc/qms/src/modules/quality_issue.rs) | 10 | create / update / delete / resolve / approval/start / approval/approve / approval/reject / approve / reject / cancel |
| [eight_d.rs](file:///Users/air/TOPEMS/svc/qms/src/modules/eight_d.rs) | 13 | create / update / delete / d1 / d3 / d4 / d5 / d6 / d7 / close / approve / close-approval / cancel |
| [quality_inspection.rs](file:///Users/air/TOPEMS/svc/qms/src/modules/quality_inspection.rs) | 9 | create / update / delete / assign / submit / audit / rework / approve / reject |
| [corrective_action.rs](file:///Users/air/TOPEMS/svc/qms/src/modules/corrective_action.rs) | 4 | create / update / complete / delete |

子表：`qa_eightd_audit_logs`、`qa_inspection_results`、`qa_inspection_audits`、`qa_corrective_action_items`、`qa_approval_events`。

## 2. 六条裁决落地

1. **submit_result**：已改 `require_tenant`，服务身份带 `x-tenant-id` 可写（副本与生产均实测 200 且 `tenant_id` 等于头）。
2. **同域引用校验（400）**：`related_inspection_id`（质量检查）、`related_issue_id`（8D）、`standard_id`（检验）、`issue_id`（整改措施）在写入前校验「存在 + 同租户 + 未删除」，不存在或跨租户 → 400；8 个用例实测全 400 且零写入。`product_id` 属跨域主数据（pdm/mdm），本批不引跨域依赖，已在 [quality_inspection.rs](file:///Users/air/TOPEMS/svc/qms/src/modules/quality_inspection.rs#L167) 与 [同文件更新路径](file:///Users/air/TOPEMS/svc/qms/src/modules/quality_inspection.rs#L311) 明确标注 **“当前未校验属主”**。
3. **子表事务化**：8D 七处步骤审计、`submit_result` 的 results/audits、`create_action` 的 items、`qa_approval_events` 全部与主表共用同一 `ScopedTxn`，任一步 `execute` 失败立即返回 500，scope drop 整体回滚；代码中已无 `let _ = ...execute`（grep 0 命中）。
4. **服务身份权限**：qms 路由只挂 `require_module_access("qms")`，服务身份持 `qms:write` 未被 403，**未发生降级**；服务身份无租户头 → 400 由 `require_tenant` 产生，非权限拒绝。
5. **start_issue_approval**：本批仅 `require_tenant` + 读作用域取行（不存在 → 404）；异步 workflow 未透传租户，已留 TODO 并注明“与事件总线同类问题”（[quality_issue.rs](file:///Users/air/TOPEMS/svc/qms/src/modules/quality_issue.rs#L567)）。
6. **错误码**：删除类 0 行 → 404（issue/eightd/check/action）；状态类 0 行 → 409（resolve/complete/approve/reject/cancel 等，与 IAM 已上线 409 语义一致）。FSM 预校验不允许的状态仍按要求返回 400，与“0 行 409”是两条路径，见 §8。

## 3. 实测发现并修复的两个问题

首轮副本验收暴露 2 个 500，根因均为「文本绑定到非文本列」，已修复并复验：

| 位置 | 现象 | 根因 | 修复 |
|---|---|---|---|
| [audit_log.rs](file:///Users/air/TOPEMS/svc/qms/src/models/audit_log.rs#L30) | issue approve / 8D cancel 等审批事件写入 500 | `qa_approval_events.tenant_id/entity_id` 为 uuid，`&str` 绑定被 PG 判为 text | `$1::uuid`、`$3::uuid` |
| [corrective_action.rs](file:///Users/air/TOPEMS/svc/qms/src/modules/corrective_action.rs#L215) | create_action 带 items 500 | `qa_corrective_action_items.due_date` 为 timestamptz，请求为字符串 | `$5::timestamptz` |

修复前 8D approve/close-approval 400 系上述 500 的级联；修复后均 200 且审批事件 `tenant_id=T1`。

## 4. 副本验收矩阵（80 项全绿）

日志：`/tmp/w7_b6a_prod/replica_matrix.log`。

| 分组 | 项数 | 关键断言 |
|---|---|---|
| 服务身份无租户头 | 5 | 4 个 create 全 400，9 张表行数前后一致（零新增） |
| T1 创建主表 | 6 | 4 类主表 200 且 `tenant_id=T1`；8D 创建审计、措施 2 条明细同事务且同租户 |
| 同域引用 | 9 | 8 个「跨租户/不存在」用例全 400，且零写入 |
| 8D 步骤链 | 9 | d1/d3/d4/d5/d6/d7/close 各 200 且审计逐次 +1；审计全 `tenant_id=T1`；主行 T1 |
| 8D 审批 | 6 | approve/close-approval/cancel 各 200 且审批事件 +1，事件全 T1；approve 重复非 200 |
| 检验链路 | 7 | assign/submit(2 results)/audit approve/reject/rework 审计与结果同事务；submit 重复非 200 |
| 措施状态 | 2 | complete 200；重复 complete → 409 |
| 质量问题状态 | 9 | resolve 200 / 重复 409；approve 200 且事件 +1；approval start/approve/reject 重复 409；delete 200 → 再次 404 |
| 0 行错误码 | 8 | PUT 4 类 → 404；resolve/complete/8d d1/8d close → 409；assign 不存在 → 404 |
| T2 视角 | 8 | 4 个列表均不含 T1 新建 id；4 个详情 404 |
| 服务/超管带头 | 5 | 写 issue/check 200 且 tenant=T1；服务身份 submit_result 200 tenant=T1；超管与服务读回 200 |
| 基线恢复 | 1 | 清理后 9 张表行数与改前完全一致 |

改前/改后副本基线：`issues/eightd/checks/actions = 5/5/5/5`，8D 审计 0、results 3、检验审计 3、措施明细 3、审批事件 0（T1 各 3、T2 各 2）。验收结束后逐表比对恢复原值，无残留。

### 基线污染处理

改前用服务身份无租户头打 4 个 create，记录到「各主表 +1 孤儿行、8D 另 +1 审计」后立即清理并复核基线；本批全部验收行按创建 id 收尾硬删除，最终基线 `5|5|5|5|0|3|3|3|0` 与改前一致，未污染复测环境。

## 5. 门禁

| 门禁 | 结果 |
|---|---|
| `cargo clippy -p topems-qms --all-targets -- -D warnings` | 通过 |
| `cargo fmt -p topems-qms -- --check` | 通过 |
| `cargo check --workspace` | 通过 |
| `check-tenant-context --changed-only`（暂存 5 文件） | PASS（本次 R1 0 / R2 0） |
| pre-push 全量（cargo-check/clippy/fmt/test、boundary、perm-matrix、contract、openapi、web-contract-smoke 等） | 全绿，未使用 `--no-verify` |

## 6. 生产窗口

日志：`/tmp/w7_b6a_prod/window_prod.log`（`tee` 落盘）。

| 时间（UTC） | 动作 |
|---|---|
| 18:09:06 | 窗口开始；新二进制 scp 暂存，sha256 `14a1017…` 一致 |
| 18:09:0x | `launchctl bootout gui/501/com.topems.server` |
| 18:09:0x | 备份旧二进制（`2899152…`）→ 换新 → `bootstrap`，新 pid 3843 |
| 18:09:0x | `/health` 首轮探测即 200；`state = running` |

生产复验（qms 全表为空，只能验 400 零写入、写后读回与 0 行错误码）：

| 阶段 | 项数 | 结果 |
|---|---|---|
| 服务身份无租户头写 4 端点 | 4 | 全 400；9 张表 `0|0|0|0|0|0|0|0|0` 前后一致（零写入） |
| 0 行错误码 | 9 | PUT 5 类 → 404；resolve/complete/8d d1 → 409；assign → 404 |
| T1 写后读回 | 4 | create 200 且 `tenant_id=T1`；T1 详情 200；超管+租户头 200；清理删除 200 |

写入阶段后行数 `1|0|0|0|0|0|0|0|0`（唯一 1 行为演练用 issue），随即硬删除并复核回到 `0|0|0|0|0|0|0|0|0`。

收尾：health 200、`state = running`、pid 3843、live sha `14a1017…`、回滚备份 `2899152…` 在位。

## 7. 限制与 TODO

- **product_id 未校验属主**：属跨域（pdm/mdm）主数据，本批不引跨域依赖；已在 create/update 两处显式标注，后续跨域引用治理批次统一处理。
- **workflow 缺租户上下文**：`start_issue_approval` 调 workflow `create_instance` 未透传 `tenant_id`（副本环境 workflow 未启动，接口仍按既有逻辑返回 200），与事件总线属同类问题，单独立项。
- **8D 步骤状态与 FSM 不一致（既有问题，非本批引入）**：d1~d5 均落 `in_progress`，d6/d7 直接跳 `verified`，导致 FSM 的 `permanent_action → verified` 永远不会由步骤链产生；副本验收 approve/close-approval 时用 SQL 将状态置为 `permanent_action` 后实测通过（已在该脚本处注明）。建议另开票据统一状态机与步骤落点。
- **FSM 预校验 400 与 0 行 409 并存**：预校验（如 submit 重复、approve 重复、cancel 已关闭）返回 400；绕过预校验的 0 行更新（并发/不存在）返回 409。二者语义不同，均非 5xx，符合本轮裁决。
- **生产 qms 为空**：层内租户隔离、子表事务化只能由副本夹具证明；生产侧证明的是「400 零写入 + 写后读回 + 0 行错误码 + 无回归」。
