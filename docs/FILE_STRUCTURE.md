# TOPEMS 项目文件结构

## 根目录

```
topems/
├── README.md                          # 项目主 README
├── .gitignore                         # Git 忽略配置
├── docker-compose.yml                 # Docker Compose 配置
├── .dockerignore                      # Docker 构建忽略文件
├── package.json                       # (如适用)
└── docs/                              # 项目文档
    ├── README.md -> ../README.md      # 文档索引
    ├── PROJECT_GUIDE.md               # 项目开发指南
    ├── OPTIMIZATION_REPORT.md         # 优化报告
    ├── CODE_REVIEW_REPORT.md          # 代码审查报告
    └── FILE_STRUCTURE.md              # 本文档 - 文件结构
```

## 脚本

```
scripts/
├── stop-all-services.sh               # 停止所有服务
├── deploy-frontend.sh                 # 前端部署脚本
├── deploy-backend.sh                  # 后端部署脚本
└── quick-start.sh                     # 一键快速启动脚本
```

## 前端

```
frontend/
├── public/
│   └── manifest.json                  # PWA manifest 配置
├── src/
│   ├── App.tsx                        # 应用根组件
│   ├── main.tsx                       # 入口文件
│   ├── vite-env.d.ts                  # Vite 类型定义
│   ├── api/                           # API 客户端
│   │   └── iam.ts                     # IAM 服务 API
│   ├── components/                    # 可复用组件
│   │   ├── LoadingSpinner.tsx        # 加载动画
│   │   ├── EmptyState.tsx            # 空状态组件
│   │   ├── ErrorBoundary.tsx         # 错误边界
│   │   ├── ProtectedRoute.tsx        # 路由权限保护
│   │   ├── ...                       # 其他组件
│   │   └── __tests__/                # 组件测试
│   │       └── common.test.tsx       # 通用组件测试
│   ├── hooks/                        # 自定义 React hooks
│   │   ├── useAuth.ts
│   │   ├── usePermission.ts
│   │   ├── useRole.ts
│   │   └── usePerformanceMonitor.ts  # 性能监控
│   ├── pages/                        # 页面组件
│   │   ├── DashboardPage.tsx        # 仪表板
│   │   ├── LoginPage.tsx            # 登录页
│   │   ├── DocumentsPage.tsx        # 文档中心
│   │   ├── ProfilePage.tsx          # 个人中心
│   │   ├── AIPage.tsx               # AI 助手
│   │   └── ...                      # 其他页面
│   └── store/                        # 状态管理 (Zustand)
│       └── index.ts                 # Store 定义
├── Dockerfile                        # 前端 Docker 配置
├── nginx.conf                        # Nginx 配置
├── vite.config.ts                    # Vite 构建配置
├── package.json                      # 依赖管理
├── package-lock.json
└── tailwind.config.ts
```

## 后端服务

### IAM (身份认证服务)

```
services/topems-iam/backend/
├── src/
│   ├── main.rs                       # 主程序入口
│   ├── models.rs                     # 数据模型
│   ├── errors.rs                     # 错误处理
│   ├── services.rs                   # 业务服务
│   ├── db.rs                         # 数据库操作
│   ├── middleware.rs                 # 中间件
│   └── cache/                        # 缓存模块
│       ├── mod.rs
│       └── memory.rs                # 内存缓存
├── migrations/
│   └── 001_add_user_preferences.sql  # 用户偏好设置表
├── Cargo.toml                        # Rust 项目配置
├── Cargo.lock
└── Dockerfile                        # 后端 Docker 配置
```

## CI/CD

```
.github/workflows/
└── ci-cd.yml                        # GitHub Actions 工作流
```

## 总结

### 核心模块

| 模块 | 说明 |
|------|------|
| **前端 (frontend/)** | React + Vite + Tailwind CSS 单页应用 |
| **IAM Service (topems-iam/)** | Rust + Axum 身份认证服务 |

### 关键文件

| 文件 | 用途 |
|------|------|
| `frontend/vite.config.ts` | Vite 配置、PWA 插件、代码分割 |
| `frontend/src/App.tsx` | 路由配置、代码分割懒加载 |
| `frontend/src/store/index.ts` | Zustand 状态管理、持久化 |
| `services/topems-iam/backend/src/main.rs` | IAM 服务主程序 |
| `services/topems-iam/backend/Cargo.toml` | Rust 依赖、特性 |
| `docker-compose.yml` | Docker Compose 服务编排 |
| `scripts/quick-start.sh` | 一键快速启动脚本 |

---

**创建日期**: 2026-06-01
**最后更新**: 2026-06-01
