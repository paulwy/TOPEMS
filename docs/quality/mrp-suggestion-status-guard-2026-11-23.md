# B176 · MRP 建议状态（2026-11-23）

## 枚举
- `svc/scm/src/modules/mrp_suggestion_status.rs` → `MrpSuggestionStatus`：`draft / pending / confirmed / rejected / completed`，默认 `draft`。
- 后端实际生成 `draft`，前端原先只有四个状态、缺 `draft`；本批补齐前端缺项，形成五值集合。

提供 `DB_VALUES / DEFAULT / as_db_str / from_db_str / 单测`。

## 代码收口
- 列表：`status` 参数先解析枚举，非法值返回 400；列表与计数共用规范值。
- 更新：请求体 `status` 解析为枚举后绑定，非法值 400。
- MRP 计算：批量生成 `'draft' as status` 改为参数绑定 `$9`，绑定 `DEFAULT`。
- 确认：`SET status = 'confirmed'` 改为参数绑定；前置状态判断使用 `MrpSuggestionStatus::Draft` 常量。
- 前端 `mrpSuggestion.ts` 补齐 `draft` 的状态选项、色板、徽标与筛选，并新增中英文文案。

## 本地 DB 应用
文件：`docs/database/mrp-suggestion-status-check-candidates-2026-11-23.sql`，约束 `NOT VALID`：

- `scm.mrp_suggestions.status` → `ck_scm_mrp_suggestions_status_standard`（五值）

表当前 0 行。构造 `status='bogus'` 的新插入，被该约束拦截，随后 `ROLLBACK`，未留下数据。

## 刷新结果
- catalog：**355 条状态 CHECK / 5 个 PG ENUM / 368 个无约束状态列**
- 盘点：**238 个 Rust 枚举 / 210 个值 / 59 个不在 DB CHECK / 220 个前端键 / 色板缺口 0**
- 缺口队列：**45 个枚举 / 59 个值，全部 `internal_state`**
- 前端键不在 DB CHECK：**69**
- 映射：共 **210 条**

## 门禁
- `cargo clippy -p topems-scm --lib --tests -- -D warnings`：PASS
- `cargo test -p topems-scm --lib`：359 passed / 0 failed
- catalog / inventory / queue 的 `--check`：PASS（`--strict-palette` 色板缺口 0）

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。生产发布需执行候选并按窗口 `VALIDATE`。
