# 日期时间类型统一契约（TOPEMS）

> 目标：消灭跨服务、跨层的日期时间类型漂移，让"时间"在整个系统里有唯一语义。
> 依据：2026-09-25 全项目审计（svc/* 1616 个 .rs 时间字段 3348 处；database/migrations 279 个 .sql 时间列 840 处）。
> 配套工具：`scripts/date-type-audit.py`（分层审计，可进 CI）。

## 1. 分层契约（一句话版）

```
数据库列          Rust 实体           Rust DTO / API
─────────        ─────────          ─────────────
timestamptz  →   DateTime<Utc>  →   RFC3339 String（serde 自动）
date         →   NaiveDate      →   "YYYY-MM-DD" String
interval     →   chrono::Duration → 秒数/ISO8601 时长
（禁止）       →   String 存时间（实体层）  （禁止）自定义 format 串
```

**唯一允许 String 存时间的层是 DTO/API 输出层**，且必须由实体时间类型转换而来（`to_rfc3339()` / serde 自动序列化），禁止实体层直接以 `String` 承载业务时间。

## 2. 各层细则

### 2.1 数据库层（migrations/*.sql）

| 语义 | 唯一允许类型 | 禁止 |
|---|---|---|
| 时刻（审计、事件、计划、完成等） | `timestamptz` | `timestamp`（无时区）、`varchar/text`、`bigint/int` |
| 纯日历日期（生日、排程日期） | `date` | `varchar/text`、`timestamptz`（携带无意义时区） |
| 时长 / 标准工时 | `interval` 或 `numeric` | `varchar` |
| 性能/进程内计时 | 不进库（仅 Rust `Instant`） | — |

- 存量 384 个无时区 `timestamp` 列 → 逐步迁移为 `timestamptz`（见 TODO：DB 迁移任务，按表评估数据与时区语义后执行）。
- 新建时间列一律 `timestamptz` / `date`，禁止裸 `timestamp`。

### 2.2 Rust 实体层（`#[derive(FromRow)]` / DB 映射 struct）

| 语义 | 唯一允许类型 | 禁止 |
|---|---|---|
| 时刻 | `DateTime<Utc>`（或 `Option<DateTime<Utc>>`） | `String`、`NaiveDateTime`（除非列确为无时区且契约显式豁免）、`i64` 时间戳 |
| 纯日期 | `NaiveDate` | `String` |
| 时长 | `chrono::Duration` / `f64`（秒） | `String` |

- 实体层 `String` 时间字段 = **违规**，`date-type-audit.py` 报告即改。
- `NaiveDateTime` 只在"列确为 `timestamp`(无时区) 且有意保留本地语义"时允许，需注释豁免理由。

### 2.3 Rust DTO / API 层

- 输出：时间一律 RFC3339 字符串（`DateTime<Utc>` serde 默认即可；手动转换用 `to_rfc3339()`）。
- 输入：一律接受 RFC3339，解析用 `DateTime::parse_from_rfc3339` / `from_rfc3339`；**禁止** `parse_from_str` 自定义格式（如 `%Y-%m-%d %H:%M:%S`）作为公共 API 入口。
- DTO 内部 String 与 DateTime 字段混用可接受（序列化结果一致），但**同一 DTO 内同类语义字段应保持同一种声明风格**（推荐一律 `DateTime<Utc>`，序列化交给 serde）。

### 2.4 边界与豁免

- `std::time::Instant`：仅限进程内性能计时，**禁止**进入 DB、跨服务 API、序列化边界。
- `SystemTime`：仅限系统层（文件时间戳、TLS 等），不进入业务 DTO。
- 既有豁免需在 struct 旁注释 `// date-type-convention: exempt ...`，审计工具默认不放过、人工确认后加入白名单。

## 3. 审计与验收

```bash
python3 scripts/date-type-audit.py            # 全项目分层审计，exit 1 表示存在实体层违规
python3 scripts/date-type-audit.py --service mes   # 单服务
python3 scripts/date-type-audit.py --sql      # 仅 SQL 列类型分布
```

- 验收标准（实体层）：`date-type-audit.py` 实体层违规 = 0。
- 验收标准（DB 层）：无时区 `timestamp` 列清单归零（迁移后）。
- 建议纳入 CI（与 mes-online-check 同级）：任何新提交引入实体层 String 时间字段 → 红。

## 4. 当前基线（2026-09-25 首次审计）

| 层 | 基线 | 状态 |
|---|---|---|
| DB 时间列 | timestamptz 392 / timestamp(无时区) 384 / date 58 / numeric·varchar 6 | 待迁移 384 列 |
| Rust 时间字段 | DateTime<Utc> 1825 / String 1201 / NaiveDate 149 / NaiveDateTime 37 / int 23 / Instant 28 / bool 24 | 实体层违规按服务待清理 |
| mes 试点 | 实体层 0 违规；DTO String 均为 RFC3339 输出 | ✅ 达标（重构收尾已达成） |
| API 约定 | to_rfc3339 1220 / parse_from_rfc3339 203 / 手动 format 185 / parse_from_str 64 | 手动 format 与自定义 parse 待收敛 |
