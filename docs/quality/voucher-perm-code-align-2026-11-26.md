# 凭证域权限码注解与映射对齐（B344，2026-11-26）

## 背景

B343 把凭证域运行时权限拆成 DB 已 seed 的四码 `finance:voucher:{read,create,update,delete}`。但代码与工具链里仍残留 `finance:voucher:write`：

- `svc/finance/src/modules/mod.rs` 4 处 `utoipa` 注解：`POST /vouchers/export`、`POST /u8-import/import`、`POST /vouchers/batch`、`POST /vouchers/import`；
- `svc/finance/src/modules/cqrs_routes.rs` 1 处：`POST /cqrs/commands/create-voucher`；
- `scripts/ci/perm-code-mapping.json` 的 `"*voucher*": "finance:voucher:write"`，auto-insert 工具会把新建凭证类 handler 自动插成这个不存在的码。

`finance:voucher:write` 在 `core_permissions` 中不存在（只有 read/create/update/delete 四码），注解与真实鉴权不一致，auto-insert 还会持续生成幽灵码。

## 修复

1. **注解对齐**
   - `POST /vouchers/export`：导出属读操作 → `finance:voucher:read`（运行时也挂在读子 Router）；
   - `POST /u8-import/import`、`POST /vouchers/batch`、`POST /vouchers/import`、CQRS `create-voucher` → `finance:voucher:create`（运行时均在建/导入子 Router）。
2. **映射规则支持 `{action}` 占位**
   - `scripts/ci/auto-insert-utoipa-permission.cjs` 在解析出权限码后，把 `{action}` 替换为 HTTP 动作对应动词：GET→read、POST→**create**（业务约定写入用 create，而非不存在的 write）、PUT/PATCH→update、DELETE→delete。
   - `perm-code-mapping.json` 的 voucher 规则改为 `"finance:voucher:{action}"`，并加 `_comment_voucher` 说明四码口径与「导出/预览类 POST 需人工指定 read」。
3. 未新增权限码、未改 seed、未改运行时中间件（B343 已完成运行时拆分）。

## 验证

- `cargo check -p topems-finance` 通过（注解只是宏属性，改动不引入类型问题）。
- `scripts/ci/perm-code-mapping.json` JSON 解析通过。
- `auto-insert-utoipa-permission.cjs --svc finance --enable-mapping --rewrite-existing` dry-run 中不再出现 `finance:voucher:write`；voucher 域只解析出 `finance:voucher:create`（读/导出类已人工固定为 read 且工具默认跳过已有注解）。
- `check-openapi-aggregated.cjs` 正常退出（聚合产物不入库，只提示获取方式）。
- 全仓 `finance:voucher:write` 在 `svc/finance/src` 与 mapping 文件中已清零。

## 备注

- 该 auto-insert 工具在 dry-run 中还会把其他域改写成 `finance:read`/`finance:delete` 等粗码（例如 `finance:accounting:*`），属于工具既有行为，本批**未执行 `--apply`**，只改了 voucher 规则与注解，避免扩大改动面。
- `docs/quality/permission-codes-snapshot-*.json` 里仍留有历史 `finance:voucher:write` 快照记录，属历史快照文件，不回写。
