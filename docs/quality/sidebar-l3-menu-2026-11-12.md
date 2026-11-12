# 侧边栏三级菜单修复（前端线）

- 日期：2026-11-12
- 库身份：topems_prod｜192.168.110.115｜账本 max 20261112104000｜连接用户 xingzhai（rolsuper=true、rolbypassrls=true）
- 提交：`dabb1a43a`（已推送，`origin/main` = dabb1a43a）
- 发布目录：`~/TOPEMS/dist/topems-dabb1a43a-20261112/web`
- 回滚目标：`~/TOPEMS/dist/topems-2e7288afb-20261112/web`

## 1. 根因与修复范围

- 根因：`GlobalLayoutV3.buildSidebarItems` 已构造三级树（一级域组 → 二级模块 → 三级模块 navItems），但 `SideRail` 只渲染两层，三级从未挂载；点击二级只能落到模块首页（`/<mod>/dashboard`）。
- 数据侧 `core_menus.parent_id` 全为 NULL 是并列独立事实，**不是**本症状原因，本次不补、不改后端。
- 修复 4 处 + SW：
  1. `GlobalLayoutV3`：三级 `children` 排除 `*-dashboard`；`activeId` 与 `handleItemClick` 两处扁平化补第三级（更深路径优先命中）。
  2. `SideRail`：二级模块下渲染三级（按 NavGroup 顺序）；模块按钮仍跳模块首页，右侧独立 chevron 只做展开；`{hasThird && …}` 保证无三级项不渲染箭头；`hasActiveChild` 与自动展开支持孙级。
  3. `public/service-worker.js`：`CACHE_NAME` v4 → v5。

## 2. 验收口径（最终）

| 项 | 数值 | 说明 |
|---|---|---|
| 一级 | 11 | 首页 + 10 个业务域组 |
| 二级模块 | 34 | Web 侧 `item.code !== 'mobile'`，mobile 不渲染 |
| 三级 | 165 | 排除 `*-dashboard` 后的 Web 实际渲染数 |

- 169 是「静态 navItems ∩ 生产菜单、排除 `*-dashboard`」的**全集，含 `mobile` 4 条**；Web 不渲染 mobile，故最终口径为 165。
- 上一轮“二级 35”的口径偏差：35 = 注册表模块总数（`getAllModules()`=35，含 mobile）；Web 渲染 34。生产基线 dump 的二级入口也是 34，本次未变。

## 3. 空箭头分支实证

临时把 `apsNavConfig.navItems` 改为只剩 `aps-dashboard`（本地改动，未提交），构建后实测：

```text
高级排程：hasChevron=false，thirdCount=0
点击二级按钮 → pathname=/aps/dashboard，aria-current=page
生产制造组内无箭头的模块仅「高级排程」
```

随后 `git checkout -- apps/web/src/module-configs/aps/config.ts` 还原并重建，主验收复测仍为 11 / 34 / 165。`hasThird &&` 已由实测支撑，不再是假设。

## 4. SW v5 的真实收益与保留事实

- 收益：新 SW 激活时建立干净的 `topems-cache-v5` 并删除 v4，避免旧 `index.html` 长期留在当前缓存中。
- 保留事实：已装 v4 的客户端在切版后的**首次导航仍可能由 v4 的 staleWhileRevalidate 返回旧 index**，新 SW 需在该次导航后才完成安装/接管。
- 因此发布是否成功**只认 A5 的 curl 结果**；该保留事实不作为验收失败理由。

## 5. 发布记录

| 项 | 值 |
|---|---|
| index.html sha256 | `bf006c2645155f6ac177ce09a5100da686cb7c26fc0cb36c19120861b0f02e6a` |
| 入口 chunk | `/assets/index-pOG9mBTq.js`，`cdcf3d2acbe57f43e1caad6c752ff3ed47126c661980e94e2ac6fb1adc3018f1` |
| SW | `topems-cache-v5` |
| 文件数 / 体积 | 2,597 / 约 34 MB |

- A1 提交边界：HEAD=dabb1a43a，origin/main 推送前=2e7288afb；工作区仅 docs 遗留。
- A2/A3 产物：本地与远端 sha256、文件数、SW 版本逐项一致。
- A4 切换：`ln -sfn` 建临时链接 + `mv -h` 改名；`readlink` 由 `topems-2e7288afb-20261112/web` 变为 `topems-dabb1a43a-20261112/web`，旧目录无 `.current.next` 残留。
- A5 线上：`/index.html` 与入口 chunk sha256 均命中新值，旧入口 404，`/` 200。
- A6 服务：后端 pid 6315 → 6315；nginx master 1239 未变；账本 max 20261112104000 未变。
- A7 用户无痕窗口确认：二级展开出三级，点「销售漏斗」落 `/crm/sales-funnel` 且高亮正确，Cache Storage 仅 `topems-cache-v5`。
- 窗口耗时：15:54:44 → 15:55:18，约 34 秒；全程零后端中断、零 nginx reload、零 DB 写入。

## 6. 明确不做

- 不补 `core_menus.parent_id`、不改后端与 SQL。
- 不改 SW 逻辑（仅升缓存版本）。
- 不改 `sideEffects` 白名单（上一窗口已完成）。
- 不引入 `SidebarNavGroup`（仅 demo 使用）。
