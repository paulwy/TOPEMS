# TOPEMS 前端门户

统一的企业数字化平台前端门户，基于 React + TypeScript + Vite + Tailwind CSS。

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm 或 yarn

### 安装依赖

```bash
cd frontend
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
```

## 🔧 技术栈

- **框架**: React 18
- **语言**: TypeScript
- **构建工具**: Vite 6
- **样式**: Tailwind CSS 4
- **路由**: React Router 6
- **HTTP 客户端**: Axios
- **图标**: Lucide React

## 📡 后端服务

前端需要以下后端服务运行：

| 服务类别 | 服务 | 端口 |
|---------|------|------|
| **核心平台** | IAM | 8000 |
| | DOC | 8001 |
| | PM | 8002 |
| | NOTIFICATION | 8003 |
| | INTEGRATION | 8004 |
| | PORTAL | 8005 |
| | FLOW | 8006 |
| **业务服务** | ERP | 8010 |
| | HRM | 8011 |
| | CRM | 8012 |
| | AI | 8013 |
| | RS | 8020 |
| | LIMS | 8022 |
| | PDM | 8023 |
| | MES | 8030 |
| | QMS | 8031 |
| | EHS | 8032 |
| | SCM | 8040 |
| | SRM | 8041 |
| | WMS | 8042 |
| | GIS | 8050 |
| | IM | 8051 |
| | BI | 8052 |
| | REPORT | 8053 |
| | MAIL | 8054 |
| | MOBILE | 8055 |

查看 [scripts/manage-services.sh](../scripts/README.md) 了解如何管理所有服务。

## 📝 演示账号

- 用户名: testuser
- 密码: Test123456

## 📚 更多文档

- [后端 API 文档](../docs/api/README.md)
- [系统架构](../docs/architecture/overview.md)
- [主项目文档](../README.md)

## 📄 许可证

MIT License
