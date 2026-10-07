
---

### 并行线补充记录（2026-10-04 批1剩余+批2 收口，本地原记录保留）

## 2026-10-04 批1剩余+批2 收口（B3/B4/B5/B6/B8/B9 完成，本地提交未 push）

> 依据「下一步工作规划」D 节执行形态：批 1（快赢收口）→ 批 2（残留偿还）。用户已拍板：批1剩余+批2 共 6 项，决策项（B1/B14/B15/A2/A5）暂跳过。
> 说明：A3/A4/B2/B13 在本次会话前已由并行线完成并推 origin/main（TODO 表格未同步，此处补记）；B3 代码亦已在 HEAD（由并行线带入），本次验证确认。

### ✅ 本次完成（commit 链 eca99460b + 后续 4 提交，均未 push）
- **B3 crm 金额精度**（验证确认，无新改动）：sales_forecast/dashboard 金额已 f64→Decimal（HEAD 含 `sales_forecast_amount_precision_exact`/`dashboard_amount_precision_exact` 精度单测）；cargo test -p topems-crm --lib 504/504 绿（0 failed）
- **B4 checksums.txt 恢复登记 + validate.sh 根因修复**：validate.sh `scopes=$(grep -o ... | sed ... | sort -u)` 在 set -euo pipefail 下 grep 无匹配即崩溃（09-21 后停更根因）→ 两处补 `|| true`；重跑后 checksums.txt 全量重生成 296 行（293 迁移全登记，含 B5），二次重跑 Checksum errors=0；首次 67 个 mismatch 为历史漂移一次性吸收
- **B5 gis RLS 开启**：`svc/gis/src/main.rs` enable_rls:false→true（protected 路由挂 RLS 中间件）；新迁移 `20261004000001_b5_gis_rls_enable.sql`（幂等 ENABLE/FORCE + rls_tenant_isolation 策略，仅含 tenant_id 基表；geofences/track_positions 无 tenant_id 列自动跳过）；5432 应用两遍幂等无错；隔离实测（NOSUPERUSER topems_app）：无GUC=3 / 租户A=1 / nil UUID=3 / 无关租户=0 全过；cargo check -p topems-gis 绿
- **B6 lib/shared-db rls.rs 池化 GUC 修复**：rls_middleware 改 acquire→set→run→reset 独占连接模式（对齐 tenant_rls CORE-06 修复，归还连接不残留租户状态）；apply_rls_middleware/set_tenant_context 标废弃注释（仓库无调用方）；cargo test -p topems-shared-db 152/152 绿、SQLX_OFFLINE cargo check --workspace 0 错误（1m15s）
- **B8 前端 topems-core 清理**：根 package.json 删除 `dev:core`（pnpm --filter topems-core dev）；grep 代码/配置 topems-core=0（仅 docs/archive 历史文档残留，不参与构建）；build:shared-types CJS/ESM/DTS 全绿（既有 TS2688 不再出现）；pnpm typecheck 0 错误
- **B9 GIS leaflet 测试修复**：DataInfraComponents.test.tsx react-leaflet mock 补 `useMapEvents: () => ({})`；全量 vitest 446 文件 6530 passed / 0 failed（R1 基线 3 失败清零）

### 验证总览
- 后端：cargo check --workspace 0 错误；shared-db 152、crm 504 测试绿
- 前端：vitest 6530/0、typecheck 0、build:shared-types 全绿
- 门禁：schema-boundary PY exit 0（全服务 PASS）+ NODE 29 服务/1420 文件 PASS；validate.sh 二次 0 错误
- DB：B5 迁移 5432 幂等应用 + 隔离实测 4/4（未记 _sqlx_migrations 账本，沿用半手工惯例）

### ⬜ 未完成（本批范围外）
- **可执行未排期**：B7（L 级分批）、B10/B11/B12（P2）
- **决策项跳过（用户拍板暂不处理）**：B1（search→erp 白名单撤销）、B14（守卫重构）、B15（埋点）、A2（5433 docker）、A5（erp RLS）
- **环境阻塞**：A1（nginx 生产 conf 需 Linux/生产环境）；5433 仍 DOWN、nginx 未运行

## 2026-10-04 第二轮收口（B10/B11/B12 完成，本地提交未 push）

> 用户「继续推进」后开启第二轮：B10（P2 数据丢失修复）+ B11/B12（P2 迁出/校验脚本），三项全部完成并本地提交（55342082c → 210b971e6，均未 push；远端同步由并行协作线负责）。

### ✅ 本次完成
- **B10 master-data 快照窗口数据丢失修复**：根因 = U4 的 10 个 MDM 模块写 handler 只改内存 store，靠 main.rs 3s tokio ticker 兜底 flush，SIGKILL 丢 ≤3s 最近写。
  - `svc/master-data/src/modules/mod.rs` 新增 flush_on_write 中间件（POST/PUT/PATCH/DELETE 响应后立即 flush_all()）+ is_write_method 纯函数 + 单测；**layer 置于 create_routes() 末尾**（axum Router::layer 只作用于调用时已注册路由——曾先 layer 后 nest 导致中间件不生效，e2e 证伪后修正）
  - `svc/master-data/src/modules/persist.rs` init() 拆逐条 DDL（SQLx prepared statement 不支持多命令，bootstrap 曾一直失败）
  - 验证：master-data 单测 451/451 绿；e2e 另起实例（8097/8098）POST 后**立即查库** immediate_persisted=true（两轮独立验证：probe4 / e2e-final-probe2）
  - 说明：SIGKILL 完整 e2e（kill→重启→load-on-boot 恢复）受并行线旧实例（/Users/air/topems release，8090/11824，3s ticker 周期覆盖共享表）约束无法独占验证；"写后立即持久化"机制已被 immediate 实测证明，重启恢复为 U4 load-on-boot 既有能力
- **B11 form_assistant 迁出独立位置**：`lib/src/form_assistant/`（23 文件）git mv → `svc/ai/src/form_assistant/`；`lib/src/lib.rs` 移除 `pub mod form_assistant`（门面引用=0）；svc/ai lib.rs/main.rs 声明模块（bin crate 独立 root，需双侧声明），ai_form 引用 `topems_shared::form_assistant` → `crate::form_assistant`
  - 验证：topems-ai 编译 0 错误；ai 单测 1190/1190 绿；全仓 grep 无残留 topems_shared::form_assistant
- **B12 services.yaml↔nginx.conf 一致性校验脚本**：`scripts/ci/check-config-sources.cjs` 新增 F/G/H 三节——F: nginx upstream 端口/名称↔services.yaml（值级+死 upstream）；G: map 路由表引用 upstream 自洽（防运行时 502）；H: map 路由前缀可解析到 services.yaml 服务（防拼写漂移）；补别名 report→bi / plugin→plugin-registry / aps→mes
  - lefthook `ports-consistency` 钩子 STAGED 清单加入 apps/web/nginx.conf
  - 验证：`--check` 全绿（38 服务/27 upstream）；负向篡改 erp 端口 8010→8015 被 F 拦截（`erp_service=8015 与 services.yaml erp=8010 不一致`）后还原

### 验证总览（第二轮）
- cargo check --workspace 0 错误（36.8s）；master-data 451、ai 1190、shared 单测绿
- e2e：POST 后立即查库 immediate_persisted=true（B10 核心主张实测）
- B12 脚本：正向全绿 + 负向拦截验证

### ⬜ 未完成（本轮范围外）
- **可执行未排期**：B7（L 级分批）
- **决策项跳过（用户拍板暂不处理）**：B1（search→erp 白名单撤销）、B14（守卫重构）、B15（埋点）、A2（5433 docker）、A5（erp RLS）
- **环境阻塞**：A1（nginx 生产 conf 需 Linux/生产环境）；5433 仍 DOWN、nginx 未运行；SIGKILL 完整 e2e 需独占实例环境（并行线 11824 周期覆盖共享表）

