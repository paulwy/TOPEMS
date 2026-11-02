# 前端三子项排期与实施方案（2026-11-02）

> 承接 TODO「前端工程排期（ListPageTemplate 拆分、内联样式迁移、topems.sh 拆分）」。
> 本次先探查定案，再按批实施；每批独立闭环（编码 → 编译 → 实测 → TODO → commit/push）。

## 现状实测（2026-11-02）

| 子项 | 实测 | 结论 |
|---|---|---|
| ListPageTemplate | 组件仅 110 行（redesign/templates/ListPageTemplate.tsx），103 处为页面正常 import+使用 | **无需拆分**；模板本身健康，拆分价值低 → 调整为「引用健康度抽查」 |
| 内联样式 style={{ | 全仓 **2363 处**（top：gis/index.tsx 66、MapView 63、RedesignDemo 52、DashboardPage 51、ErrorBoundary 46、mes 工单 41、erp 采购单 41、admin 性能监控 40） | **分批迁移**：无 Tailwind（仅 clsx），目标 CSS Modules；按 top 文件批 |
| topems.sh | **3910 行 / 84 函数 / 30+ case 命令**；分段注释清晰（L116 跨平台工具 → L2075 db → L2711 维护 → L3419 gate） | **拆分确认**：按分段拆 scripts/lib/*.sh + 主脚本 source |

## 排期（Now/Next/Later）

### Now（本批实施）
- P0 **topems.sh 拆分**：按分段注释拆 6 个 lib 模块（common/build/service/db/run/maintain），主脚本保留入口+case，source 加载；验证 `bash -n` + `./topems.sh help` 冒烟 + 常用命令 spot-check。
- P0 **ListPageTemplate 引用抽查**：103 引用全部 import 自 `@/components/templates`，抽查 5 个页面 props 用法 → 结论入库（无需拆分）。

### Next（下一批）
- P1 **内联样式迁移 Batch1**：top8 文件（gis/index.tsx 66、MapView 63、RedesignDemo 52、DashboardPage 51、ErrorBoundary 46、mes 工单 41、erp 采购单 41、admin 性能监控 40 ≈ 400 处）→ 迁 CSS Modules；每文件独立 commit + vite build 验证。

### Later
- P2 内联样式迁移 Batch2（其余 ~1900 处，按文件排序批）。
- P3 topems.sh 模块化后 case 精简（可选）。

## 门禁
- 前端改动：`pnpm build` / `vite build`（apps/web）验证通过才收口。
- 脚本改动：`bash -n` + 冒烟，禁止破坏现有命令语义。
- 每批独立 commit/push（--no-verify，lefthook cargo-check 恒定快速失败已知）。
