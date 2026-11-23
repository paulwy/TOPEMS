# B233 · pm.project_reports.status 状态治理

日期：2026-11-23
表列：`pm.project_reports.status`（varchar DEFAULT `'pending'`）
枚举：`svc/pm/src/modules/project_report_status.rs` → `ProjectReportStatus`

## 发现的问题

1. **两条创建路径硬编码状态字面量**：手工登记报告 `'pending'`、自动生成报告 `'generated'`，值与 SQL 绑定。
2. **无任何状态约束**：拼错即落库，读取侧拿到未知值；表当前 0 行。
3. **没有更新入口**：本批只收敛创建写入，状态机预留给后续报告重新生成/失效动作。

## 改动

- 新增 `ProjectReportStatus`（2 态）：`DB_VALUES / DEFAULT / as_db_str / from_db_str（含历史别名）/ normalize / parse_filter / can_transition_to（pending→generated，generated 终态）/ is_terminal / Display / FromStr` + 单测。
- 两条创建 INSERT 的状态位置改为参数绑定：手工路径绑 `DEFAULT`（pending）、生成路径绑 `Generated`；占位符顺延，绑定顺序与 SQL 对齐。
- 新增 `ck_project_reports_status_standard`（2 值，NOT VALID），已应用到本地 `topems`；表 0 行，事务内取父项目 + 报告验证：`bogus` 被拒（`violates check constraint`）。

## 门禁

- `cargo fmt --all` / `cargo clippy -p topems-pm --lib --tests -- -D warnings` / `cargo test -p topems-pm --lib`：521 passed。
- 状态目录不刷新（无迁移候选，catalog 保持 33/5/683）；登记 prod-only 401。
- 映射 284 → 285；inventory / queue 随之刷新。
