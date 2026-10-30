# ERP db-structure 前端过期动词路径核销决策

> 日期：2026-10-30
> 范围：`svc/erp` 后端 `db_structure` 模块 + `apps/web/src/api/erp` 前端声明
> 结论摘要：**4 条前端 `/db-structure/*` 过期动词路径在后端均已有 RESTful 等价路由，无需任何后端实现；
> 经调用点调查，4 条过期声明全部处于零引用的孤儿封装状态，推荐方案 B（下线删除），线上实际使用的
> `dbStructureApi` 早已指向正确的 RESTful 路由。**
> 约束：本文件只出决策与前端处置；不新增后端 DDL 执行能力；不修改 `docs/web_contract_gap_list.md`。

---

## 1. 现状：前端声明路径 vs 后端已有 RESTful 路由

### 1.1 后端已有路由（`svc/erp/src/modules/db_structure.rs::create_routes`，已注册、已 merge）

| # | 后端方法 + 已注册路径 | 处理器 | 请求形态 | 说明 |
|---|---|---|---|---|
| 1 | `POST /api/erp/db/columns/preview` | `preview_add_column` | Body: `AddColumnRequest { table_name, column: DbColumnDefinition }` | 仅生成 ADD COLUMN 幂等建议 SQL，不执行 DDL |
| 2 | `POST /api/erp/db/columns` | `execute_add_column` | Body: `AddColumnRequest { table_name, column: DbColumnDefinition }` | 只读迁移建议模式，返回建议 SQL，不执行 DDL |
| 3 | `PUT /api/erp/db/columns/{table}/{column}` | `execute_modify_column` | Path: `table_name`, `column_name`；Body: `ModifyColumnRequest { table_name, column_name, column: DbColumnDefinition }` | 只读迁移建议模式，返回 ALTER COLUMN 建议 SQL |
| 4 | `DELETE /api/erp/db/columns/{table}/{column}` | `execute_drop_column` | Path: `table_name`, `column_name`；无 Body | 只读迁移建议模式，返回 DROP COLUMN IF EXISTS 建议 SQL |

请求模型定义于 `svc/erp/src/models/migration.rs`：

```text
DbColumnDefinition { column_name, data_type, is_nullable, default_value,
                     max_length, numeric_precision, numeric_scale, comment }
AddColumnRequest   { table_name, column: DbColumnDefinition }
ModifyColumnRequest{ table_name, column_name, column: DbColumnDefinition }
```

> 后端模块头注释（`db_structure.rs:18-19`）明确：本模块 DDL 端点已降级为**只读「迁移建议」模式**，
> 不再直接执行 DDL；返回幂等迁移建议 SQL，DDL 必须走 `database/migrations` + `scripts/migrate.sh` 迁移链。

### 1.2 前端过期动词声明（待核销对象）

| # | 前端封装函数 | 声明文件:行 | 方法 + 过期路径 | 对应后端等价路由 |
|---|---|---|---|---|
| 1 | `erpWriteApi.previewAddColumn` | `apps/web/src/api/erp/writeOps.ts:15-16` | `POST /db-structure/preview-add-column` | `POST /db/columns/preview` |
| 2 | `erpWriteApi.executeAddColumn` | `apps/web/src/api/erp/writeOps.ts:17-18` | `POST /db-structure/execute-add-column` | `POST /db/columns` |
| 3 | `erpWriteOps2.executeModifyColumn` | `apps/web/src/api/erp/writeOps2.ts:8-9` | `POST /db-structure/execute-modify-column` | `PUT /db/columns/{table}/{column}` |
| 4 | `erpWriteOps2.executeDropColumn` | `apps/web/src/api/erp/writeOps2.ts:10-11` | `POST /db-structure/execute-drop-column` | `DELETE /db/columns/{table}/{column}` |

### 1.3 差异要点（不能简单改 method/路径的原因）

- **方法语义漂移**：前端 3、4 两条把后端 `PUT` / `DELETE` 错写成 `POST`；即使改路径，method 也必须同步纠正。
- **参数位置漂移**：后端 modify/drop 的 `table`、`column` 在 **path 段**；前端两条声明只收 `data` Body，没有
  `tableName` / `columnName` 形参，改指时必须补路径参数并同步调用点。
- **Body 结构漂移**：后端 modify 的 Body 为 `{ table_name, column_name, column }`；前端旧声明把整包 `data`
  透传，字段层级与后端 `ModifyColumnRequest` 不一致。
