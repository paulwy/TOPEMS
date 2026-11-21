# B77 · AI 知识文档状态唯一集合与处理并发防护（2026-11-21）

## 现状（改动前）
- `core.knowledge_documents.status` 只有零散字面量：创建写 `pending`、处理写 `processing`、成功写 `ready`、失败写 `failed`，没有枚举和 DB CHECK。
- 处理入口先无条件把文档改成 `processing` 再切块；对已在处理或已就绪的文档重复提交会并发写重复分块。
- 编辑接口的 `status` 接受任意字符串；列表 `?status` 也未校验。
- 本地 `core.knowledge_documents` 0 行，`core.knowledge_bases` 0 行。

## 改动
1. 新增 `KnowledgeDocumentStatus`（pending/processing/ready/failed），提供 DEFAULT、`process_from`、严格解析与显式迁移规则。
2. 创建文档绑定 DEFAULT；处理入口 UPDATE 增加 `status = ANY(process_from)` 且要求恰好 1 行，0 行回滚返回“正在处理或状态不允许”；进入 processing 后先清空旧分块，重建不再产生重复切片。
3. ready / failed 回写都要求当前状态为 processing，0 行回滚，避免并发覆盖。
4. 编辑接口：非法状态 400；内容变更只允许把状态重置为 pending，且 processing 期间禁止编辑；显式改状态按迁移规则校验，非法跳转 409。
5. 列表 `?status` 严格解析，未知值 400；前端补 `ready` 色板。
6. 新增候选 CHECK `knowledge_documents_status_check`（NOT VALID），并登记映射与队列。

## 验证
- `cargo check -p topems-ai`、`cargo clippy -p topems-ai --all-targets -- -D warnings` 干净。
- 本机演练（事务内 ROLLBACK）：临时 KB + 文档 pending→processing→ready 各 1 行；ready→completed 触发 23514；回滚后无残留。
- 盘点：172 枚举 / 166 值 / 127 不在 DB CHECK / 色板缺口 0；前端 181 键；队列 118 枚举 / 127 值；映射 107。

## 残留
- 候选 CHECK 仅本地演练，未进生产迁移；生产需窗口 + 存量检查 + VALIDATE。
- `ready` 在队列里仍被分到 internal_state，说明分类器对“就绪”语义还没有稳定归类，后续可调整分桶规则。
- 旧的 `svc/ai/src/services/vector.rs` 文档状态路径（`ai.documents`）与本轮 `core.knowledge_documents` 是两套模型，未合并。
