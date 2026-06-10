# TOPEMS 架构优化方案 V2

## 目录结构

```
TOPEMS/
├── apps/           # 应用层
│   ├── web/        # Web前端
│   ├── desktop/    # Tauri桌面端
│   └── mobile/     # 移动端
├── svc/            # 后端服务
│   ├── iam/        # 身份认证
│   ├── doc/        # 文档服务
│   ├── flow/       # 流程服务
│   ├── ai/         # AI服务
│   └── ...
├── infra/          # 基础设施
│   ├── config/     # 配置管理
│   ├── middleware/ # 中间件
│   ├── logging/    # 日志
│   └── metrics/    # 监控
├── lib/            # 共享库
├── deploy/         # 部署配置
├── scripts/        # 运维脚本
└── docs/           # 文档
```

## 迁移映射

| 原路径 | 新路径 |
|--------|--------|
| frontend/ | apps/web/ |
| services/topems-*/backend/ | svc/*/ |
| platform/.../src-tauri/ | apps/desktop/app/src-tauri/ |
| shared/lib/ | lib/ |
| docker/ | deploy/docker/ |
| monitoring/ | deploy/monitoring/ |

## 实施时间线

- Phase 1: 创建新目录结构
- Phase 2: 迁移后端服务
- Phase 3: 迁移前端应用
- Phase 4: 更新配置文件
- Phase 5: 测试验证

---

**版本**: 2.0  
**创建时间**: 2026-06-10  
**状态**: ✅ 已完成  
**服务总数**: 26个