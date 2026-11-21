# B87 · 工作流状态严格解析与启动防重（2026-11-21）

## 现状（改动前）
- `master_data.mdm_workflows` 本地 12 行（running 7 / completed 2 / cancelled 3），无 CHECK。
- `WorkflowStatus`/`WorkflowStepStatus` 读侧 `_ =>` 会静默回退 draft/pending；列表 `status` 参数原样匹配，未知值返回空。
- 工作流读取未做状态过滤；启动流程“先读 draft、再无条件下写”，并发下可重复启动并重复写历史。

## 改动
1. `WorkflowStatus` 与 `WorkflowStepStatus` 增加 `DB_VALUES`/`from_db_str`（trim + 小写）/`as_db_str`；读侧 helper 改为严格解析 + 显式默认。
2. 工作流列表 `status` 先严格解析并回填规范值，未知值 400。
3. `fetch_workflows` 增加五值过滤，集合外状态不进入列表、详情和流转判断。
4. 启动工作流改为 `status = 'draft'` + `updated_at` 乐观锁谓词；0 行区分 NotFound / Conflict，handler 分别 404 / 409，不再重复启动、不再重复写 start 历史。
5. 候选 CHECK 与映射此前已覆盖 `mdm_workflows.status`；`WorkflowStepStatus` 维持“嵌在 steps jsonb、无独立列”的登记。

## 验证
- `cargo fmt --all`、`cargo clippy -p topems-master-data --all-targets -- -D warnings` 干净。
- 单测覆盖两组枚举的往返、未知值拒绝、大小写与空格归一。
- 本地演练（事务内 ROLLBACK）：临时插入 draft + bogus 两行，全表 14 行、状态过滤后 13 行；带 draft+updated_at 谓词首次 `UPDATE 1`，重复执行 `UPDATE 0`。
- 盘点/队列：172 枚举 / 127 不在 DB CHECK；队列 118/127，分桶不变。

## 残留
- advance/approve/reject 三个流转仍是“先读后无条件写”，并发窗口留待下一批用 updated_at/JSONB 谓词收口。
- 工作流状态没有 pause/resume/cancel 写接口，paused 仅历史数据可读。