- **路由前缀**：`apiClient.erp` 基址为 `/api/erp`，前端相对路径 `/db-structure/...` 最终命中
  `/api/erp/db-structure/...`；该前缀下后端**没有**任何已注册路由，请求会落到 BFF catch-all
  （`svc/server/src/registry.rs:221`，`message == "接口不存在，请检查路径"`），冒烟判定 FAIL。

---

## 2. 前端调用点调查（证据）

调查范围：`apps/web/src` 全量 `.ts` / `.tsx`，按函数名、导出对象名、过期路径字符串三个维度检索。

### 2.1 过期封装所属导出对象均为零引用

| 导出对象 | 定义文件 | 全仓外部 import 次数 |
|---|---|---|
| `erpWriteApi`（含 `previewAddColumn`、`executeAddColumn`） | `apps/web/src/api/erp/writeOps.ts` | 0 |
| `erpWriteOps2`（含 `executeModifyColumn`、`executeDropColumn`） | `apps/web/src/api/erp/writeOps2.ts` | 0 |

检索命令与结果：

```text
$ grep -rn "erpWriteApi" apps/web/src          # 仅命中 writeOps.ts:8 自身定义
$ grep -rn "erpWriteOps2" apps/web/src         # 仅命中 writeOps2.ts:5 自身定义
$ grep -rn "readOps\|writeOps" apps/web/src    # 除声明文件自身外，无任何 import 语句
```

`apps/web/src/api/erp/index.ts` barrel 未 re-export `erpWriteApi` / `erpWriteOps2`，不存在经桶文件的间接引用。

### 2.2 过期路径字符串仅存在于两个声明文件

```text
$ grep -rn "db-structure" apps/web/src
  ./api/erp/writeOps.ts:16   post('/db-structure/preview-add-column')
  ./api/erp/writeOps.ts:18   post('/db-structure/execute-add-column')
  ./api/erp/writeOps2.ts:9   post('/db-structure/execute-modify-column')
  ./api/erp/writeOps2.ts:11   post('/db-structure/execute-drop-column')
```

页面、组件、其他 api 模块、测试用例中均未出现 `/db-structure/` 字符串。

### 2.3 线上实际生效的 db-structure 调用栈（已是正确实现，本次不动）

| 层 | 位置 | 指向 |
|---|---|---|
| 服务封装 | `apps/web/src/api/system/index.ts:179-237` `dbStructureApi` | `GET /db/tables`、`GET /db/tables/{name}`、`POST /db/columns/preview`、`POST /db/columns`、`PUT /db/columns/{table}/{column}`、`DELETE /db/columns/{table}/{column}`、`GET /db/changes` |
| barrel 再导出 | `apps/web/src/api/erp/core/index.ts:53` | `export { dbStructureApi } from '../../system'` |
| 管理端页面 | `apps/web/src/pages/admin/DatabaseStructurePage.tsx:154,177,202` | 调用 `dbStructureApi.previewAddColumn` / `addColumn` / `dropColumn` |
| 管理端聚合 | `apps/web/src/api/admin/index.ts:92-98` | `listDbTables` / `getTableDetail` / `previewAddColumn` / `addColumn` / `modifyColumn` / `dropColumn` / `listDbChanges` 全部绑定 `dbStructureApi` |
| 契约测试 | `apps/web/src/api/__tests__/erp-v142.test.ts:51,69,87,101` | 断言命中 `/db/columns/preview`、`/db/columns`、`PUT /db/columns/orders/total`、`DELETE /db/columns/orders/total` |

结论：页面渲染与写操作早已走正确的 RESTful 封装；`writeOps.ts` / `writeOps2.ts` 中 4 条过期声明是
v74 批量补绑阶段遗留的**死封装**，不会被运行时触达。

---

## 3. 备选方案

### 方案 A：前端改指现有 RESTful 路由（适用于「仍在被调用」的情形）

逐条 old → new 映射（若后续在新页面中重新需要这些能力，应直接复用 `api/system/index.ts` 的
`dbStructureApi`，不要在 `api/erp` 下复制第二份封装；下表仅作为契约对照存档）：

#### A-1 `previewAddColumn`（预览新增列）

- old：`POST /db-structure/preview-add-column`，Body 透传 `data`
- new：`POST /db/columns/preview`
- Body 映射（保持 `AddColumnRequest` 形状）：

