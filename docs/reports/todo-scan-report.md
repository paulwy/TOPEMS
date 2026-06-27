# TOPEMS 代码库 TODO/FIXME 扫描报告

> 扫描时间: 2026-06-26 04:32:33
> 扫描目录: apps/web/src, apps/core/src, apps/crm/src, apps/desktop/src, apps/finance/src, apps/hrm/src, apps/mes/src, apps/mobile/src, apps/pm/src, apps/scm/src, svc, lib/src
> 排除目录: node_modules, target, dist, build, .venv, venv, __pycache__, .git, .yarn, .next, .cache
> 总标记数: **4**
> 涉及文件数: **4**

---

## 一、按优先级统计

| 优先级 | 标签类型 | 数量 | 占比 |
|--------|----------|------|------|
| 5 | **NOTE** | 4 | 100.0% |

## 二、按文件类型统计

| 文件类型 | 数量 | 占比 |
|----------|------|------|
| `.rs` | 3 | 75.0% |
| `.tsx` | 1 | 25.0% |

## 三、Top 文件排行

| 排名 | 文件名 | 标记数 | 文件路径 |
|------|--------|--------|----------|
| 1 | `performance.tsx` | 1 | `apps/web/src/lib/performance.tsx` |
| 2 | `rate_limit.rs` | 1 | `svc/shared/src/middleware/rate_limit.rs` |
| 3 | `widget.rs` | 1 | `svc/bi/src/modules/bi/widget.rs` |
| 4 | `models.rs` | 1 | `svc/gis/src/models.rs` |

## 四、详细标记列表

### NOTE

| 文件 | 行号 | 内容 |
|------|------|------|
| `apps/web/src/lib/performance.tsx` | 213 | requestIdleCallback returns an ID, but we don't store it |
| `svc/bi/src/modules/bi/widget.rs` | 110 | dashboard_id is not stored in CachedWidgetData for simplicity; |
| `svc/gis/src/models.rs` | 14 | In DB it's NOT NULL |
| `svc/shared/src/middleware/rate_limit.rs` | 158 | In production, track last access time and remove stale entries |

---

*报告生成时间: 2026-06-26 04:32:33*