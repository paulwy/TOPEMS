# 23 张待定性表评审材料（2026-11-25）

> 承接收口汇总 P1 #2。来源：`rls-coverage-classification-2026-11-24.md` §7.4 / §8.3 / §9（运行时链路复核）。本材料把 23 张 RLS OFF、基准未收录的在用表整理为可拍板清单：每张表的归属模型、源码链路证据、建议口径与待决策问题。**不含补 RLS 迁移结论；口径由产品 + 安全拍板后回填分类台账 §9.5。**

## 1. 方法与基准

- 三方对照：运行时 `.rs`（排除 `**/tests/` 夹具）× 生产/本地 RLS 状态 × 代码基准 `database/rls_policy_expected.json`。
- 基准收录情况：23 张中仅 `gis.track_positions` 在基准内（有意全局通道，`rls_enabled=false` + allow-all）；其余 22 张基准未收录——未收录 ≠ 必须补 RLS，需先定数据归属模型。
- 跨桶同源：`core.core_plugin_permissions` 在 B 类 §7.4③ 与 C 类 §8.3 重复计数；台账 23 = B4 + C19，去重后独立表 22 张。下表 #23 为同源/副本核对备注。
- 本地 dev 克隆结构仅作参考；最终以生产只读快照为准。测试夹具命中不计服务端依赖。
- 分组沿用台账 §9：① 目录/全局参考；② 父子关联靠父表 JOIN；③ 应用谓词在位；④ 待口径拍板；⑤ 基准白名单。

## 2. 23 张总表

