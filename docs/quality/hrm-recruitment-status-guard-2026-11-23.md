# B205 · HRM 招聘三态列护栏证据（2026-11-23）

## 范围

| 表 | 列 | 类型 | 默认 |
| --- | --- | --- | --- |
| `hrm.job_openings` | `status` | varchar(20) NOT NULL | `draft` |
| `hrm.candidates` | `status` | varchar(20) NOT NULL | `new` |
| `hrm.interviews` | `status` | varchar(20) NOT NULL | `scheduled` |

- 代码：`svc/hrm/src/modules/recruitment.rs`
- 枚举：`svc/hrm/src/modules/recruitment_status.rs`（新增，三个枚举）
- 本地数据：三表均 0 行

## 值集

- **JobOpeningStatus**：`draft / published / in_progress / closed / filled`（默认 `draft`）。
  与前端 `apps/web/src/schemas/hrm/recruitment.ts` 的下拉、筛选、色板逐值一致。
- **CandidateStatus**：`new / screening / interviewing / offered / hired / rejected / withdrawn`（默认 `new`）。
- **InterviewStatus**：`scheduled / in_progress / completed / cancelled`（默认 `scheduled`）。

候选人与面试两列在前端没有 schema，词表取招聘漏斗标准态；本批为 `NOT VALID` 护栏，
若产品口径不同可收窄词表并同步收窄候选约束（存量无数据，收窄无成本）。

## 修掉的缺陷

1. **候选人状态自由串**：`update_candidate` 原来 `status = COALESCE($8, status)` 直接绑定
   `req.status`，任意字符串可落库。现 `parse_optional` 校验，非法 400，空串/缺省视为不变。
2. **面试状态自由串**：`update_interview` 的 `COALESCE($6, status)` 同样的透传问题，现同样校验。
3. **三个列表过滤静默查空**：职位/候选人/面试列表都用 `params.status` 原样绑定，
   非法值查空、空串当真实值。现统一 `parse_filter`：`None` / 空串 / `all` 视为不过滤，未知值 400。
4. **散落字面量**：
   - 职位创建 `'draft'`、发布 `SET status='published' WHERE status='draft'`、关闭
     `SET status='closed' WHERE status='published'`、删除守卫 `status='draft'`；
   - 候选人创建 `'new'`、面试创建 `'scheduled'`、完成面试 `SET status='completed' WHERE status='scheduled'`。
   全部改为参数绑定 + 枚举常量（`as_db_str()`），词表变化不再漏改 SQL。
5. **响应出口**：三个列表的 `items`、三个创建、三个详情、三个更新、面试完成，统一经
   `normalize_opening` / `normalize_candidate` / `normalize_interview`，未知历史值回落默认态。

## 本地验证

```sql
ALTER TABLE hrm.job_openings ADD CONSTRAINT ck_hrm_job_openings_status_standard
  CHECK (status IN ('draft','published','in_progress','closed','filled')) NOT VALID;
ALTER TABLE hrm.candidates ADD CONSTRAINT ck_hrm_candidates_status_standard
  CHECK (status IN ('new','screening','interviewing','offered','hired','rejected','withdrawn')) NOT VALID;
ALTER TABLE hrm.interviews ADD CONSTRAINT ck_hrm_interviews_status_standard
  CHECK (status IN ('scheduled','in_progress','completed','cancelled')) NOT VALID;
```

- 三条均执行成功，`convalidated = f`。
- 负向验证：`INSERT hrm.job_openings ... status='bogus'` 被
  `ck_hrm_job_openings_status_standard` 拒绝，事务回滚，表仍 0 行；API 侧在落库前即 400。
- 生产快照 `topems_prod_verify_20261106` 未应用。

## 附带修正

`apps/web/src/utils/status.ts` 补齐 6 个缺失键：`screening` / `interviewing` / `offered` /
`hired` / `withdrawn` / `filled`（前端键 235 → 241，`strict-palette` 缺口 6 → 0）。

## 刷新与门禁

- catalog：**391 条状态 CHECK / 5 个 PG ENUM / 332 个无约束列**
- 盘点：**274 个 Rust 枚举 / 232 值 / 57 不在 DB CHECK / 241 前端键 / 色板缺口 0**
- 缺口队列：**44 枚举 / 57 值，全部 internal_state**
- 前端键不在 DB CHECK：**66**
- 映射新增 3 条：`recruitment.rs#JobOpeningStatus` / `#CandidateStatus` / `#InterviewStatus`

## 已知取舍

候选人、面试两列的词表没有前端权威来源。当前取值覆盖「筛选 → 面试 → 发 offer →
入职 / 淘汰 / 放弃」与「约面 → 进行中 → 完成 / 取消」两条主线；如果产品后续只保留
更少的状态，直接删枚举变体、同步候选约束即可，无存量迁移成本。
