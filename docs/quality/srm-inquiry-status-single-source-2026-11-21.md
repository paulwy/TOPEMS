# B40 · srm.inquiries 状态单一源（2026-11-21）

## 现状（改动前）
- `srm.inquiries`：本地 273 行，全部 `draft`，无 CHECK 约束；列默认 `'draft'`。
- 创建/编辑接口把请求 `status` 原样写库（`req.status.unwrap_or("draft")`），任意字符串都能落库；列表过滤也接受任意字符串，非法值静默返回空列表。
- 发布/关闭流转的起始态与目标态是散落字面量：`draft|closed → published`、`published → closed`。
- 前端 `apps/web/src/schemas/srm/inquiry.ts` 已提供六态（draft/published/in_progress/closed/awarded/cancelled），但 `api/srm/index.ts` 的 `Inquiry.status` 是裸 `string`，后端只实现其中两态流转。

## 改动
1. 新增 `svc/srm/src/modules/inquiry_status.rs`：
   - `InquiryStatus { Draft, Published, InProgress, Closed, Awarded, Cancelled }`，六值与前端对齐；
   - `DEFAULT = Draft`；`publish_from = [draft, closed]`、`close_from = [published]`；
   - 严格解析 + 2 个单测（roundtrip、流转起始集合）。
2. `inquiry.rs`：创建默认 `Draft`、请求带 status 时严格解析（未知 400）；编辑 status 严格解析（未知 400）；列表过滤严格解析（未知 400）；publish/close 目标态与起始态改由枚举提供并绑 `as_db_str()`。
3. 前端 `apps/web/src/api/srm/index.ts`：新增 `InquiryStatus` 六值联合，`Inquiry.status` 收紧；`apps/web/src/utils/status.ts` 补 `awarded` 色板（此前严格色板检查会缺口）。
4. 候选 DDL `docs/database/srm-inquiry-status-check-candidates-2026-11-21.sql`：`inquiries_status_check`（六值，`NOT VALID`）；列默认与创建一致，无需改默认。

## 验证
- `cargo check -p topems-srm`、`cargo clippy -p topems-srm --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-srm --lib inquiry_status`：2 passed。
- 本地演练（事务内 ROLLBACK，残留 0）：
  - `INSERT draft` → `UPDATE published` → `in_progress` → `awarded` 各 1 行；
  - `awarded → 'bogus'` → 23514；
  - 回滚后 `B40-DRILL` 行 0、`inquiries_status_check` 约束 0。
- 盘点：枚举 149→150、值 156→157、不在 DB CHECK 117→118、色板缺口 0；前端键 171→172；队列 106→107 枚举 / 117→118 值；映射 84→85。

## 残留
- 六态里 `in_progress` / `awarded` / `cancelled` 只有集合定义，没有对应流转端点；本批不新增业务动作，只把非法值挡在写入口。
- 发布允许从 `closed` 直接重发（历史行为保留，未收紧回 `draft`），是否符合业务需确认。
- `update_inquiry` 仍允许请求直接把状态改成任意合法六态，绕过 publish/close 流转；是否要禁用手改 status 需产品拍板。
- 创建/编辑/删除没有显式 `tenant_id` 谓词，依赖请求级 RLS 事务。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
