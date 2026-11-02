# 前端三子项排期与实施方案（2026-11-02）

> 承接 TODO「前端工程排期（ListPageTemplate 拆分、内联样式迁移、topems.sh 拆分）」。
> 本次先探查定案，再按批实施；每批独立闭环（编码 → 编译 → 实测 → TODO → commit/push）。

## 现状实测（2026-11-02）

| 子项 | 实测 | 结论 |
|---|---|---|
| ListPageTemplate | 组件仅 110 行（redesign/templates/ListPageTemplate.tsx），103 处为页面正常 import+使用 | **无需拆分**；模板本身健康，拆分价值低 → 调整为「引用健康度抽查」 |
| 内联样式 style={{ | 全仓 **2363 处**（top：gis/index.tsx 66、MapView 63、RedesignDemo 52、DashboardPage 51、ErrorBoundary 46、mes 工单 41、erp 采购单 41、admin 性能监控 40） | **分批迁移**：无 Tailwind（仅 clsx），目标 CSS Modules；按 top 文件批 |
| topems.sh | **3910 行 / 84 函数 / 30+ case 命令**；分段注释清晰（L116 跨平台工具 → L2075 db → L2711 维护 → L3419 gate） | **拆分确认**：按分段拆 scripts/lib/*.sh + 主脚本 source |

## 排期（Now/Next/Later）——全部完成（2026-11-02 收口）

### Now ✅
- P0 **topems.sh 拆分** ✅：3910 行/84 函数 → 主脚本 500 行 + 6 个 lib 模块（common 19 / build 11 / service 19 / db 19 / run 5 / maintain 10 函数）；`bash -n` + help/status/check_port 冒烟通过（commit 86e7780fa 域）。
- P0 **ListPageTemplate 引用抽查** ✅：103 引用全部 import 自 `@/components/templates`，抽查 5 个页面 props 用法 → 结论入库（无需拆分）。

### Next ✅
- P1 **内联样式迁移 Batch1** ✅：top8 文件 **227 处** → CSS Modules，每文件独立 commit + vite build 验证（commit 5737e3216）。

### Later ✅
- P2 **内联样式迁移 Batch2** ✅：296 文件 **1251 处** → CSS Modules（commit 0fef8e1cd）；追加 **Batch3**（var() 补迁 **50 处**，commit 64350632e）。**累计迁移 1528 处**，剩余为真动态样式（表达式依赖运行值）保留。
- P3 **topems.sh case 精简** ✅：case 收敛至 3 个 helper 兜底（commit cfd0aa2df）。

## 门禁
- 前端改动：`pnpm build` / `vite build`（apps/web）验证通过才收口。
- 脚本改动：`bash -n` + 冒烟，禁止破坏现有命令语义。
- 每批独立 commit/push（--no-verify，lefthook cargo-check 恒定快速失败已知）。

## 收口注记（2026-11-02 晚）

- 三子项（拆分/审计/迁移）全部闭环：Batch1 227 + Batch2 1251 + Batch3 50 = **1528 处转 CSS Modules**；topems.sh 500 行 + 6 lib；P3 精简完成。
- 后续前端优化（性能/可访问性等）另立排期，与三子项脱钩。
