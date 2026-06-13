# 模板调试工具使用说明

## 工具概述

`template-debug-tool-simple.sh` 是一个用于快速排查模板变量替换问题的命令行工具，整合了排查指南中的核心调试技巧。

## 快速开始

```bash
# 查看帮助信息
./scripts/template-debug-tool-simple.sh help

# 启动调试服务器
./scripts/template-debug-tool-simple.sh start-debug-server
```

## 命令列表

### 1. check-template - 检查模板内容

检查模板的基本信息、内容和变量定义。

```bash
./scripts/template-debug-tool-simple.sh check-template <模板ID>
```

**示例**：
```bash
./scripts/template-debug-tool-simple.sh check-template abc123-def456
```

**输出内容**：
- 模板基本信息（名称、编码）
- 模板原始内容
- 变量定义（JSON格式）

---

### 2. test-render - 测试模板渲染

使用提供的变量配置测试模板渲染。

```bash
./scripts/template-debug-tool-simple.sh test-render <模板ID> <变量JSON>
```

**示例**：
```bash
./scripts/template-debug-tool-simple.sh test-render abc123 '{"name":"测试流程","description":"这是一个测试"}'
```

**输出内容**：
- 渲染请求信息
- 渲染结果

---

### 3. start-debug-server - 启动调试服务器

启动带调试日志的后端服务，自动停止现有服务并重启。

```bash
./scripts/template-debug-tool-simple.sh start-debug-server
```

**输出内容**：
- 服务启动信息
- 日志级别：DEBUG
- 端口：8024
- API地址

**注意**：此命令会占用终端，日志会实时输出到控制台。

---

## 使用场景

### 场景1：排查变量替换失败

**步骤**：
```bash
# 1. 检查模板内容
./scripts/template-debug-tool-simple.sh check-template <模板ID>

# 2. 测试渲染
./scripts/template-debug-tool-simple.sh test-render <模板ID> '<变量JSON>'
```

---

### 场景2：启动调试环境

**步骤**：
```bash
# 1. 启动调试服务器
./scripts/template-debug-tool-simple.sh start-debug-server

# 2. 在另一个终端执行调试命令
./scripts/template-debug-tool-simple.sh check-template <模板ID>
```

---

## 常见问题

### Q1: 无法获取模板信息

**原因**：后端服务未启动或模板ID错误

**解决**：
```bash
# 1. 启动调试服务器
./scripts/template-debug-tool-simple.sh start-debug-server

# 2. 检查模板ID是否正确
curl http://localhost:8024/api/v1/templates
```

---

### Q2: jq 命令未找到

**原因**：系统缺少 jq 工具

**解决**：
```bash
# macOS
brew install jq

# Linux
apt-get install jq
```

---

### Q3: 端口8024已被占用

**原因**：其他服务占用端口

**解决**：
```bash
# 查看占用进程
lsof -i :8024

# 停止占用进程
lsof -ti :8024 | xargs kill -9
```

---

## 工具文件位置

- **脚本文件**：[template-debug-tool-simple.sh](file:///Users/air/TOPEMS/scripts/template-debug-tool-simple.sh)
- **排查指南**：[template-troubleshooting-guide.md](file:///Users/air/TOPEMS/docs/template-troubleshooting-guide.md)
- **技术规格**：[2026-06-13-template-management-design.md](file:///Users/air/TOPEMS/docs/superpowers/specs/2026-06-13-template-management-design.md)

---

## 相关文档

- [模板变量替换失败排查指南](file:///Users/air/TOPEMS/docs/template-troubleshooting-guide.md)
- [模板日志功能实施存档](file:///Users/air/TOPEMS/docs/archive/2026-06-13-template-logging-implementation.md)

---

**文档版本**: v1.1  
**更新时间**: 2026-06-13