| # | 表 | 组 | `tenant_id` | 基准 | 运行时隔离现状 | 建议口径 | 风险 |
|---:|---|---|:---:|---|---|---|---|
| 1 | `core.core_plugin_instances` | ④ | 无 | 未收录 | 运行时实例注册（plugin_id→runtime_url/心跳/状态）；写走 `scope_system()`；读按 `code` JOIN `core_plugins`，实例表自身无租户谓词 | **待拍板**：平台运行时拓扑 vs 租户私有实例 | 待评 |
| 2 | `core.core_plugin_reviews` | ④ | 无 | 未收录 | 市场评论/评分；按 `plugin_id` 读写，被评插件限定零租户全局发布；写走 `scope_system()` | **待拍板**：公开市场评价 vs 租户内可见 | 待评 |
| 3 | `rs.document_relations` | ②/④ | 无 | 未收录 | 定向端点按 `entity_type/entity_id`；另有 `GET /documents` 列表 + COUNT **全表分页、无任何过滤** | **待拍板**：全表列表是否应收敛到实体/租户；或该端点改系统通道/下线 | 中（全表读旁路） |
| 4 | `communication.core_location_messages` | ②/④ | 无 | 未收录 | 按 `chat_id` 归属会话；写带 `chat_id/sender_id`；读按 `chat_id` 取最近 50 条；未见成员资格校验 | **待拍板**：chat 边界是否已覆盖租户隔离；缺 RLS 兜底 | 待评 |
| 5 | `core.core_plugin_permissions` | ① | 无 | 未收录 | 插件权限定义目录，按 `plugin_code` 查询/写入，无租户谓词 | 豁免登记（全局权限定义目录） | 低 |
| 6 | `public.core_plugin_permissions` | ① | 无 | 未收录 | 上条副本/同源，按 `plugin_code` | 豁免登记；纳入重复副本核对（对照本体） | 低 |
| 7 | `erp.erp_master_data_quality_rules` | ① | 无 | 未收录 | 主数据质量规则目录，按 domain/entity_type 过滤 | 豁免登记（目录规则） | 低 |
| 8 | `erp.erp_master_data_quality_reports` | ① | 无 | 未收录 | 质量报告目录，按 domain/entity_type 过滤 | 豁免登记；复核报告是否含租户业务数据 | 低 |
| 9 | `master_data.mdm_quality_rules` | ① | 无 | 未收录 | 质量规则目录，按 entity_type/enabled 过滤 | 豁免登记（目录规则） | 低 |
| 10 | `public.core_permissions` | ① | 无 | 未收录 | 权限定义/授权关联模型，全局权限字典 | 豁免登记；与 `iam.core_permissions` 副本核对 | 低 |
| 11 | `public.core_role_permissions` | ① | 无 | 未收录 | 角色-权限关联 | 豁免登记；副本核对 | 低 |
| 12 | `public.core_user_roles` | ① | 无 | 未收录 | 用户-角色关联 | 豁免登记；副本核对 | 低 |
| 13 | `iam.core_permissions` | ① | 无 | 未收录 | 权限定义字典 | 豁免登记 | 低 |
| 14 | `iam.core_role_permissions` | ① | 无 | 未收录 | 角色-权限关联 | 豁免登记 | 低 |
| 15 | `iam.core_user_roles` | ① | 无 | 未收录 | 用户-角色关联 | 豁免登记 | 低 |
| 16 | `iam.tool_permissions` | ① | 无 | 未收录 | 工具级权限覆盖，外键挂 `tenant_permission_id`，无独立租户谓词 | 豁免登记；确认外键归属表谓词在位 | 低 |
| 17 | `public.core_doc_document_versions` | ② | 无 | 未收录 | 版本表；代码注释明确 JOIN 父文档表 `d.tenant_id` 做归属，不依赖自身策略 | 豁免自身 RLS；保留父表 JOIN 谓词 | 低 |
| 18 | `qms.qa_inspection_plan_items` | ② | 无 | 未收录 | 计划-明细关联；JOIN `qa_inspection_items` 带 `i.tenant_id` 谓词 | 豁免自身 RLS；复核无绕过父表的全表读 | 低 |
| 19 | `iam.tenant_permissions` | ③ | **有** | 未收录 | SQL `WHERE tenant_id=$1 AND user_id=$2`，应用谓词在位 | 风险低；RLS OFF 仅作谓词兜底，可后续补，非紧急 | 低 |
| 20 | `iam.users` | ③ | 无 | 未收录 | 身份主表；scope 判定 JOIN `tenant_users` 带 `tenant_id`；登录按 username/email 全局身份解析 | 谓词在位；身份解析路径需安全确认是否允许跨租户读到身份摘要 | 低 |
| 21 | `ai.user_profiles` | ③ | 无 | 未收录 | 按 `user_id` 读写，走 `scope_with` 租户作用域事务 | 谓词/作用域在位；风险低 | 低 |
| 22 | `gis.track_positions` | ⑤ | 无 | **ON=false** | 基准有意保留的全局读通道（白名单 3 张之一） | 保持豁免，登记台账 | 低 |
| 23 | `iam.tenant_permissions` 副本/同源核对项 | ①/③ | 有 | 未收录 | 与 #19 同模型；若存在 `public`/`core` 副本，按重复副本处理 | 随 #19 一并核对副本归属 | 低 |

> #23 为台账 §8.3 同源副本提示；落地前以生产 `information_schema` 实际表清单为准，去重后回填。

## 3. ④ 四个拍板点深挖（优先评审）

### 3.1 `core.core_plugin_instances` —— 实例归属模型

**源码证据**（`svc/plugin-registry/.../handlers/runtime.rs`）：
- 注册写入（`scope_system()` 系统通道）：`INSERT INTO core.core_plugin_instances (plugin_id, runtime_url, runtime_status, base_path, last_heartbeat) ... ON CONFLICT (plugin_id)`；实例挂在 `core_plugins.id` 下，无自身租户列。
- 心跳/状态更新：`UPDATE ... WHERE plugin_id = (SELECT id FROM core_plugins WHERE code=$1)`。
- 状态读：`SELECT pi.* FROM core_plugin_instances pi JOIN core_plugins p ON pi.plugin_id=p.id WHERE p.code=$1`，无租户谓词。
- 上层插件列表（471–523 行）按 `tenant_plugins.tenant_id=$1` 收敛已安装插件；实例表是运行时拓扑记录，不是租户业务数据。

