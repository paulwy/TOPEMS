# B32 · ai.documents 状态单一源（2026-11-21）

## 现状
`ai.documents.status` 是 ai schema 里唯一有真实流量（32 行，全 `pending`）的文档状态列：

- 创建：`services/vector.rs#create_document` 直接 `.bind("pending")`；
- 更新：`update_document_status(id, status: &str, ...)` 接收裸字符串并 `.bind(status)`，任何调用方都能写任意状态；
- 调用点：`services/document.rs` 传 `"empty"`（内容为空）、`"processed"`（切块完成）；
- 检索：`if doc.status != "processed"` 用字面量过滤；
- `ai.document_chunks.embedding_status`：本地 0 行、`svc/ai` 零引用，疑似死列。

## 改动
1. 新增 `svc/ai/src/models/document_status.rs`：`DocumentStatus { Pending, Processed, Empty }`、`DB_VALUES`、`DEFAULT = Pending`、`from_db_str`（trim/lowercase、未知 `None`）、`as_db_str`；1 个单测（往返、`failed` 拒绝、`PROCESSED` 归一）。
2. `vector.rs`：创建绑 `DEFAULT.as_db_str()`；`update_document_status` 参数改为 `DocumentStatus`，写库统一 `as_db_str()`。
3. `document.rs`：两处调用改传 `DocumentStatus::Empty` / `DocumentStatus::Processed`；检索过滤改 `DocumentStatus::Processed.as_db_str()`。
4. 前端色板补 `processed: 'success'`、`empty: 'default'`，色板缺口回到 0。
5. 候选 DDL：`docs/database/ai-document-status-check-candidates-2026-11-21.sql`；本批不动 `embedding_status`，先按死列处理并在文件内留评审结论。

## 验证
- `cargo test -p topems-ai --lib document_status`：1 passed。
- `cargo check -p topems-ai --all-targets`、`cargo clippy -p topems-ai --all-targets -- -D warnings`：干净；`cargo fmt --all`。
- `check-request-txn` / `check-scope-api`：写路径已用 `scope_with`，未新增裸事务，Db::new 未增加。
- 本地事务演练（2 组 ROLLBACK，残留 0）：`pending→'bogus'` → 23514；`pending→processed` → `UPDATE 1`。
- 盘点：Rust 枚举 140→141、值 153、不在 DB CHECK 115、色板缺口 0；前端键 167→169；队列 102 枚举 / 115 值；映射 76 条。
- `vitest status.test.ts`：8 passed（补键后未破坏守卫）。

## 残留
- 候选 CHECK 未进 `database/migrations/`，生产窗口 + `VALIDATE`。
- `ai.documents.status` 无 `failed` 态：`save_chunks_and_vectors` 失败时文档停在 `pending`，重试由外部驱动；若后续加重试/失败态需扩枚举并同步候选。
- `ai.document_chunks.embedding_status`、`ai.ai_models.status`（6 行 active）、`ai.usage_logs.status`（3 行 success，结果标记）仍未收口；`usage_logs` 建议改 `outcome` 再枚举化。
- 前端 `processed`/`empty` 只有色板，无中文 i18n 键；后续接入展示时补。
