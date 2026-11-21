# B42 · ehs.qa_ehs_hazards 状态单一源（2026-11-21）

## 现状（改动前）
- `ehs.qa_ehs_hazards`：本地 117 行，`reported` 78 / `resolved` 39；无 CHECK 约束；列默认 `'reported'`。
- 后端状态流转全靠 SQL 字面量：创建 `reported`、启动审批 `pending_approval`、创建整改 `rectifying`、提交整改 `pending_verification`、验收 `closed` / 回退 `rectifying`。
- 列表 `status` 过滤与编辑接口都接受任意字符串，非法值可落库或静默空列表。
- 前端筛选只提供 reported / rectifying / pending_verification / verified / closed / rejected，**缺少后端真实会写入的 `pending_approval`**，启动审批后列表 badge 退化为灰色；历史 `resolved` 也无对应筛选项。
- 色板缺少 reported / rectifying / pending_verification 三项。

## 改动
1. 新增 `svc/ehs/src/modules/hazard_status.rs`：
   - `HazardStatus` 八值：reported / pending_approval / rectifying / pending_verification / verified / closed / rejected / resolved；
   - `DEFAULT = Reported`；`resolved` 历史只读，`verified` / `rejected` 前端保留态；
   - `approval_from=[reported]`、`rectify_from=[reported,pending_approval,rectifying]`、`submit_from=[rectifying]`、`verify_from=[pending_verification]`；
   - 严格解析 + 2 个单测。
2. `hazard.rs`：创建默认绑 `DEFAULT`；列表过滤严格解析（未知 400）；编辑 status 严格解析（未知 400）；启动审批/关闭/创建整改/提交整改/验收全部改绑枚举，并在 UPDATE 中加入起始态谓词。
3. 前端 `schemas/ehs/safetyIssue.ts`：状态选项、statusBadge 色板与标签、筛选器补 `pending_approval`（审批中）和 `resolved`（已解决）；新增 i18n key `ehs.safety_issue.k78/k79`（zh/en）。
4. `utils/status.ts`：补 reported / rectifying / pending_verification 色板（此前盘点 3 个缺口）。
5. 候选 DDL `docs/database/ehs-hazard-status-check-candidates-2026-11-21.sql`：`qa_ehs_hazards_status_check`（八值，`NOT VALID`）。

## 验证
- `cargo check -p topems-ehs`、`cargo clippy -p topems-ehs --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-ehs --lib hazard_status`：2 passed。
- 本地演练（事务内 ROLLBACK，残留 0）：
  - `INSERT reported` → `pending_approval` → `rectifying` → `pending_verification` → `closed` 各 `UPDATE 1`；
  - `closed → 'bogus'` → 23514；回滚后 `B42-DRILL` 行 0、约束 0。
- 盘点：枚举 151→152、值 157→160、不在 DB CHECK 118→121、色板缺口 3→0；前端键 172→175；队列 107→108 枚举 / 118→121 值；映射 86→87。

## 残留
- 起始态谓词命中 0 行时，启动审批/关闭仍返回 404（无法区分“记录不存在”与“状态不允许”）；创建整改/提交/验收已是 409。
- `verified` / `rejected` 只存在于前端筛选与候选 CHECK，后端没有写入路径；是否删除需产品确认。
- `resolved` 39 行是历史终态，代码不再写入；是否回填为 `closed` 需业务确认。
- 创建/关闭/验收仍依赖请求级 RLS 事务，无显式 `tenant_id` 谓词的路径未改。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
