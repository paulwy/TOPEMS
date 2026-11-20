# W1-4a 菜单分组消费落定

日期：2026-11-21

## 口径修正

`core_menu_groups` 的实际数据模型是**模块内语义分组**，不是一级业务域组：

- 种子按模块建 2–4 组，例如 `finance_overview` / `finance_business` / `finance_process` / `finance_analytics`；
- 组名是「财务管理概览 / 财务管理业务 / 财务管理流程 / 财务管理分析」；
- `core_menus.group_id NOT NULL`，每个菜单属于一个模块内组；
- 全仓没有「manufacturing / supplychain / finance-br / hr / rd ...」这类 10 个域组记录。

因此不把 DB 分组硬套到前端 10 个 `DOMAIN_GROUPS`。最终口径：

- 一级域组（10 组）继续由前端 `DOMAIN_GROUPS` 做**呈现聚合**，不写入 DB；
- DB 的模块内分组用于**三级菜单的子分组与顺序**，DB 有值时优先，缺值时回退 `navItems.group`；
- `?menu_authority=config` 仍完整回退前端配置，不依赖 DB。

## 后端

- `DbMenuRow` 增加 `group_code` / `group_name` / `group_sort_order`。
- `my_menu_tree` 查询改为 `public.core_menus m LEFT JOIN public.core_menu_groups g ON g.id = m.group_id`，按 `g.sort_order, m.sort_order, m.code` 排序；仍显式限定 `public` schema，保留 flow 同名表规避。
- `MenuNode` 新增 `groupCode` / `groupName` / `groupOrder`（camelCase，空值不序列化），随现有 ETag 缓存与权限裁剪一并返回。

## 前端

- `DbMenuItem` 增加 `groupCode` / `groupName` / `groupOrder`。
- 新增 `components/redesign/layout/menuGrouping.ts`：把 `finance_business` 这类 code 的后缀还原为 `business` 等 SideRail 语义分组；不认识的后缀返回 `undefined`。
- `GlobalLayoutV3` 构造三级菜单时 `group = navGroupFromDbMenu(dbItem) ?? child.group`，并透传 `groupOrder`。
- `SideRail` 的 `NavItem` 增加 `groupOrder`；`groupChildren` 先按 DB 分组排序，再按 `NAV_GROUP_ORDER` 标准顺序兜底。

## 验证

- `cargo test -p topems-unified-core --test menu_e2e --features db-tests`：8 passed，新增 `my_menu_tree_exposes_group_metadata` 断言 `groupCode=nav_business`、`groupOrder=1`。
- `cargo clippy -p topems-unified-core --all-targets --features db-tests -- -D warnings`：通过。
- `pnpm exec vitest run src/components/redesign/layout/__tests__/menuGrouping.test.ts`：2 passed。
- `web typecheck`：0 error；`eslint apps/web/src --quiet`：0 error。
