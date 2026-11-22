# B160 · EHS 培训域状态收口（2026-11-22）

## 枚举
新增 `svc/ehs/src/modules/training_status.rs`，四个枚举统一 `DB_VALUES / DEFAULT / as_db_str / from_db_str / 单测`：

- `TrainingProgramStatus`：`draft / active / completed / cancelled`，默认 `draft`
- `TrainingSessionStatus`：`scheduled / in_progress / completed / cancelled`，默认 `scheduled`
- `TrainingRecordStatus`：`ongoing / completed / failed`，默认 `ongoing`
- `TrainingCertificateStatus`：`valid / expired / revoked`，默认 `valid`

培训记录值集按前端 `apps/web/src/schemas/ehs/training.ts` 与库内旧约束对齐：保留 `failed`，不使用 `cancelled`。旧约束 `ck_training_records_status` 的三值虽同为 `ongoing / completed / failed`，但命名未统一，本次由标准约束替换，避免双约束取交集后把业务值挡掉。

## API 收口
`svc/ehs/src/modules/training.rs` 已绑定枚举：

- 创建：培训场次、培训计划、培训记录、培训证书四个入口，缺省取枚举默认值，非法值 HTTP 400
- 更新：场次、计划、记录、证书四个入口，`status` 先 `from_db_str`，非法值 HTTP 400，合法值以规范 `as_db_str()` 入库
- 列表：计划、记录、证书三个过滤参数，非法值 HTTP 400，不再把任意字符串直接拼进 SQL 参数
- 动态 SQL 的 `params: Vec<String>` 只 push 枚举规范值；`COALESCE` 更新路径的绑定值仍是 `Option<&'static str>`

## 本地 DB 应用
文件：`docs/database/ehs-training-status-check-candidates-2026-11-22.sql`

- `ehs.training_programs` → `ck_training_programs_status_standard`，四值，`NOT VALID`
- `ehs.qa_ehs_trainings` → `ck_qa_ehs_trainings_status_standard`，四值，`NOT VALID`
- `ehs.training_records` → 先删旧 `ck_training_records_status`，再建 `ck_training_records_status_standard`，三值，`NOT VALID`
- `ehs.qa_ehs_training_certificates` → `ck_qa_ehs_training_certificates_status_standard`，三值，`NOT VALID`

存量值核验（应用前）：

- `ehs.training_programs.status`：206 行，全部 `draft`
- `ehs.qa_ehs_trainings.status`：235 行，全部 `scheduled`
- `ehs.training_records.status`：207 行，全部 `ongoing`
- `ehs.qa_ehs_training_certificates.status`：207 行，全部 `valid`

拦截验证：四张表各取一行执行 `status='bogus'` UPDATE，均被 23514 拦截；事务回滚后行数与状态分布不变。

## 刷新结果
- catalog：**332 条状态 CHECK / 5 个 PG ENUM / 390 个无约束状态列**
- 盘点：**220 个 Rust 枚举 / 203 个值 / 59 个不在 DB CHECK / 214 个前端键 / 色板缺口 0**
- 缺口队列：**45 个枚举 / 59 个值，全部 `internal_state`**
- 前端键不在 DB CHECK：**70**
- 映射：`status-db-check-mappings.json` 新增 4 条，共 **188 条**

## 门禁
- `cargo clippy -p topems-ehs --all-targets -- -D warnings`：PASS
- `cargo test -p topems-ehs --lib`：254 passed / 0 failed
- catalog / inventory / queue 的 `--check`：PASS
- `request-txn`：bare 1651 未增；`scope-api`：未标记调用与 `Db::new` 未增
- `check-txn-write-non2xx --changed-only`：PASS
- glossary / i18n / web typecheck：见提交前门禁记录

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。生产发布需执行候选并按窗口 `VALIDATE`。