**待拍板问题**：
1. 实例记录是**平台级运行时拓扑**（哪个插件实例在哪个 URL 存活），还是租户私有安装实例？
2. 若为平台级：建议豁免 RLS，读路径限定插件注册/心跳接口，登记为平台运行时表。
3. 若未来承载租户私有实例：需补 `tenant_id` + 租户隔离策略，写入走租户作用域。

**倾向**：平台运行时注册表，豁免；但需确认 `runtime_url`/心跳不泄露他租户实例可达信息。

### 3.2 `core.core_plugin_reviews` —— 评论可见性

**源码证据**（`marketplace.rs`）：
- 读：`SELECT ... FROM core_plugin_reviews WHERE plugin_id=$1 AND EXISTS (SELECT 1 FROM core_plugins p WHERE p.id=$1 AND p.tenant_id=零租户 AND is_published=true ...)`；评论只挂在全局发布插件下。
- 写（`scope_system()`）：`INSERT ... (plugin_id, user_id, user_name, rating, title, content)`，按 `claims.user_id/username` 记录评论人。

**待拍板问题**：
1. 市场评论是**全局公开评价**（所有租户可见，仅评全局插件），还是租户内私有评价？
2. 若公开：豁免 RLS，保留 `EXISTS` 限定全局插件；评论人身份展示口径需产品确认（是否暴露 `user_id`/`user_name`）。
3. 若私有：需补 `tenant_id`，读按本租户收敛。

**倾向**：公开市场评价，豁免；评论人身份字段按公开口径裁剪。

### 3.3 `rs.document_relations` —— 全表分页读旁路

**源码证据**（`svc/rd/src/modules/doc_integration.rs`）：
- 定向端点 `GET /entities/{entity_type}/{entity_id}/documents`：`WHERE entity_type=$1 AND entity_id=$2`，归属实体过滤在位。
- **全表端点 `GET /documents`**：列表 `SELECT ... FROM rs.document_relations ORDER BY created_at DESC LIMIT $1 OFFSET $2`；`SELECT COUNT(*) FROM rs.document_relations`；**均无 entity/租户过滤**。鉴权 `rd:read`。
- 表自身无 `tenant_id`，归属靠 `entity_type/entity_id` 关联父实体。

**风险**：持有 `rd:read` 的租户用户可跨租户翻页读到所有实体的文档关联记录（文件名/URL/创建人等）。

**待拍板问题**：
1. 该全表列表端点是否有前端/调用方使用？（前端 `apps/web` 未见直接命中，需运行时链路二次确认；若无调用，建议下线或改系统通道）。
2. 保留全表列表是否为后台管理用途？若是，改为系统通道 + 管理角色，不面向普通租户。
3. 若需面向租户：读路径必须按实体归属收敛（JOIN 父实体租户谓词），并评估补 `tenant_id` 落库。

**倾向**：先确认调用方；无普通租户调用则收口端点，而非给关联表补全局 RLS。

### 3.4 `communication.core_location_messages` —— chat 边界隔离

**源码证据**（`svc/communication/src/im_location.rs`）：
- 写：`INSERT ... (chat_id, sender_id, location_type, coordinates, address, place_name, ...)`。
- 读：`SELECT * FROM core_location_messages WHERE chat_id=$1 ORDER BY created_at DESC LIMIT 50`；**未见在本处理器内校验调用者是否为该 chat 成员**。
- 会话模型：`core_chat_rooms.tenant_id` + `core_chat_members(room_id, user_id, tenant_id)` 带租户归属；位置消息表无 `tenant_id`，按 `chat_id` 挂会话。

**待拍板问题**：
1. 调用读消息接口前，是否在会话/成员中间件校验了 chat 成员资格？（需沿路由 → 会话服务链路确认）。
2. 若成员校验在位：隔离靠 chat 边界，消息表可豁免自身 RLS；补一条回归用例覆盖跨会话越界。
3. 若成员校验不在位：`chat_id` 可被枚举/越界，需在查询前校验成员关系，或消息表补 `tenant_id`/会话 JOIN 谓词兜底。

