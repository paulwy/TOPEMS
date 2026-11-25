# 列表页「总数 vs 行渲染」一致性回归检查

一个可反复执行的检查，用来防止「接口 200、分页总数正确、表格却空白」这类只在页面上暴露的回归。

脚本：`apps/web/scripts/check-list-page-consistency.mjs`

## 为什么需要它

`ListPageTemplate` 历史上按 `propData ?? crudResult.data` 取数。页面目录重构后 20+ 个列表页统一写成
`data={[]}`，而**空数组不是 nullish**，于是 crud 拉回的行被空数组覆盖：页面底部显示
「1-10 共 29 条」，表格却是「暂无数据」。接口、总数、权限全都正常，只有行消失——纯接口断言抓不到，
人工逐页翻也不现实。

修复提交：`fc663fc3d`（仅非空 `propData` 才覆盖 crud 结果）。

## 怎么跑

```bash
cd apps/web

pnpm check:list-pages            # 默认 8 条有数据的代表页，约 10 秒
pnpm check:list-pages:all        # 从 /api/core/menus 取路由，最多 40 条
node scripts/check-list-page-consistency.mjs --routes /wms/warehouse-management,/crm/customers
node scripts/check-list-page-consistency.mjs --json /tmp/list-consistency.json   # 落明细
```

需要本机已起：后端 `8099`（`./scripts/topems.sh restart server`）与 Web 开发服 `3000`（`pnpm dev`）。

环境变量（都有默认值）：`WEB_BASE`、`API_BASE`、`USERNAME`、`PASSWORD`、`TENANT_ID`。

## 判定口径

- 登录走 `POST /api/core/iam/auth/login`，token/租户/权限在导航前写入 `localStorage`，等价于真实登录态，不需要点登录表单。
- 每页采样「分页总数」与 `table tbody tr` 行数（剔除「暂无数据」占位行），到达以下任一条件即停：
  - 总数 > 0 且已有行（数据到位）；
  - 两次采样一致且页面已有表格（渲染稳定）；
  - 页面 6 秒内没有表格（详情页/看板/无权限）→ 记为 `SKIP(无表格)`，不计失败。
- 失败条件只有一个：**总数 > 0 但行数 = 0**。总数 0 且无行是正常空表。

退出码：`0` 全绿，`1` 有不一致项，`2` 脚本级错误（登录/浏览器启动失败）。

## 有效性验证（负向对照）

把模板临时改回 `propData ?? crudResult.data` 再跑，脚本立刻判负：

```
FAIL  /wms/warehouse-management  总数=29  行=0
FAIL  /wms/inbound               总数=2   行=0
判定：FAIL（总数 > 0 但表格无行，检查 ListPageTemplate 的数据来源优先级）
```

恢复修复后同一批路由全绿（`总数=29 行=10`、`总数=2 行=2`、`总数=189 行=10` 等）。说明这条检查确实能抓到目标缺陷，而不是永远通过。

## 现状与取舍

- 默认 8 条跑完约 10 秒（登录一次、逐页复用同一上下文）；开发模式下首进页面有 Vite 编译开销，故单页超时默认 35 秒，可 `--timeout` 调。
- 不进 PR CI：需要起后端 + 浏览器 + Chrome，成本高于收益；定位是**发版前/Nightly/改动 `ListPageTemplate` 或批量生成列表页之后**跑一遍。
- `--all` 会遍历菜单里的非详情路由，其中看板、详情、无权限页会被 `SKIP(无表格)` 自然排除，不需要维护白名单。
- 同类问题若出现在非 `ListPageTemplate` 的页面（自建表格），本脚本抓不到，需要单独补断言。
