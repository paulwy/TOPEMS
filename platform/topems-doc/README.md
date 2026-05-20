# TOPEMS-DOC 统一文件管理系统

TOPEMS-DOC 是 TOPEMS 平台的统一文件管理系统，是第一个从单体应用拆分的微服务样板工程。

## 核心特性

- 多级目录管理
- 权限分级控制
- 文件版本管理
- 在线预览
- 涉密管控
- 内外网隔离

## 技术栈

- **后端**：Rust + Axum + SQLx
- **前端**：React 18 + TypeScript 5
- **数据库**：PostgreSQL 15+
- **存储**：本地存储 / S3 / OSS

## 快速开始

### 环境要求

- Rust 1.77+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### 开发

```bash
# 启动后端服务
cd backend
cargo run

# 启动前端服务
cd frontend
npm install
npm run dev
```

## API 文档

访问 http://localhost:8000/swagger-ui 查看完整的 API 文档。

## 项目结构

```
topems-doc/
├── backend/
│   ├── src/
│   │   ├── api/           # API 层
│   │   ├── services/      # 业务服务层
│   │   ├── db/            # 数据访问层
│   │   ├── models/        # 数据模型
│   │   └── main.rs        # 入口文件
│   ├── Cargo.toml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── pages/         # 页面
│   │   ├── hooks/         # 自定义 Hooks
│   │   └── App.tsx        # 应用入口
│   ├── package.json
│   └── Dockerfile
└── README.md
```

## 设计原则

1. **独立数据库**：使用独立的数据库 Schema
2. **API 优先**：先定义 API 契约，再开发实现
3. **无循环依赖**：禁止与其他服务形成循环依赖
4. **版本控制**：API 包含版本号（/v1/files）

## 团队分工

- 后端开发：张三
- 前端开发：李四
- 测试：王五

## 许可证

专有许可证

## 版本

v1.0.0  
更新日期: 2026-05-20