**倾向**：先确认成员校验链路；缺校验则优先补应用层成员资格检查，RLS 兜底视归属模型定。

## 4. 其余分组结论（可直接登记）

### 4.1 ① 目录/全局参考（12 张，建议豁免登记）

插件权限目录、ERP/MDM 质量规则目录、权限-角色-用户授权关联模型、工具权限覆盖。共同特征：无租户业务数据、按 code/entity_type/enabled 等目录键过滤、写入多为种子/系统通道。
**登记要点**：在豁免台账注明"全局目录/授权模型，不补租户 RLS"；副本（`public.*` ↔ `iam.*`）随重复副本清单核对本体。

### 4.2 ② 父子关联/版本表（4 张，靠父表 JOIN 隔离）

`core_doc_document_versions`、`qa_inspection_plan_items`、`document_relations`、`core_location_messages`。自身无 `tenant_id`，归属由父表/会话 JOIN 谓词保证。
**复核动作**：逐表确认不存在绕过父表的全表读端点（`document_relations` 已发现一处，见 §3.3）；补 JOIN 谓词回归用例。

### 4.3 ③ 应用谓词/作用域在位（3 张，风险低）

`iam.tenant_permissions`（SQL 谓词在位，唯一带 `tenant_id`）、`iam.users`（身份解析 + JOIN `tenant_users`）、`ai.user_profiles`（`scope_with` 作用域事务）。
**建议**：非紧急；后续若做 RLS 兜底，可按 `tenant_isolation` 范式补策略，优先 `tenant_permissions`。

### 4.4 ⑤ 基准白名单（1 张）

`gis.track_positions`：基准有意全局读通道，保持豁免，不补策略。

## 5. 提交产品/安全评审的问题清单

| 序号 | 表 | 决策项 | 选项 | 建议倾向 |
|---:|---|---|---|---|
| Q1 | `core_plugin_instances` | 实例归属：平台拓扑 / 租户私有 | A 平台级豁免；B 补租户列隔离 | A（确认不泄露实例可达信息） |
| Q2 | `core_plugin_reviews` | 评论可见性：公开 / 私有 | A 公开豁免；B 补租户隔离 | A（评论人字段按公开口径裁剪） |
| Q3 | `rs.document_relations` | 全表列表端点去留与归属 | A 下线/改系统通道；B 按实体收敛读；C 补租户列 | 先查调用方，优先 A |
| Q4 | `core_location_messages` | chat 成员校验是否在位 | A 在位则豁免消息表；B 补成员校验/会话 JOIN 兜底 | 先核链路，缺校验先补应用层 |
| Q5 | ① 目录/授权组（12 张） | 是否登记全局豁免 | 豁免 / 补策略 | 豁免登记 |
| Q6 | ③ 谓词在位组（3 张） | 是否需要 RLS 兜底策略 | 暂缓 / 后续补隔离兜底 | 暂缓，记技术债 |

## 6. 后续动作与前置复核

1. 评审结论回填分类台账 §9.5：每张表落「豁免登记 / 父表 JOIN / 谓词在位兜底 / 补隔离策略」之一。
2. 补隔离策略前的前置：表结构（`tenant_id` 列/回填/索引）、源码读写路径、系统通道注入、应用谓词现状，按档 2 同口径在演练库验证。
3. P2 复核：在超户/CI 全链 head 库复跑 RLS 对照，消除 fixture 快照偏差；生产快照二次核对 23 张表实际 RLS/FORCE/策略集合。
4. 副本核对：`public.*` ↔ `iam.*` 权限关联、插件权限目录副本，并入重复遗留表清理清单（P2 #3）一并处置。

## 7. 局限

- 前端/运行时调用方尚未穷尽确认；`document_relations` 全表端点、location 消息成员校验需在运行时链路二次核实。
- 本材料基于 2026-11-24 快照与 main 分支源码；生产账本追平后策略/表结构可能变化，结论以追平后快照为准。
- 测试夹具命中的 SQL 不计入服务端依赖，已在分组观察中剔除。
