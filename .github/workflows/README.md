# GitHub Actions CI/CD 配置说明

## 工作流概述

本项目使用 GitHub Actions 实现自动化 CI/CD 流程，包含以下阶段：

1. **Lint**: 代码格式检查和静态分析
2. **Test**: 运行单元测试和集成测试
3. **Build**: 编译所有服务
4. **Deploy**: 部署到 staging 或 production 环境
5. **Notify**: 部署结果通知

## 触发条件

| 事件类型 | 触发分支 | 触发操作 |
|---------|---------|---------|
| `push` | `main`, `develop`, `release/**` | 完整 CI/CD 流程 |
| `pull_request` | `main`, `develop` | 仅 Lint 和 Test |
| `workflow_dispatch` | 任意 | 手动触发部署 |

## 环境配置

### GitHub Secrets 配置

在 GitHub 仓库的 **Settings > Secrets and variables > Actions** 中配置以下 secrets：

#### Staging 环境
| Secret 名称 | 说明 |
|------------|------|
| `STAGING_HOST` | Staging 服务器主机地址 |
| `STAGING_USER` | SSH 登录用户名 |
| `STAGING_SSH_KEY` | SSH 私钥 |
| `STAGING_PORT` | SSH 端口（可选，默认 22） |

#### Production 环境
| Secret 名称 | 说明 |
|------------|------|
| `PROD_HOST` | 生产服务器主机地址 |
| `PROD_USER` | SSH 登录用户名 |
| `PROD_SSH_KEY` | SSH 私钥 |
| `PROD_PORT` | SSH 端口（可选，默认 22） |
| `PROD_DOMAIN` | 生产环境域名 |

### GitHub Environments 配置

在 GitHub 仓库的 **Settings > Environments** 中创建以下环境：

1. **staging** - 用于预发布测试
2. **production** - 用于生产环境

建议为 production 环境启用 **Required reviewers** 功能，需要人工审核才能部署。

## 工作流架构

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Events                          │
│  push (main/develop/release/*) | pull_request | dispatch   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Job: lint                                                 │
│  ├── Checkout code                                         │
│  ├── Install Rust with rustfmt, clippy                     │
│  ├── Run cargo fmt --check                                 │
│  └── Run cargo clippy --all --all-targets                  │
└──────────────────┬──────────────────────────────────────────┘
                   │ (success)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Job: test                                                 │
│  ├── Start PostgreSQL service                              │
│  ├── Start Redis service                                   │
│  ├── Run cargo test --all                                  │
│  └── Upload coverage report                                │
└──────────────────┬──────────────────────────────────────────┘
                   │ (success)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Job: build                                                │
│  ├── Build all services with --release                     │
│  └── Upload artifacts                                     │
└──────────────────┬──────────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌───────────────┐    ┌───────────────────┐
│ deploy-staging│    │ deploy-production │
│ (develop)     │    │ (main)            │
└───────┬───────┘    └─────────┬─────────┘
        │                      │
        └───────────┬──────────┘
                    ▼
           ┌─────────────────┐
           │   Job: notify   │
           │ (deployment     │
           │  status alert)  │
           └─────────────────┘
```

## 使用说明

### 手动触发部署

1. 访问 GitHub 仓库的 **Actions** 页面
2. 选择 **CI/CD Pipeline** 工作流
3. 点击 **Run workflow**
4. 选择目标环境（staging 或 production）
5. 点击 **Run workflow**

### 查看部署状态

- 所有部署状态可在 **Actions** 页面查看
- 部署成功或失败会自动在相关 PR/Issue 上添加评论通知

## 安全注意事项

1. SSH 私钥应使用无密码保护的密钥对
2. 生产环境部署启用人工审核机制
3. 所有敏感配置通过 GitHub Secrets 管理
4. 建议定期轮换 SSH 密钥

## 性能优化

- 使用 `Swatinem/rust-cache` 缓存 Rust 依赖，加速构建
- 使用 `cargo build --release` 构建生产优化版本
- 测试使用 `--test-threads=1` 避免数据库连接竞争

## 故障排除

### 常见问题

1. **构建失败**: 检查 Rust 版本是否正确，查看缓存是否过期
2. **测试失败**: 检查 PostgreSQL/Redis 服务是否正常启动
3. **部署失败**: 检查 SSH 密钥、服务器地址和端口配置
4. **权限问题**: 确保部署用户有足够权限操作服务

### 日志查看

- 在 GitHub Actions 页面查看每个 Job 的详细日志
- 生产环境使用 `journalctl -u topems-<service>` 查看服务日志