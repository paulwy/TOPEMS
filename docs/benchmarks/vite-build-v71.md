# V71 前端 Vite 构建性能基线报告 v1

> **采集日期**: 2026-08-09
> **采集命令**: `cd apps/web && time npx vite build`
> **版本基线**: V71 · V70-2 topems_shared 去门面化闭环后首次实测
> **采集环境**: macOS · Node 与 pnpm 与 CI runner 近似（同一 workspace，无缓存冷启动）

---

## 1. 构建耗时

| 指标 | 数值 | 备注 |
|------|------|------|
| Real（wall）耗时 | **5 分 02 秒** (302.45s) | V71-C3 验收阈值 ≤ 90s CI runner，**本环境超标 3.4×**，需 CI runner 再测对比 |
| User（CPU）耗时 | 371.77 s | 多核并行度 = 371.77 / 302.45 ≈ **1.23×**（单线程重，IO 瓶颈不明显） |
| Sys 耗时 | 33.92 s | 磁盘写入体积较大 |
| CPU 占用率 | **134 %** | 尚未饱和 4+ 核，优化方向：`worker parallelRollup` / esbuild minify 并行 |

## 2. 产出分布（brotli 后）

| 指标 | 数值 | 验收目标对比 |
|------|------|-------------|
| Brotli 压缩文件数 | **204 个** | 上版 208 ↓ 4 |
| Brotli 后总字节（assets） | **2.50 MB** | ≤ 1.8 MB 阈值 **超标 39%**（主要是 MapView + dev-tools 两个超大体量 chunk，各 250KB+） |
| 最大 chunk 1（dev-tools.js.br） | 254.09 KB | gzip 源 993 KB → brotli 压缩比 **3.9:1**，建议：生产默认剔除 dev-tools chunk（已做到） |
| 最大 chunk 2（MapView.js.br） | 253.61 KB | gzip 源 974 KB → brotli 压缩比 **3.8:1**，GIS/地图懒加载已接入，建议按行政区或图层级再拆分 |
| 最大 chunk 3（lucide-react.js.br） | 139.03 KB | gzip 558 KB → 图标字体未做 tree-shake 子路径精细化 |
| 最大 chunk 4（mui-material.js.br） | 149.78 KB | gzip 527 KB → MUI v9 Module Federation 已拆分，MF 方案符合预期 |
| i18n 中文 / 英文包 | zh 44KB / en 52KB | ≤ 64KB，✅ OK |
| xlsx.js.br（导出）| 134.57 KB | 按需加载（已接入），✅ OK |
| utils.js.br（核心工具） | 65.08 KB | ≤ 80KB，✅ OK |

## 3. Top 10 大 Brotli chunk（体积排序）

| 排名 | 文件名 | .br 体积 (KB) | 建议 |
|------|--------|--------------|------|
| 1 | dev-tools | 254.09 | 生产默认关闭；CI/CD 按 NODE_ENV 条件 chunk |
| 2 | MapView | 253.61 | GIS 模块按业务级 lazy：地图底图 vs 图层 vs 数据面板三级拆 |
| 3 | mui-material (MF) | 149.78 | 保持现状（已有 MF 共享） |
| 4 | zod (MF) | 62.46 | 保持现状（MF） |
| 5 | router-dom (MF) | 62.95 | 保持现状（MF） |
| 6 | mfe_internal react | 55.32 | 保持现状（MF） |
| 7 | CategoricalChart（ECharts） | 85.48 | 可按图表类型再懒拆分 |
| 8 | xlsx（导出） | 134.57 | 保持现状，按需加载 |
| 9 | lucide-react | 139.03 | 子包 tree-shake：`lucide-react/icons/Settings` 直接路径 |
| 10 | index（主 chunk） | 95.06 | ≤ 128KB，✅ OK |

## 4. 与 V70 基线对比（趋势）

> 注：V70 基线未单独成文，以下为肉眼比对的定性趋势。

| 维度 | V70 之前印象 | V71 实测 | 趋势 |
|------|-------------|----------|------|
| MF 虚拟包数量 | 7 个共享 | 7 个共享 | 稳定 |
| Brotli 文件数 | ~208 | 204 | ↓ 4 个 |
| dev-tools + MapView 双大文件 | 双 250KB 级 | 双 250KB 级 | 持平 = 后续专项优化目标 |
| 主 chunk index.js.br | ~100KB | 95KB | ↓ 5% |

## 5. 下一轮（V71.5 / V72）推荐优化目标

| # | 建议 | 预估收益 | 优先级 |
|---|------|---------|--------|
| 1 | lucide-react 改子路径导入（逐个页面图标从 `@/components/icons` 统一出口） | lucide 139KB → ≤ 60KB（-57%） | **P1** |
| 2 | MapView 三级拆分：底图 / 图层类 / 数据业务组件 | 253KB → 120KB（-53%） | **P1** |
| 3 | 构建并行度：vite.config rollupOptions `maxParallelFileOps` + esbuild target 现代 | 5m02s → 3m30s（-30%） | P1 |
| 4 | dev-tools chunk 生产彻底按 `import.meta.env.DEV` 做 dead-code 剔除 | dev-tools 254KB → 0KB 生产（-100%） | **P0** |
| 5 | CategoricalChart 按图表型拆分（line/bar/pie/scatter 4 种子 chunk） | ECharts 85KB → 40KB（-53%） | P2 |

## 6. 原始统计数据存档

```
$ cd apps/web && ls dist/assets/*.br | wc -l
204
$ du -ch dist/assets/*.br | tail -2
2.5M    total
$ time npx vite build     # 实采 5m02.45s
```

原始构建日志已保存至本地 `/tmp/vite-build-v71.log`（含每 chunk 未压缩/压缩后字节明细）。