```ts
// old
apiClient.erp.post('/db-structure/preview-add-column', data ?? {})

// new
apiClient.erp.post('/db/columns/preview', {
  table_name: data.table_name,
  column: data.column, // DbColumnDefinition: column_name/data_type/is_nullable/...
})
```

#### A-2 `executeAddColumn`（执行新增列，后端仅出建议 SQL）

- old：`POST /db-structure/execute-add-column`，Body 透传 `data`
- new：`POST /db/columns`
- Body 映射：

```ts
apiClient.erp.post('/db/columns', {
  table_name: data.table_name,
  column: data.column,
})
```

#### A-3 `executeModifyColumn`（修改列）

- old：`POST /db-structure/execute-modify-column`，Body 透传 `data`
- new：`PUT /db/columns/{tableName}/{columnName}`
- 形参与参数位置改造（旧函数无路径参数，必须补签名）：

```ts
// old（待废弃）
executeModifyColumn: async (data?: Record<string, unknown>) =>
  apiClient.erp.post('/db-structure/execute-modify-column', data ?? {})

// new（等价于 dbStructureApi.modifyColumn）
executeModifyColumn: async (
  tableName: string,
  columnName: string,
  column: DbColumnDefinition
) =>
  apiClient.erp.put(`/db/columns/${tableName}/${columnName}`, {
    table_name: tableName,
    column_name: columnName,
    column,
  })
```

#### A-4 `executeDropColumn`（删除列）

- old：`POST /db-structure/execute-drop-column`，Body 透传 `data`
- new：`DELETE /db/columns/{tableName}/{columnName}`（无 Body）
- 形参与参数位置改造：

```ts
// old（待废弃）
executeDropColumn: async (data?: Record<string, unknown>) =>
  apiClient.erp.post('/db-structure/execute-drop-column', data ?? {})

// new（等价于 dbStructureApi.dropColumn）
executeDropColumn: async (tableName: string, columnName: string) =>
  apiClient.erp.delete(`/db/columns/${tableName}/${columnName}`)
```

方案 A 的成本：A-3 / A-4 需要改函数签名（补路径参数）并逐一核对调用点；按第 2 节证据，当前**不存在**
需要同步的调用点，改造只会留下与 `dbStructureApi` 重复的第二份封装，长期形成双源漂移风险。

### 方案 B：前端下线 / 删除过期声明（适用于「已不被使用」的情形）

- 从 `apps/web/src/api/erp/writeOps.ts` 删除 `previewAddColumn`、`executeAddColumn` 两条成员；
- 从 `apps/web/src/api/erp/writeOps2.ts` 删除 `executeModifyColumn`、`executeDropColumn` 两条成员；
- 不动 `api/system/index.ts` 的 `dbStructureApi`、不动 `DatabaseStructurePage.tsx`、不动契约测试；
- 后端零改动（现有 RESTful 路由保持不变）。

方案 B 的收益：消除 4 条必然命中 BFF catch-all 的死路径；避免后人误把过期封装接入新页面；
线上行为零变化（本来就没有调用方）。

---

## 4. 推荐方案与理由

**推荐：方案 B（删除 4 条过期前端声明）。**

理由：

1. **零调用方已取证**：第 2.1 / 2.2 节检索证明两个导出对象零外部引用，过期路径字符串仅存在于声明文件自身；
   方案 A 的签名改造没有可同步的调用点，属于无收益改动。
2. **正确实现已在线**：管理端页面、admin 聚合层、契约测试全部绑定 `api/system/index.ts` 的 `dbStructureApi`，
   路由、Body、method、路径参数均已与后端 RESTful 契约对齐；再在 `api/erp` 下复刻一份封装会造成双源漂移。
3. **后端无需新增任何路由**：4 条等价路由早已注册（`db_structure.rs:75-80`），不新增后端代码、不引入
   重复 route 注册 panic 风险。
4. **与模块现状一致**：后端已降级为只读迁移建议模式，前端保留「execute-*」动词语义的死封装只会误导
   使用者以为存在在线 DDL 入口。

处置执行记录见第 6 节。

---

## 5. 高风险 DDL 管控建议（约束条款，供后续若重建前端入口时遵循）

> 背景：表 / 列结构变更属于高风险 DDL，可能造成锁表、数据不可逆丢失、应用编译失败。当前后端已将相关
> 端点降级为**只读建议模式**（只生成建议 SQL，不执行），这是首选稳态。以下条款作为未来任何在线 DDL 入口
> （前端按钮、管理端工具、运维脚本）必须满足的准入约束。

