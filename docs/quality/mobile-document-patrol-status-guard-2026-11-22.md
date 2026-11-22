# B158 · Mobile 文档 / 巡逻记录状态收口（2026-11-22）

## 枚举
新增 `svc/mobile/src/modules/mobile_content_status.rs`：

- `MobileDocumentStatus`：`draft / pending_review / approved / rejected / archived`，默认 `draft`，对齐 `apps/web/src/api/mobile/document.ts` 契约
- `MobilePatrolStatus`：`pending / in_progress / completed / cancelled`，默认 `pending`，保持严格小写契约

两个枚举均含 `DB_VALUES / as_db_str / from_db_str` 与单测；文档状态输入做 trim+lower 归一，巡逻状态保持大小写敏感（`PENDING` 仍 400）。

## 代码接入
`svc/mobile/src/modules/document.rs`：

- 创建文档 `status` 严格解析，非法 400，写库绑定 `MobileDocumentStatus`
- 更新文档 `status` 严格解析，非法 400，写库绑定规范值
- 更新不存在文档从“HTTP 200 + not_found body”修正为 HTTP 404

`svc/mobile/src/modules/patrol.rs`：

- `is_valid_patrol_status` 改为枚举解析，消除独立字面量集合
- 创建/更新巡逻记录 `status` 严格解析，非法 400；更新时当前库内状态异常返回 409
- 创建响应仍输出字符串状态，契约不变

## 本地 DB 应用
文件：`docs/database/mobile-document-patrol-status-check-candidates-2026-11-22.sql`

- `mobile.documents.status` 五值 `ck_mobile_documents_status_standard`
- `mobile.patrol_records.status` 四值 `ck_mobile_patrol_records_status_standard`
- 两个约束均 `NOT VALID`，已实际应用到本地 `topems`

本地核验：

- `mobile.documents` 130 行全 `draft`
- `mobile.patrol_records` 22 行全 `pending`
- 两表 `status='bogus'` UPDATE 均被 23514 拦截，事务回滚后数据不变

## 门禁
- `cargo clippy -p topems-mobile --all-targets -- -D warnings`：PASS
- `cargo test -p topems-mobile --lib`：254 passed / 0 failed
- catalog：**321 条 CHECK / 5 ENUM / 401 无约束列**
- 盘点：**215 Rust 枚举 / 198 值 / 60 不在 DB CHECK / 211 前端键 / 色板缺口 0**
- 队列：**45 枚举 / 60 值全部 `internal_state`**
- 前端键不在 DB CHECK：**72**
- `request-txn`/`scope-api` 未增、`txn-write-non2xx` PASS、glossary/i18n PASS

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。发布需执行候选并按窗口 `VALIDATE`。
