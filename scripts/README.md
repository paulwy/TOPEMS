# TOPEMS 脚本工具

> **注意**: 主要功能已迁移到 [Python CLI 工具](../cli/README.md)。

## 目录结构

```
scripts/
├── topems.sh         # 统一入口（指向 Python CLI）
├── deploy.sh         # Docker 部署脚本
├── ai-models.sh      # AI 模型管理
├── install-deps.sh   # 依赖安装
├── docker/          # Docker 相关配置
├── windows/         # Windows 部署脚本
└── archive/        # 已归档的脚本
```

## Python CLI（推荐）

```bash
cd ../cli
pip install pyyaml click rich httpx

python -m topems_cli --help
```

## 保留的 Bash 脚本

| 脚本 | 说明 |
|------|------|
| `topems.sh` | 统一入口（指向 Python CLI） |
| `deploy.sh` | Docker 部署 |
| `ai-models.sh` | AI 模型管理 |
| `install-deps.sh` | 依赖安装 |

## 快速参考

```bash
# Python CLI
python -m topems_cli status --all
python -m topems_cli start -m core
python -m topems_cli db init
python -m topems_cli build all

# Bash 脚本
./topems.sh status --all
./deploy.sh
```

## 文档

- [Python CLI](../cli/README.md)
- [部署文档](../docs/deployment/README.md)
- [Windows 部署](../docs/deployment/windows-deployment.md)