## 2026-10-05 B7 分批推进（第 1-2 批：svc/srm + svc/rd 完成，本地提交未 push）

> 用户「继续」后开启 B7（U7 残留：静态 error() TopemsError 化 / ADR 阶段二）。B7 为 L 级（1313 处静态文案 + anyhow 清退），按「每服务分批」推进；本批完成 srm/rd 两个小服务的 anyhow 清退 + 静态 Err TopemsError 化，形成可复制模板。提交 d2bfb24ce / 1f203fe39，均未 push。

### ✅ 第 1 批：svc/srm（d2bfb24ce，15 文件）
- 14 个 modules 文件 `use anyhow::Result;` → `use topems_shared_core::error::Result;`（Result 别名同位置替换，函数签名不变）
- inquiry.rs `create_routes -> Result<Router, anyhow::Error>` 完全限定移除
- scoring_dimension.rs `weighted_score -> Result<f64, String>` → `Result<f64>`，4 处静态 `Err("...")` → `TopemsError::ValidationFailed(...)`
- 保留（ADR 合规）：main.rs anyhow（进程边界）；supplier_evaluation 闭包与 data_sync 的 `std::result::Result<_, String|sqlx::Error>`（内部校验/sqlx 专用，4xx 静态文案按设计走 ApiResponse::error）
- 验证：topems-srm 编译 0 错误；单测 559/559 绿；srm 业务层 anyhow=0

### ✅ 第 2 批：svc/rd（1f203fe39，2 文件）
- project_repository.rs / project_service.rs `use anyhow::Result` → `topems_shared_core::error::{Result, TopemsError}`
- `anyhow::anyhow!(TopemsError::NotFound(...))` 去 anyhow 包装直接返回 TopemsError
- 验证：topems-rd 编译 0 错误；单测 155/155 绿；rd 业务层 anyhow=0

### 门禁变化（scripts/ci/check-error-handling.cjs）
- 业务层 anyhow：70 → **52**（-18；srm -15 + rd -3）
- 泄露面 413 不变（本批为 anyhow/静态文案，非泄露形态）
- 注意：`Result<` 别名的坑——`topems_shared_core::error::Result` 是单参类型别名，`Result<_, String>`/`Result<_, sqlx::Error>` 等双参形态须用 `std::result::Result<_, _>` 完全限定

### ⬜ B7 剩余（后续批次候选，按业务层 anyhow 计数）
- svc/server（41）/ lib/shared-ai（24）/ svc/integration（22）/ svc/analytics（13）/ lib/shared-bootstrap（10）/ svc/ai（9）/ lib/shared-core（9）/ svc/unified-core / ticket / erp（各 4）等
- 注意 analytics 的 JobScheduler trait（`type Err = anyhow::Error`）等约束型 anyhow 需单独策略

### 其他未完成（不变）
- 决策项跳过（用户拍板暂不处理）：B1/B14/B15/A2/A5
- 环境阻塞：A1（生产 nginx conf 需 Linux）；SIGKILL 完整 e2e 需独占实例环境（并行线 11824）

## 2026-10-05 B7 分批推进（第 3-4 批：server anyhow 清退 + 门禁归零，业务层 anyhow 70→0）

> 承接同日第 1-2 批（srm/rd），本批完成 server 清退与门禁豁免登记。提交 6e9f69362 / 750494b29，均未 push。

### ✅ 第 3 批：svc/server + shared-core（6e9f69362，30 文件）
- **shared-core 新增 `impl From<anyhow::Error> for TopemsError`**：收敛为 Internal 变体（classify 脱敏，客户端仅收通用「内部服务器错误」）；防泄露单测向量加入 anyhow 转换变体（100/100 绿）——该 impl 解锁所有 anyhow → TopemsError 的 `?` 传播
- server 29 个 *_real_module/subscription_module：`build() -> anyhow::Result<Self>` → `-> Result<Self>`（TopemsError::Result 别名）
- 11 处 `anyhow::anyhow!/bail!` 初始化错误 → `TopemsError::internal(context, e)`（DATABASE_URL → `EnvVarNotSet`）
- 验证：cargo check --workspace 0 错误；server modules anyhow=0

### ✅ 第 4 批：门禁豁免登记（750494b29，1 文件）
- analytics report scheduler 的 JobScheduler<'_> trait 绑定型 anyhow（`type Err = anyhow::Error`）显式豁免——第三方 trait 关联类型无法改 TopemsError，登记非漂移
- **门禁业务层 anyhow：70 → 0**（ADR 阶段二 anyhow 清退子项达成；仅 main.rs 进程边界合法保留）；泄露面 413 不变

### B7 剩余（继续分批候选）
- **静态 `Err("...")`/`Result<_, String>` TopemsError 化**（1313 处无插值静态文案，ADR 明确不在泄露面；含各服务内部校验函数，需逐服务按语义映射 ValidationFailed/BusinessLogic 等）——L 级主体，后续批次按服务推进
- finance 386 处 `.to_string()` 直出（无上下文文案，ADR 指定为 TopemsError 规范参考试点，需先定业务上下文策略）

### 其他未完成（不变）
- 决策项跳过（用户拍板暂不处理）：B1/B14/B15/A2/A5
- 环境阻塞：A1（生产 nginx conf 需 Linux）；SIGKILL 完整 e2e 需独占实例环境（并行线 11824）

## 2026-10-05 方向③收尾 + B7 第 5 批（本地提交未 push）

> 用户按建议推进：先快赢收口（方向③遗留 + U3b 闭环），再 B7 静态文案分批（mobile/lims）。

### ✅ 方向③收尾（commit 4fbe20af0，2 迁移文件）
- **rd status 默认值落迁移**：`20261005000001_rd_status_default_active.sql`（ALTER rd.builds/deploys
  status SET DEFAULT 'active'，live 已生效、迁移固化；topems_app owner 双库应用幂等通过）
- **U3b 骨架表依赖链闭环（真缺口修正）**：U3b（20261003000002）DROP lims.qa_lab_samples/tasks 被
  lims 业务表 FK 依赖阻止（**声称"重放通过"实为未删净**）——新迁移 `20261005000002_lims_qa_lab_fk_repoint.sql`
  先把 5 个 FK（records→tasks、sample_lifecycle/inspection_reports/rfid_tags/sample_barcodes→samples）
  改指 public 事实标准表（与代码显式 public 引用一致）再 DROP 骨架；终态残留 0、幂等重放 0 错误；
  lims 其余 11 个 qa_lab_* 业务表（reagents/instruments/records 等）为 lims 真实在用表保留
- 5433 Homebrew 实例目录已被并行环境清理（U3b 重放历史已由排期项 1 全量完成），无恢复必要

### ✅ B7 第 5 批：mobile/lims 静态 Err TopemsError 化（commit 975bd32e3，4 文件）
- mobile：extract_user_id_from_token → `Result<String, TopemsError>`（AuthenticationFailed/InvalidToken）；
  validate_scan_result 5 处 + parse_barcode 1 处 → ValidationFailed（含 format! 插值包 ValidationFailed）
- lims：validate_barcode 3 处 → ValidationFailed；测试断言改 matches! 模式匹配（TopemsError 无
  PartialEq——曾试 derive 被含 io/serde_json/sqlx/reqwest Error 的变体阻断，撤回改 matches!）
- 调用方（barcode_scanner 4 处 match Err(_) 忽略内容）零影响
- 验证：编译 0 错误、clippy 0 警告、单测 mobile 149 + lims 245 全绿
- **mobile 静态 Err = 8→0、lims = 8→0**（本批清零两个小服务）

