# WMS 预埋 API 归档记录

**归档日期**: 2026-09-11
**归档原因**: 0 页面消费 + 后端无实现 + 无测试引用，满观察周期后归档

## 归档文件列表

| 文件 | 创建日期 | 路由前缀 | 方法数 | 页面消费 | 后端实现 |
|------|----------|----------|--------|----------|----------|
| `src/api/wms/kitting.ts` | 2026-08-26 | `/kitting` | 12 | 0 | 无 |
| `src/api/wms/manifest.ts` | 2026-08-26 | `/manifests` | 16 | 0 | 无 |
| `src/api/wms/putaway.ts` | 2026-08-26 | `/putaway` | 18 | 0 | 无 |

## 归档操作

1. 删除 3 个 API 文件
2. 从 `src/api/wms/index.ts` 移除导入、类型导出和 API 对象导出
3. 保留 git 历史，可通过 `git checkout <commit>~1 -- src/api/wms/<file>.ts` 恢复

## 恢复指南

如需恢复某个预埋 API：
```bash
# 查看归档前的 commit
git log --oneline --all -- src/api/wms/kitting.ts

# 恢复文件
git checkout <commit-hash> -- src/api/wms/kitting.ts

# 恢复 index.ts 中的导出（手动添加）
```

## 后续观察

其他 wms API 文件均有页面消费，暂不归档：
- `cycleCount.ts`: 1 页面消费
- `slotting.ts`: 1 页面消费
- `inventoryMovement.ts`: 1 页面消费
- `discrepancy.ts`: 2 页面消费
- `picking.ts`: 2 页面消费
- `replenishment.ts`: 2 页面消费
- `serialNumber.ts`: 2 页面消费
- `smartReplenishment.ts`: 2 页面消费
- `wavePick.ts`: 2 页面消费