### 5.1 鉴权与授权

- **仅管理员可触达**：DDL 类操作必须绑定独立的高等级权限点（建议 `erp:schema:admin`，区别于现有
  `erp:write` / `erp:update` / `erp:delete` 业务写权限），并在 `require_module_access("erp")` 之上追加
  角色 / 权限二次校验；普通业务角色、租户成员一律返回 403。
- **二次确认**：前端发起 modify / drop 前必须弹出二次确认对话框，明确展示表名、列名、变更前后定义、
  生成的 DDL 文本；drop 类操作需手动输入表名或列名确认，禁止一键默认确认。
- **环境隔离**：生产环境入口默认关闭，仅在显式环境开关（配置中心 / 特性开关）开启后可见；预发、开发环境
  与生产环境入口分离。

### 5.2 审计留痕

每次 DDL 建议 / 执行尝试必须落审计记录，字段至少包含：

- 操作人 `user_id`、账号、角色、租户 `tenant_id`；
- 目标 `schema`、`table_name`、`column_name`；
- 变更前定义（数据类型、可空性、默认值、注释）与变更后定义；
- 生成的完整 DDL 语句、操作结果（成功 / 拒绝 / 失败）、失败原因；
- 客户端 IP、User-Agent、时间戳、关联工单 / 变更单号。

审计记录只追加不修改、不删除；保留期不少于现行合规要求的系统日志留存周期。复用现有 `sys_db_changes`
（`db_structure.rs::list_db_changes` 读取表）作为落库模型，补充 `executed_by`、`old_definition`、
`new_definition`、`backup_data` 字段的强制写入。

### 5.3 变更回滚策略

- **先备份后变更**：任何结构性变更前，对目标列数据做备份（整列导出快照或临时表 `column_backup_{ts}`），
  备份位置与保留期在审计记录中登记。
- **可逆性前置评审**：`DROP COLUMN` 不可逆，必须先评审是否可降级为「标记停用 + 延后清理」；
  `NOT NULL`、类型收窄（如 `VARCHAR(255) → VARCHAR(50)`）、默认值移除等操作必须先校验存量数据。
- **迁移链执行**：正式 DDL 一律写入 `database/migrations`，通过 `scripts/migrate.sh` 走版本化迁移链，
  具备 forward / rollback 成对迁移脚本；禁止管理端直接在线执行原生 DDL。
- **回滚预案**：每条在线变更必须附带回滚 SQL（恢复列定义、恢复默认值、从备份回填数据），并在变更窗口内
  完成灰度验证后再全量生效；失败时按预案回滚并回写审计记录。

### 5.4 入口存续判定

- 若上述鉴权、审计、回滚约束在前端入口上无法全部满足，**建议维持现状：下线在线执行入口，仅保留
  SQL 预览（preview）与迁移链建议**；本任务第 4 节方案 B 即按该判定执行。
- 预览（preview）类只读端点可保留给管理员查看建议 SQL，但 UI 文案必须明确标注「不在线执行、需走迁移链」。

---

## 6. 本次处置执行记录（方案 B）

| 项 | 文件 | 处置 |
|---|---|---|
| `previewAddColumn` | `apps/web/src/api/erp/writeOps.ts` | 删除成员声明 |
| `executeAddColumn` | `apps/web/src/api/erp/writeOps.ts` | 删除成员声明 |
| `executeModifyColumn` | `apps/web/src/api/erp/writeOps2.ts` | 删除成员声明 |
| `executeDropColumn` | `apps/web/src/api/erp/writeOps2.ts` | 删除成员声明 |

后端：**零改动**（不新增路由、不新增 handler）。
其他前端文件：`api/system/index.ts`、`api/admin/index.ts`、`pages/admin/DatabaseStructurePage.tsx`、
`api/__tests__/erp-v142.test.ts` 均不在本次改动范围。

## 7. 验收口径

- `SQLX_OFFLINE=true cargo check -p topems-erp` 通过（后端无改动，维持既有编译基线）。
- 改动后的 `writeOps.ts` / `writeOps2.ts` 经 `pnpm exec eslint <文件>` 通过。
- 全仓 `grep -rn "db-structure" apps/web/src` 不再命中任何业务声明；`/db/columns/*` 线上封装保持不变。
- 4 条 `/api/erp/db-structure/*` 路径不再由前端任何代码发起调用；后端未为其补路由（等价路由已存在，
  详见第 1.1 节）。