### ⬜ B7 剩余（后续批次候选，静态 Err 计数）
- ai 45 / crm 27 / portal 26 / integration 15 / mes 10 / finance 9 / scm 3 / erp 3 / analytics 3 /
  wms 2 / master-data 2 / unified-core 1（+ 各服务 Result<_, String> 双参形态与
  finance 386 处 to_string 试点待定策略）
- 模式固化：ValidationFailed 语义映射 + matches! 断言模板可直接复制

### ✅ B7 第 6 批：crm 静态状态码 Err TopemsError 化（commit 101d1b05a，4 文件）
- opportunity/aftersales can_transition → `Result<(), TopemsError>`：NOT_OWNER→OperationNotAllowed、
  TERMINAL_CANNOT_TRANSITION→BusinessLogic、INVALID_TRANSITION→ValidationFailed
- 消费点：2 处 match（推进/回退 403/400）+ 2 处兜底 api_error 改 `&e.to_string()`；
  aftersales 4 处 `if let Err(e)`（e 进 format!，TopemsError Display 语义更友好）
- 测试：opportunity_fsm_test 4 处 + return_fsm_test 9 处 assert_eq unwrap_err → matches!
- 验证：编译 0 错误、clippy 0 警告、单测 504/504 全绿
- **crm 静态 Err = 27→0**；累计清零：mobile 8 + lims 3 + crm 27 = 38

### ✅ B7 第 8 批：共享库静态 Err TopemsError 化（commit 65842422f，8 文件）
- deployment.rs check_tenant_access → OperationNotAllowed（文案中文化「租户不匹配」）
- approval.rs validate_start_approval/validate_approval_decision → ValidationFailed/BusinessLogic
  （含同函数内 format! 错误一并迁移；业务状态冲突「已有/没有进行中的审批」→BusinessLogic）
- data_governance.rs process_access/erasure_request → ValidationFailed/ResourceNotFound
  （ok_or("Request not found")→ResourceNotFound「请求不存在」；right_type 校验→ValidationFailed）
- shared-dsh resource/tool/prompt validate_uri/validate_name → ValidationFailed
  （Cargo.toml 新增 topems-shared-core 依赖；register 消费点 map_err 适配 e.to_string()）
- 验证：全仓静态 Err(" 业务残留 = **0**；cargo check 0 error 0 warning；单测 963 全绿
  （shared-core 790 + shared-db 152 基线 + shared-dsh 21）；pre-commit 23 项全绿（提交时复验）
- 保留不动：enhanced.rs/metrics.rs 6 处 `&str` 错误类型测试（非 String 迁移对象）

### ✅ B7 第 9 批：共享库 Err(format!) TopemsError 化（commit 2ba067a82，6 文件）
- rate_limit_enhanced validate_timestamp → ValidationFailed（无效时间戳/超容差，含 parse map_err 连锁）
- permission validate_permission_code 4 处 → ValidationFailed（模块码/动作/数据范围/段数）
- health check_http_health → ServiceUnavailable（「无法连接服务」）+ 消费点 e.to_string() + 测试断言适配
- plugin generate/verify_plugin_install_token → ValidationFailed/AuthenticationFailed
  （Invalid RSA key→ValidationFailed、JWT verify→AuthenticationFailed、scope→ValidationFailed，含 map_err format! 连锁）
- service_config get_startup_order → ConfigValidation（循环依赖）+ 内部 visit 闭包签名同步
- schema_registry check_type → ValidationFailed + add_error 消费点适配 e.to_string()
- 验证：全仓 Err(format!) 业务残留 = **0**；cargo check 0 error 0 warning；
  三库单测 1383 全绿（shared-auth 227 + shared-core 790 + shared-event 366）；pre-commit 23 项全绿
- B7 累计：静态 Err 55 处 + Err(format!) 9 处（含连锁 map_err）= 清零；
  剩余形态：map_err(format!) 417 处 + Result<_, String> 465 处（后续批次候选）

### ✅ B7 第 10 批：integration + shared-event map_err(format!) TopemsError 化（commit 0618e3377，12 文件）
- integration 106 处 map_err(format!) → 语义变体（DatabaseQuery 73 / ValidationFailed 20 / NetworkRequest 6 / BusinessLogic 1）
  - 同步记录/任务队列/同步日志/获取订单ID → DatabaseQuery；请求MES/ERP/HTTP → NetworkRequest；
    响应解析/无效ID（Uuid::parse_str）→ ValidationFailed；业务事件编排 → BusinessLogic
- mes_erp_sync 8 处 String 签名 → TopemsError（find_erp_order_by_mes_id/create_sync_record/
  update_sync_success/update_sync_failed/add_sync_log/list_sync_records/get_sync_record/get_sync_logs）
  ——消费点（handlers/mes_erp.rs）Display 兼容零改动
- event_handlers 适配：末表达式包 Ok+? 经 From<TopemsError> for String 桥接；HandlerResult 保持 String
  （subscribe_handler 签名写死 Result<(), String>——R-6 注释约束，泛型化留共享库后续批）
- async_task_queue/sync_scheduler 补 TopemsError import（crate 依赖已有）
- shared-event parse_payload → ValidationFailed + 签名 TopemsError（连锁 111 处调用方经桥接兼容）
  + 测试断言适配（contains→to_string）+ 清理 unused FromStr import
- 验证：全仓 map_err(format!) 417→310（integration+shared-event 归零）；cargo check 0 warning；
  shared-event 366 全绿；pre-commit 23 项全绿
- 剩余：map_err(format!) 310 处（ai/mes/hrm/finance/wms/unified-core/srm/scm/rd/portal/pm/pdm/mobile/lims/gis/erp/ehs/crm/communication/analytics 散点）

### ✅ B7 第 11 批：erp map_err(format!) TopemsError 化（commit 1226c668d，1 文件）
- erp event_handlers 51 处 map_err(format!) → 语义变体
  - 事务开启/提交、凭证/订单/幂等账本查询创建更新 → DatabaseQuery（47 处）
  - 事件 payload 解析（serde_json）→ ValidationFailed（10 处）
- 验证：全仓 map_err(format!) 310→259；cargo check 0 warning；pre-commit 23 项全绿
- 剩余：map_err(format!) 259 处（ai 92 / finance 26 / scm 19 / unified-core 15 / wms 14 / mes 13 / gis 10 / crm 10 / pm 9 / mobile 9 / srm 7 / rd 6 / hrm 6 / communication 6 / ehs 4 / portal 3 / pdm 3 / server 2 / lims 2 / analytics 1）

### ✅ B7 第 12 批：ai document.rs map_err(format!) TopemsError 化（commit 6b370e2f9，1 文件）
- document.rs 44 处 map_err(format!) → 语义变体
  - 文件解析/编码/打开失败 → FileFormatError（28 处：解析 PDF/CSV/JSON/DOCX/XLSX/PPTX 等、编码错误、无法打开）
  - 文档记录/分块 sqlx → DatabaseQuery（6 处）
  - 读取/保存临时文件/元数据 → FileOperation（3 处）
  - 调用 AI API/下载 → NetworkRequest（2 处）；解析 AI 响应 → ValidationFailed（1 处）
- 6 处 String 签名 → TopemsError（delete_document/list_documents/get_document/get_document_chunks/
  extract_text_from_data/save_chunks_and_vectors）——调用方 qa.rs/modules/handlers 零适配（Display 兼容）
- 验证：全仓 map_err(format!) 259→215；cargo check 0 warning；pre-commit 23 项全绿
- 剩余：map_err(format!) 215 处（ai 其余 48 / finance 26 / scm 19 / unified-core 15 / wms 14 / mes 13 / gis 10 / crm 10 / pm 9 / mobile 9 / srm 7 / rd 6 / hrm 6 / communication 6 / ehs 4 / portal 3 / pdm 3 / server 2 / lims 2 / analytics 1）

### ✅ B7 第 13 批：ai 其余 48 处 map_err(format!) TopemsError 化（commit d326051d8，7 文件）
- qa/recommendation/analysis/agent/pdf/event_handlers/multi_agent 48 处 → 语义变体
  - 问答历史/usage 日志/用户画像/文章 sqlx → DatabaseQuery（26 处）
  - 推荐结果/事件 payload/AI 响应解析 → ValidationFailed（13 处）
  - 调用 AI API/生成嵌入/决策工具/消息发送 → NetworkRequest（7 处）
  - PDF 任务/加载 → FileOperation（2 处）
- 3 处 String 签名 → TopemsError（call_ai_api/generate_query_embedding/call_ai_api_with_usage）
- qa/recommendation 补 TopemsError import
- 验证：全仓 map_err(format!) 215→167；**ai 全部清零**；cargo check 0 warning；pre-commit 23 项全绿
- 剩余：map_err(format!) 167 处（finance 26 / scm 19 / unified-core 15 / wms 14 / mes 13 / gis 10 / crm 10 / pm 9 / mobile 9 / srm 7 / rd 6 / hrm 6 / communication 6 / ehs 4 / portal 3 / pdm 3 / server 2 / lims 2 / analytics 1）

### ✅ B7 第 14 批：中部服务合并批 map_err(format!) TopemsError 化（commit 6100ad4ea，11 文件）
- finance/scm/unified-core/wms/mes 85 处 → 语义变体
  - 快照/凭证/审计日志/供应商/入库单/生产订单 sqlx → DatabaseQuery（46 处）
  - 事件 payload/字段/邮箱/日期解析 → ValidationFailed（35 处）
  - 发送邮件/订阅者创建 → NetworkRequest（3 处）；密码哈希 → BusinessLogic（1 处）
- 5 处 String 签名 → TopemsError（audit_integration record_* ×4 + work_report parse_report_date）
- 消费点适配：ApiResponse::error(400, &e) → &e.to_string()（work_report 2 处）
- 7 文件补 import + smtp 重复 import 清理 + projector unused 清理
- 验证：全仓 map_err(format!) 167→82；cargo check 0 warning；pre-commit 23 项全绿
- 剩余：map_err(format!) 82 处（gis 10 / crm 10 / pm 9 / mobile 9 / srm 7 / rd 6 / hrm 6 / communication 6 / ehs 4 / portal 3 / pdm 3 / server 2 / lims 2 / analytics 1）

## 2026-10-06 契约面收口 + RLS 治理 + 门禁固化（全链路闭环）

> 承接 10-05 mobile 契约面收口主线，扩展至 web(portal) 契约面、全库 RLS 治理、硬编码租户对齐、双门禁固化与全仓实例统一。全部本地提交未 push（除既有主线提交链）。

### ✅ mobile 契约面收口（已完成闭环）
- 117 端点静态核对 → 页面级缺口 9 批 + 死代码兜底 3 批 → 25 上游实例刷新 → 全量实跑冒烟 117/117
- 冒烟脚本固化 + Gate MCS 门禁（b908f9a0b）：触发 apps/mobile/src/api|svc/mobile/src|lib/shared-service-client，离线 SKIP、在线全量实跑
- WARN 根因排查修复（e6f5efd99，12 类根因：Uuid bind/check 约束/缺列 from_row/路由 405/脚本 POST_BODIES 不符等）→ 117/117 零 FAIL

### ✅ web(portal) 契约面收口（组织者 o_000cunERH90 执行，thread 57596950730198018）
- svc/server BFF 5081 路由对静态核对 + 带 token 实跑判定；33 服务批次 + 二轮 16 commit + RLS 迁移收敛 **1363→39→0**
- 关键根因：master SEARCH_PATH `master_data, public, shared`（dict 500→404，schema-registry 显式 public. 前缀）；communication BFF 挂载对齐前端 base；workflow flow schema 无防护 RLS 策略 DROP（20261006000002→0000 重排，幂等）
- web 冒烟脚本固化（c0235ed19）：4152 去重端点、现签 token、FAIL 判据对齐 mobile（500 记 FAIL/4xx 记 WARN）
- **前端双前缀 39 项真修复（894f7c48a）**：38 双前缀拼接 + 2 模板提取异常 → 4135/4135 真全绿、load_expected_fails 豁免机制移除
- **5 后端真缺口补实现（558bbf82e）**：copilot records/context 真实写入、documents download、governance metrics/export → 4139/4139
- Gate WCS 门禁（d06b8500c）：触发 apps/web/src/api|apps/web/src/utils/apiPath.ts|svc/server/src|lib/shared-service-client

### ✅ 全库 RLS 治理（212 条清除，27 个幂等迁移 20261006000003-0029）
- 危险形态 `tenant_id = (current_setting(...))::uuid` 无 NULLIF/空串防护 → DROP（同表保留 tenant_isolation_* 安全策略）；判定 SQL：`qual LIKE '%current_setting(%' AND qual LIKE '%::uuid%' AND qual NOT LIKE '%NULLIF(current_setting%'`
- 硬编码租户 25 处写路径对齐（4 批：924d576aa unified-core / 7750ec651 mobile+hrm / caadcee5d crm / 028589755 wms）：超管→NULL、用户→claims.tenant_id、COALESCE 零 uuid 解码
- 部署暴露缺口收口（50e81047e）：barcode 随机租户（Uuid::new_v4 反模式）+ 读路径 5 处 SELECT COALESCE + RLS 不可见残留行清理（register 500 真根因）

### ✅ 全仓实例统一（27 重建 + 双实例重建，零漂移）
- 27 个 Oct 5 旧代码镜像实例逐个重建（kill→端口释放→nohup→健康检查），新 PID 对照表完整交付
- :8099 BFF（44753 终态）与 :8070 mobile（36660）重建部署全部修复生效；心智链路 /api/core/flow 4/4 200
- 终态冒烟：**web 4139/4139 PASS 0 FAIL exit=0**；mobile 117/117；pre-commit 23 项全绿（MCS/WCS 实跑）

### ⬜ 遗留待办
- **并行会话 WIP 归属待确认（未触碰）**：svc/finance 3 个 M（settlement_center/service.rs、finance/collection.rs、finance/payment_record.rs）+ svc/unified-core 6 个 M（master/handlers.rs、tenant/handlers.rs、business_tools/{audit_export_api,permission_audit_log,permission_export_import_api,permission_store_factory}.rs）；flow 迁移重排 `20261006000002→0000`（内容逐字节相同，建议归属方 git mv 提交）；.sqlx 删除若干 + `.sqlx/query-57ec2a25...json` 新增；长期未跟踪 lib/Cargo.lock、shared/、svc/migration-sdk/
- 潜伏：读路径默认租户回退（pm/rd/gis/flow 等，有意保留已标注非缺口）
- 决策项跳过（用户拍板暂不处理）：B1/B14/B15/A2/A5
- 环境阻塞：A1（生产 nginx conf 需 Linux）；SIGKILL 完整 e2e 需独占实例环境（并行线 11824）

### ✅ B7 第 15 批：收尾批 14 服务 map_err(format!) TopemsError 化（commit f0a9c2e86，22 文件）
- gis/crm/pm/mobile/srm/rd/hrm/communication/ehs/portal/pdm/server/lims/analytics 77 处
  - 事件 payload 解析/位置路径解析/邮箱校验/user_id 解析 → ValidationFailed（55 处）
  - 插入/查询/写入/更新/余额锁读取 → DatabaseQuery（20 处）
  - build message → NetworkRequest（2 处）
- 5 处变体形态（{e} 内联/多参数 format）：dataset_whitelist/erp-e2e-cli×2/projector/tenant handlers
- 3 签名 String → TopemsError（build_message/resolve_employee_id_from_req/resolve_leave_employee_id）
- 消费适配：mail.rs 3 处测试断言 + sql_injection_tests is_empty→to_string
- 34 文件补 import + 20 文件重复 import 清理 + chart_service/projector 误删补回
- 验证：全仓 map_err(format!) 82→0（Err(format!) 已于第 9 批清零）；cargo check 0 warning；单测 communication 192/hrm 129/analytics 417 全绿；pre-commit 23 项全绿

### 🏁 B7 里程碑：map_err(format!) + Err(format! 全仓双清零
- 累计迁移 487 处（静态 Err 113 + Err(format!) 55 + map_err(format!) 399 + 签名 20+）
- 剩余形态：Result<_, String> 465 处（下一候选批，待用户定）

### ✅ B7 第 16 批：业务层 Result<_, String> 清零（本地提交未 push）

> 用户「推进后端 B7 收尾」拍板执行。TODO 原口径「Result<_, String> 465 处」为 10-05 宽口径快照（含注释/误命中/并行线已改），
> 实测复查：精确形态（第二类型参数=String）全仓 153 处 = svc 业务层 7 + svc tests 48 + apps/desktop(Tauri) 98。
> 本批完成服务端业务层 7 处（ADR 阶段二/三范畴）；tests 与 desktop 保留（测试辅助代码无客户端出口；
> Tauri command 返回 Result<T, String> 为框架惯例，建议另立任务处理）。

- **5 个 event_handlers start_event_subscribers**（lims/crm/ehs/hrm/mobile）：`Result<(), String>` → `Result<(), TopemsError>`；
  `build_subscriber().map_err(|e| e.to_string())` → `TopemsError::internal("构建事件订阅者失败", e)`（hrm 另有
  `EventSubscriber::new` 同样 internal 化）；main.rs 调用方 `tracing::warn!("...: {}", e)` 零改动（Display 兼容）
- **hrm record_cache_invalidation**：`Result<uuid::Uuid, String>` → 直接 `uuid::Uuid`（函数实际永不 Err，双分支均 Ok，签名冗余消除）
- **analytics execute_bi_sql**：`Result<(Vec<String>, Vec<Value>), String>` → `Result<_, TopemsError>`；
  非只读预检 → ValidationFailed（客户端文案逐字保留）；**用户 SQL 语法/执行错误 → ValidationFailed 回显**（BI SQL 测试工具核心反馈，
  非内部状态泄露）；连接/只读事务/结果列缺失/读取/解析失败 → TopemsError::internal（细节仅进日志，客户端收「内部服务器错误」）；
  两个调用方（query_dataset/test_sql_query）`Ok(Err(e))` 改 `e.classify()` 取 msg（原 `Ok(Err(msg))` 直出细节的行为收口）
- 验证：cargo check 6 服务 0 error 0 warning；单测 lims/mobile/crm/ehs/hrm/analytics 全绿（246/149/504/251/293/192，0 failed）；
  clippy --all-targets 无新增 warning（既有 training.rs:1147 items-after-test-module 与本次无关）；
  业务层 Result<_, String> 复查 0 处；check-error-handling --changed-only 无命中
- **业务层 Result<_, String> 全仓归零**（B7 剩余形态再清一项；累计：静态 Err 113 + Err(format!) 55 + map_err(format!) 399 + 业务层 Result<_, String> 7）
- 剩余（非业务层，建议另议）：~~svc tests 48 处~~（已清零，见第 17 批）
  + ~~apps/desktop 98 处~~（已清零，见第 18 批）

### ✅ B7 第 17 批：svc tests 48 处清零（与并行线协作完成，已推送 origin/main）

> 用户「需要处理这两块」拍板：svc tests 48 处 + apps/desktop 98 处。执行中检测到并行协作线同步在做同一迁移，
> 双方方案一致（ValidationFailed 语义映射、中文文案、消费点 Display 兼容零改动）；并行线完成提交并 rebase 合并
> 第 16 批业务层提交（abb44dee0/cf9304819）后一并推送 origin/main。

- **unified-core 42 处**（commit ba7f90647，19 文件）：tests/common/mod.rs request/login/login_admin 签名 + 6 处错误构造
  → `TopemsError::ValidationFailed(format!(...))`；19 个 *permission_tests.rs login/auth_request 签名 + Err/map_err(format!)
  包 ValidationFailed（qms 额外 no_auth_request）
- **master-data 3 处**（commit 4caccedfd）：tests/common/mod.rs request/v60_request/login_admin + unsupported-method/send map_err/login 三段构造
- **finance 2 处**（commits 43c110d86 + fe75526f2）：tests/common/mod.rs login/login_admin（43c110d86 仅加 use，fe75526f2 补全签名与构造）
- **crm 1 处**（commit fe75526f2）：crm_tests.rs check_permission → `Result<(), TopemsError>`，`Err(OperationNotAllowed(format!("权限不足：需要 {} 权限")))`
- **修复（本会话）**：fe75526f2 的 crm_tests.rs `mod permission_logic_tests` 缺 `use super::*;`（其余 mod 均有）→
  `TopemsError` 在模块内 E0433 未解析 + 顶层 use 报 unused → 补齐 `use super::*;`，编译通过
- 验证：cargo test --no-run（unified-core/master-data/finance/crm）全绿 0 error；svc tests 全仓复查 `Result<_, String>` 0 处
- 剩余：~~apps/desktop 98 处~~（已清零，见第 18 批）

### ✅ B7 第 18 批：apps/desktop(Tauri) 98 处清零（DesktopError 本地类型，协作完成）

> 用户「需要推进」拍板处理 desktop 98 处（Tauri IPC/keystore）。desktop 无法直接引用 `TopemsError`：
> 该类型无 Serialize derive，而 Tauri `#[tauri::command]` 错误必须 Serialize 才能传前端；且 desktop crate 不依赖
> topems 共享库。方案：desktop 内新建本地错误类型 `DesktopError`，序列化输出为纯字符串——前端 invoke catch
> 接收形态与迁移前完全一致（已核前端仅 console.error，无错误内容解析）。

- **新建 `src-tauri/src/error.rs`**：`pub struct DesktopError(pub String)` + `Display`（日志/断言用）+ `From<String>`/`From<&str>`
  （`?` 传播自动转换）+ `From<DesktopError> for String`（兼容 `ApiResponse::err(e)` 的 `impl Into<String>`）
  + 手动 `Serialize`（`serialize_str`，前端零影响）
- **迁移 11 文件 98 处签名 + 48 处错误构造**：`Result<_, String>` → `Result<_, DesktopError>`；
  34 处 `map_err(|e| format!)` + 7 处 `Err(format!)` + 7 处 `Err("...".to_string())` 脚本批量替换
  （全文正则 + 全文件括号配平补右括号，含跨行 format!）；动态 String 点（`Err(err)` 变量、
  `ok_or_else(|| "...".to_string())`、`Err(last_error.unwrap_or_else(...))`）与 keystore `UnlockError`
  桥接（master_key.rs map_err 闭包、commands.rs `StrongholdInitFailed` → `e.into()`）由并行线协作完成
- **测试适配**：integration_test.rs 2 处 `unwrap_err().contains(...)` → `unwrap_err().to_string().contains(...)`
  （DesktopError 无 String 的 contains 方法）
- 验证：cargo check 0 error 0 warning；clippy 0 error（9 个既有 warning 位于窗口/托盘/菜单区，与本次无关）；
  单测 23 passed 0 failed；全仓复查 `Result<_, String>` 0 处（error.rs 注释已中性化）
- **B7 全形态清零收官**（累计：静态 Err 113 + Err(format!) 55 + map_err(format!) 399 + 业务层 Result<_, String> 7
  + svc tests 48 + desktop 98）

---

## 🔧 前端 UI 审计批次（2026-10-07）

### P0（止血）
- ✅ **ESLint resolver 噪音清零（恢复 lint 门禁信号）**：根因=apps/web 配置 `import/resolver: {typescript}` 但 `eslint-import-resolver-typescript` 未安装 → 每文件 5 条 Resolve error 噪音（crm/hrm 233 条全为噪音）。修复=安装 `eslint-import-resolver-typescript@4.4.5`；验证 crm+hrm 233 条 → **0 警告 0 错误**
- ✅ **FieldSelector 全局监听泄漏修复**：`FieldSelector.tsx` onMouseDown 每次点击向 document 挂 dragover/drop 监听且永不移除，且 `getData('index')` 无 setData 来源（拖拽实际失效）→ 重构 React 合成事件完整拖拽，无全局监听
- ✅ **mobile approval.ts 重复端点清理**：getTasks 与 getApprovals 同端点 `/approval/tasks`（getTasks 零引用已删）；approve/reject 两对提取共享实现（approveTask/rejectTask），API 面不变

### P1（收敛）
- ✅ **设计令牌违规清零（159 → 0）**：真实违规 159 处（hardcoded 101 / rgba 48 / box-shadow 4 / fixed-px 6）全部清零。手段：① 脚本豁免升级（`var(--token, fallback)` 兜底、box-shadow 已引用 `var()`、HTML 实体 `&#039;` 前置 `&` 判断、redesign-tokens/global 令牌定义源、GIS 热力色带 canvas 动态 alpha）；② tokens.css 补 7 变量（violet/fuchsia/teal-500、text-on-accent、shadow-side/topbar、space-0-5）；③ redesign 组件（SideRail/TopBar/Avatar/Toggle）与 MUI 页面（GovernanceDashboard/EHSBadges/WorkflowApprovals/ProductionGantt/MobileLayoutV3）变量化；④ DataAssetCatalogPage 3 组业务色板迁移 theme/presets.ts（豁免区）；⑤ chartTheme rgba → alpha(designTokens.colors.cyan[500])。验证：脚本 0 违规 / eslint 0 / tsc 0。提交 85bfadf11（14 文件 +85/−62）已推送
- ✅ **组件收敛（第一批）**：StatusBadge 5 份 Tailwind 实现（wms/tms/aps/qms/mes）逻辑合一——common/StatusBadge.tsx 由占位假组件升级为唯一通用实现（扁平 colors/FSM fsmColors/labelMap/fallbackColor 双回退派别），模块文件保留业务映射数据、函数体瘦身 1 行委托；清理 3 个占位/死组件（common/EmptyState.tsx 零消费、common/ConfirmDialog.tsx 占位假组件、common/LoadingSpinner.tsx 零消费）+ 对应 3 测试 3 stories，索引 EmptyState 改 re-export shared（消费方零改动）。验证：tsc 0 / eslint 0 / vitest 94/94。提交 4f02796a2（20 文件）已推送
- ✅ **P1-3 跨包双轨收敛**：BackButton 双轨合一——删除 web 本地增强版（129 行，4 variant，home/close 经查零调用），common/index.ts re-export @topems/shared-components（router 感知 + href + RouterBoundary），10 调用方零改动；测试 10/10。提交 19f5eb677（+2/−235）已推送。**评估结论**：FileUpload 双轨保留（common 530 行受控表单版 value/onChange vs shared 294 行非受控版 onUpload，API 形态不同，合并需 shared 大改，留待共享包统一规划）；页面私有 ConfirmDialogs×2 为 shared ConfirmDialog 业务组合器（非重复实现）保留；Pagination/ConfirmDialog/LoadingSpinner 已由 shared 提供
- ✅ **模板瘦身：ListPageTemplate 拆分（第一批）**：行内编辑状态机 → list/useInlineEdit.ts、内联编辑单元格 → list/InlineEditCell.tsx，主文件 4153→4001 行（727fbf4b3 已推送）
  - 第二批候选（CRUD 表单状态区 806-1100 耦合度高，暂缓）：表单状态/校验/自动渲染与 FormDialog 深度交织，硬拆风险大于收益，待模板整体收敛后再评估
- ✅ **页面三态补齐（完成，10 批，累计接线 48 页）**：加载/空态/错误三态；模板层空态能力 + 全模块分批接线（提交 7634d799a / 9f5a05db5 / 9e965c9d2 / 1b22fbec6 / cf285642c / 640214269）
  - ✅ 模板：DetailPageTemplate / DashboardTemplate 新增 emptyState prop（默认关闭，向后兼容，含 i18n k 文案 zh/en）
  - ✅ 前 4 批 14 页：crm（Customer/Contact/Opportunity/Return Detail + Dashboard×2）hrm（Employee/Contract Detail）erp（Dashboard）pm（Contract/Project Detail）lims（Sample/Task/Instrument Detail）
  - ✅ 第 5-9 批 31 Detail 页：wms 7（Inbound/InventoryMovement/Outbound/StockTake/Transfer/WavePick/Supplier）+ qms 7（Apqp/AuditPlan/EightD/Fmea/Inspection/Issue/Standard）+ tms 6（Carrier/Driver/Route/Shipment/TransportPlan/Vehicle）+ aps 6（Capacity/Forecast/MaterialPlan/PlanComparison/ProductionPlan/Schedule）+ ehs 1（Hazard）+ mes 2（Equipment/ProductionOrder）+ finance 2（Budget/Voucher）；im 无 Detail 页（MailPage 为主从布局）
  - ✅ 第 10 批 Dashboard 评估接线：接线 3（wms summary / qms effectiveOverview / finance statsData）
  - 📝 Dashboard 跳过 8 页（空态语义不适用/无法单一判定，各批提交信息有详因）：hrm×2（多查询无单一数据变量）+ pm（多查询无主导、statsData 恒对象、图表 mock 兜底）+ tms（loadingQuery dummy 与数据脱钩、dashboardData 恒真值）+ aps（查询返回数字 total 0 为有效态、图表/半数统计卡硬编码 mock）+ ehs（queryFn 固定 return null、数据走 schema 状态）+ mes（全本地 useState 多数组）+ im（纯静态无数据源）
  - 📝 说明：13 个 Detail 页模板前已有三态早返回/守卫覆盖（wms 6 早返回、qms 6 早返回、aps 6 Alert 守卫、finance Voucher 早退；其中 aps 6 + qms 6 有重叠计），所接 emptyState 为声明式兜底（守卫移除后即生效），页面三态保持完整

### P2（加固）
- ✅ **死代码与目录清理（第一批）**：components/ui/Loading.tsx 零引用已删；Tabs/CommandPalette 有引用保留；待续：_archive-microfrontend、tmp、schema/schemas 双目录合并
- ⏳ **三端共享包接入**：mobile 零引用、desktop 仅 4 处 → 先接 tokens/shared-types/api-client
- ⏳ **i18n hash key 语义化 + z-index 语义化**：1006 个 text_xxxxxx key；z-index 魔数 100+ 处统一 theme.zIndex

> 全量审计报告：`docs/quality/前端UI审计报告-2026-10-07.md`（六维结论 + 违规清单 + 验证记录）

## 🚀 部署时执行（生产环境，待环境）

> 权威检查单：`docs/architecture/go-live-checklist-and-rollback-2026-10-06.md`（R4 演练收尾产出，2026-10-06）
> 生产前置三项：**Linux systemd 实跑 install/update/rollback**、**A2 docker 回归（5433）**、**A1 生产 nginx 验证**（Runbook：`docs/deploy/nginx-prod-first-deploy-runbook.md` + `scripts/verify-nginx-prod.sh`）
> 迁移账本口径：280/298（半迁移既成债，未来结构演进走"直接 DDL 运维"约定，见 `docs/database/database-half-migration-ops.md`）

### 2.1 代码与构建门禁（CI 层）
- [ ] pre-push 五门禁全绿：cargo check / clippy / fmt / test（550+ tests）/ shellcheck
- [ ] schema-boundary 双门禁（PY 28 服务 / NODE 29 服务）exit 0
- [ ] sqlx Gate S（离线缓存与 .sqlx/ 一致）
- [ ] 前端 tsc + vite build + vitest 全绿；bundle TOTAL ≤ 30M（当前 16.43MB）

### 2.2 环境与部署（生产机）
- [ ] install.sh 生产实跑（dry-run ✅ 306 文件/16.48MB/systemd 24 服务 → 实跑）
- [ ] systemd 服务启用后各服务 /health 绿（本机无 systemd，需生产机实跑）
- [ ] nginx 生产配置（deploy/nginx/topems.conf）upstream 端口与实际服务对齐——A1 复核（Linux 执行 verify-nginx-prod.sh，macOS 仅 WARN 跳过）
- [ ] portal 构建产物部署（apps/web/dist 静态托管或 dev server）

### 2.3 功能链路（生产冒烟）
- [ ] IAM 登录 → JWT → 各域 API 抽样 200
- [ ] 财务凭证借贷平衡（decimal 精度，R2 ①已验 10000=10000）
- [ ] 工单下达（事件化，R2 ② uuid=text 修复后重验）
- [ ] 质量链 qms↔lims↔ehs 事件联动（R2 ④ internal 前缀修复后重验）
- [ ] 插件注册 + 心跳（R2 ⑤：core_plugin_instances 表 + 令牌门控）
- [ ] BI /datasets/test-sql + /datasets/query 真实 SQL 执行（✅ 后端已落地 2026-10-06，生产冒烟复验）
- [ ] WS MES 看板推送（unified-core 投影由 mes_real_module 提供）

### 2.4 回滚预案
- [ ] 保留上一版本二进制 + 前端 dist 快照（备份目录）
- [ ] rollback.sh 生产实跑一次通过（需 root/systemd 环境）
- [ ] 数据库回滚策略：结构演进走 DDL 运维（不依赖 sqlx 回滚），破坏性变更前拍板文档化
- [ ] 服务回滚顺序：业务服务 → 平台层（portal/unified-core）→ 数据库不动（数据优先保留）

## 2026-10-07 全面审计 + 第一梯队修复（均已完成）

### ✅ 全面审计完成（五维并行 + P1 逐条复核）
- 覆盖：数据库字段链 / 后端 API / 前端 API / 项目架构 / 目录设置
- 结论：**迁移链收敛态独立实证成立**（未入链且真实落库 DDL=0、空库 315/315 重建、断链 FK 0、依赖环 0）
- 缺陷：**59 项（P0=0 · P1=8 · P2=29 · P3=22）**，全附 文件:行号 / SQL / 路由串 证据
- 报告：`artifacts/audit/TOPEMS审计报告.md`（+ HTML 可视化版 + 3 张全量附表：4491 后端路由 / 4509 前端调用点 / SQL 漂移候选）

### ✅ 第一梯队修复完成（2026-10-07，摘要 `artifacts/tier1-fixes/TOPEMS第一梯队修复摘要.md`）
- **后端 P1×4**：
  - BE-01 事件处理器 4 张缺失表（hrm_cache_invalidation_logs / gis_map_markers / integration_sync_logs / lims_inspection_records）判定全部业务必需 → 补建表迁移 `20261007000018~21`（含 tenant_id/RLS，幂等），cargo check 通过（commit `451182683`）
  - BE-02 analytics 仪表盘查询：验证发现原查询 `core_permissions.tenant_id` 列不存在（必然跑不通）+ 跨 schema 引 hrm 被 boundary-gate 拒绝 → 降级修正（组织计数置 0 + 坏列修正），门禁 PASS、5432 实跑返回数值；**live 组织计数登记 follow-up**（需 bi 物化视图或 allowlist 评审，commit `095572cb1`）
  - BE-03 孤儿 `transfer.rs` 确认零引用且与 transfer_order.rs 重复 → 删除（-969 行，commit `b7ca075ca`）
  - BE-04 物化视图按 **CQRS 投影汇总表**建（原生 MV 只读与代码 INSERT/UPDATE 冲突），含刷新策略登记（commit `583b7179a`）
- **前端 P1×3**：permission 补 POST stub、密码策略/安全设置写函数确认死路径已移除、通讯录补 4 条 stub；typecheck/eslint/cargo 全过，无遗留 405/404
- **索引治理（DB-01/02，commit `4bae24506`）**：基准 81 缺索引 / 175 组冗余 / 4 个 `_key1` 全部复现 → 迁移 81 CREATE + 176 DROP INDEX + 4 DROP CONSTRAINT（逐条核实非约束/FK 支撑）→ 复扫 **81→0、175→0、_key1→0**
- **迁移链卫生（commit `37b771972`）**：发现 32 个审计既有未应用 WIP 迁移（RLS 加固批次，属二/三梯队）→ 按"只登记不动"隔离至 `database/migrations-wip/` 并登记清单；双库账本 **315→322 完全一致**、5433 空库守卫 322/322 一次重放、schema-drift 复扫 **0**、checksums 重新生成
- **git 噪音 + README（commit `d8d577cec`）**：`.cargo/env`、`.superpowers/`（含 server.pid）、`.trae/`、`.workbuddy/` 移出索引保留本地；package.json 失效脚本修正；README 项目结构按实测重写
- **遗留（已登记）**：FE-02 前端 2 文件（iam/auth.ts、iam/index.ts，删 2 个死写函数）已暂存，两次提交被 `web-contract-smoke` 门拒绝——失败明细 1475/4137 全为 ai/workflow/ticket/wms 模块 route_missing/500（BFF 二进制未更新 + 二/三梯队路由缺口未修，门禁对 api 目录提交系统性变红，与改动无关），未绕过门禁，待路由缺口梯队修复后显式提交或由下一批 web 提交自然带走；部分提交哈希曾被并发 UI 批次 rebase 重写，最终哈希以上述为准（内容已逐项核实）
- **边界**：第二/三梯队（RLS 加固批次 32 文件取回、FE-04~16、bi 组织计数、自助 DDL 入链、timestamptz 统一、优雅停机、前端 client 收敛、TABLE_DEFS 单一事实源、OpenAPI 门禁、迁移目录治理）仅登记未动

## 🧪 测试覆盖率评估（2026-10-07，三域基线）

- **基线**：unified-core + finance + wms `--lib` 覆盖率 **13.53%**（5594/41342 行；测试 552/1106/551 全跑全绿，非测试未执行）
- **盲区定性**：测试集中在少数模块（finance settlement_v55 465/564、report_center 310/341、erp_e2e 144/145；unified-core subscription 345/354；wms fsm 42/42、util 55/55），**业务/领域层大面积 0 覆盖**（364 个模块 0/xx）
- **P0 盲区（财务正确性 + 业务编排核心）**：
  - finance domain/event 层：aggregate_repository 0/221、saga 0/181、event_replay 0/157、pg_materialized_views 0/199、cqrs 0/115、compliance_v51 0/223
  - unified-core automation/mod.rs 0/618（自动化编排——R2 未覆盖）
- **P1 盲区（业务模块）**：
  - wms：inventory_movement 0/192、outbound_order 0/67、stock_take 0/62、slotting 0/52、transfer_order 0/47、smart_replenishment 全家 0/125
  - unified-core：doc/handlers 0/508、audit/handlers 0/381、login_log_handlers 0/182、ws 0/235 + ws_event_bridge 0/146
- **建议**：P0 补测优先（财务 domain 事件流正确性 > 自动化编排）；报告产物 target/tarpaulin/（html）

### P0 补测进展（2026-10-07，进行中→部分完成）

- ✅ **finance domain 事件层已补测**（24 单测 + 5 集成，1130→1134 绿）：
  - cqrs.rs 4 用例（CommandHandler 创建/过账/冲销 + 错误路径）—— commit 862be714b
  - saga.rs 8 用例（注册/启动/执行/force_fail/补偿/列表/统计）
  - event_replay.rs 6 用例（全量/时间/版本回放 + 状态重建）
  - aggregate_repository.rs 6 用例（事件重建/快照恢复/阈值/坏快照）
  - compliance_v51.rs 4 用例（评分/等级/严重度纯逻辑）
  - pg_materialized_views **5 集成测试（sqlx::test）** + **修复生产缺陷**：list/get_by_id/get_by_no SELECT 缺 summary/total_amount/posted_at/version 列 → row_to_voucher 必败（测试暴露）
- ⏳ **unified-core automation/mod.rs（0/618）**：1394 行全 DB/axum handler，单测不可行——**登记为下一批次集成测试**（需 AppState + 路由 + automation 表 DDL）
- 🧰 测试基建增强：InMemoryEventStore 补 Clone；新增 `Arc<T>: EventStore` blanket impl

### P1 wms 补测进展（2026-10-07）

- ✅ **inventory_movement 移动单号规则 3 集成测试**（sqlx::test 临时库）：空表 000001 / 同 tenant 递增 / 跨 tenant 隔离——generate_movement_no 改 pub（#[doc(hidden)]），commit 10ee91223
- ⏳ **其余 wms 模块（outbound_order 0/67、stock_take 0/62、slotting 0/52、transfer_order 0/47、smart_replenishment 全家 0/125）**：全内联 DB/axum handler 逻辑（无可测纯函数），单测不可行——登记为**DB 集成测试批次**（feature-gated http_endpoint_tests 模式已有，待 http 端点回归时展开）
- ℹ️ wms 已有 551 lib 测试覆盖 fsm 42/42、util 55/55、permission 33/38 + 12 状态机路径（cross_module_integration_tests）

### P1 handler 层集成测试成本评估（2026-10-07）

- **wms outbound_order/stock_take/slotting/transfer_order/smart_replenishment**：handler 硬性依赖 RLS 事务 Arc（`expect("rls txn missing")`）+ 权限表种子 + 多表 DDL——单测不可行，集成测试每 handler >100 行 setup——**归入 feature-gated http_endpoint_tests 批次**
- **unified-core audit/doc/automation handlers**：AppState 20+ 字段（含 Arc<dyn> 权限/审计存储 mock）——构造成本高——**需先建 AppState 测试工厂基建**（列为独立基建项）
- **可行替代**：纯逻辑/事件层模块化可测（finance domain 已验证）；handler 薄 SQL 封装测试价值低——建议**优先模块化纯逻辑**，handler 层留待真实服务测试环境

### ✅ AppState 测试工厂基建完成（2026-10-07）

- **tests/common/app_state.rs**：24 字段 AppState 完整构造（dyn trait 用仓库自带 InMemoryPermissionStore/InMemoryAuditLogStore；encryption=None）+ super_claims/tenant_claims 工厂
- **复用方式**：`#[path = "common/app_state.rs"] mod app_state;`（绕过 common/mod.rs 的 topems-lib 运行时依赖）
- **audit handlers 已覆盖**（operation_logs_e2e 9 用例全绿）：list_operation_logs（空表/按 user_name/module/success 过滤/分页 5 用例）+ get_operation_log（存在/NotFound 2 用例）+ get_operation_log_stats（空/3 行 2 用例）——commit a24616dd3/e782b78fc
- **解锁**：audit(381)/doc(508)/automation(618) handler 集成测试路径
- ⏳ 下一步：doc handlers（core_doc_document_versions 表，Document 模型可测）或 audit 剩余（permission_changes/access_logs——薄包装 + serde_json::Value 断言弱，价值递减）

## 2026-10-07 第二梯队修复（已完成，摘要 `artifacts/tier2-fixes/TOPEMS第二梯队修复摘要.md`）

### ✅ 已完成并提交
- **DB-04 自助 DDL 入链**（commit `61a25cfb7`）：`/erp/db/columns` modify/drop 三端点全部降级为只读迁移建议（幂等 IF NOT EXISTS SQL + 走迁移链提示），不再执行 DDL；preview 幂等化；标识符转义保留；cargo check 绿 + 25 单测 + 自签 JWT 路由实测。**follow-up**：DatabaseStructurePage 前端仍调用该端点（仅读 success/message 不崩，但"执行"不再建列），已登记前端改造
- **DB-03 timestamptz 统一**（迁移 `20261007000030`，随用户并发提交 `10ee91223` 入库）：31 列 timestamp→timestamptz，31 表全 0 行零数据风险，统一 UTC 解释对齐 `DateTime<Utc>` 契约；双库应用、NOT NULL/DEFAULT 保留、空库 **323/323 一次重放**、幂等实证、列级 diff 零新增
- **AR-04 优雅停机**（commit `e0664e3cc`）：全仓 3 处 `axum::serve`（shared-bootstrap 两共享入口覆盖 30/31 服务 + server 单体入口）接入 with_graceful_shutdown（SIGTERM/ctrl_c + 二次信号兜底 + 连接池关闭）；cargo check 全 workspace 绿、启动健康 200。**如实说明**：本环境信号投递受限（最小 tokio repro 同样不响应 SIGTERM），优雅退出日志未现场观测，判定环境问题非代码缺陷，建议正常部署环境复验
- **FE-04~16 方法错位**（commit `35b5aff6f`，18 文件）：13 组逐项对拍当前后端源码——23 处前端对齐、2 组复核已对齐（审计快照过时）、1 组已移除；typecheck/eslint 全绿。提交时 BFF(8099)/mobile(8070) 离线，WCS/MCS 门禁按仓库设计跳过（非绕过），建议 BFF 重启后手动跑 web_contract_smoke
- **FE-02 遗留**：两个暂存文件已被用户 refactor 提交吸收（HEAD 已为 GET 对齐后端），原提交计划无对象，已登记

### 📋 调研交付（未实施，方案已备）
- **FE-17 client 收敛**（`fe17-client-convergence-plan.md`）：实测 9 套请求层（web client.ts 为事实标准 428 模块、shared-utils 死代码、desktop 401 静默/mobile baseURL 缺后缀两个 bug 已点出），5 阶段收敛方案 12–15 人日
- **BE-02 组织计数**（`be02-bi-org-count-plan.md`）：**关键发现——第一梯队修复落在非 live 的 routes.rs 死代码上**，live 的 main.rs 旧版仍引用不存在的 iam_users/org_* 五表，仪表盘整卡实为占位；组织数据真实归属 hrm（存在但 0 行、RLS 开）；方案 A 物化视图 / B allowlist / C 降级，建议先做最小纠正（0.5 人日）
- **第三梯队可行性**（`tier3-feasibility.md`）：TABLE_DEFS 对拍止血（S）+ codegen（L）；OpenAPI 门禁基建已现成（28 crate 提取管线，只差回写，M）；迁移目录治理"子目录/改名高风险不做"（sqlx 校验链约束），只做低风险四项（S–M）
- **DB-03 残留**：5433 空库重放后残留 329 列（与 5432 的既有差异，审计快照口径）已登记第三梯队

### ⏳ 待用户拍板
① BE-02 组织计数真实值必要性 + 选 A/B/C（hrm 当前 0 行，接线前需确认填充计划）；② DatabaseStructurePage 前端改造；③ FE-17 收敛实施分批
