# TOPEMS 桌面端架构设计（Tauri）

## 文档信息

| 项目 | 内容 |
|------|------|
| **文档版本** | v1.0 |
| **创建日期** | 2026-06-10 |
| **适用阶段** | 架构设计 |
| **状态** | 待评审 |

---

## 一、Tauri 核心概念

### 1.1 什么是 Tauri

Tauri 是一个用于构建跨平台桌面应用的框架，具有以下特点：

| 特性 | 说明 |
|------|------|
| **跨平台** | 支持 macOS、Windows、Linux |
| **轻量级** | 基于 Rust 核心，资源占用极低 |
| **安全** | 严格的权限系统，默认沙箱隔离 |
| **原生能力** | 通过 Rust 桥接访问系统 API |
| **Web 技术栈** | 使用 React/Vue/Svelte 等前端框架 |

### 1.2 Tauri 架构模型

```
┌─────────────────────────────────────────────────────────────────┐
│                      Tauri 架构模型                            │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Frontend Layer                       │   │
│  │         React + TypeScript + Tailwind CSS              │   │
│  └───────────────────────────┬───────────────────────────┘   │
│                              │                               │
│                              │  IPC (Inter-Process Communication) │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Tauri Core (Rust)                     │   │
│  │  • Window Management                                   │   │
│  │  • System Dialogs                                      │   │
│  │  • File System Access                                  │   │
│  │  • Native Notifications                                │   │
│  └───────────────────────────┬───────────────────────────┘   │
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Operating System                     │   │
│  │   macOS / Windows / Linux                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 为什么选择 Tauri 而非 Electron

| 维度 | Tauri | Electron |
|------|-------|----------|
| **包体积** | ~10MB | ~50MB+ |
| **内存占用** | ~50MB | ~200MB+ |
| **启动速度** | <1秒 | >2秒 |
| **安全模型** | 权限清单机制 | 沙箱较宽松 |
| **渲染引擎** | 系统原生 WebView | Chromium 内嵌 |
| **构建工具** | Cargo/Rust | Node.js/npm |

---

## 二、桌面端架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                   TOPEMS Desktop 架构                         │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    UI Layer                             │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │ 主窗口   │  │ 弹窗组件 │  │ 侧边栏   │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └───────────────────────────┬───────────────────────────┘   │
│                              │                               │
│  ┌───────────────────────────┼───────────────────────────┐   │
│  │                    Business Layer                     │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │ 状态管理 │  │ API调用  │  │ 本地存储 │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └───────────────────────────┬───────────────────────────┘   │
│                              │                               │
│  ┌───────────────────────────┼───────────────────────────┐   │
│  │                    Tauri Bridge                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │ 文件系统 │  │ 系统通知 │  │ 窗口管理 │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └───────────────────────────┬───────────────────────────┘   │
│                              │                               │
│  ┌───────────────────────────┼───────────────────────────┐   │
│  │                    Rust Core                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │ Main.rs  │  │ 插件系统 │  │ 权限控制 │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 核心模块设计

#### 2.2.1 窗口管理模块

```rust
// src/main.rs - 窗口管理
use tauri::{Manager, WindowBuilder, WindowUrl};

fn create_main_window(app: &tauri::App) -> Result<(), tauri::Error> {
    WindowBuilder::new(
        app,
        "main",
        WindowUrl::App("index.html".into())
    )
    .title("TOPEMS")
    .inner_size(1200, 800)
    .min_inner_size(800, 600)
    .resizable(true)
    .fullscreen(false)
    .visible_on_all_workspaces(false)
    .build()?;
    
    Ok(())
}
```

#### 2.2.2 文件系统模块

```rust
// src/main.rs - 文件系统能力
#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    Ok(content)
}

#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn select_directory() -> Result<String, String> {
    let dialog = rfd::FileDialog::new()
        .pick_folder()
        .ok_or("No folder selected".to_string())?;
    Ok(dialog.to_string_lossy().to_string())
}
```

#### 2.2.3 系统通知模块

```rust
// src/main.rs - 系统通知
#[tauri::command]
async fn send_notification(title: String, body: String) -> Result<(), String> {
    let app_handle = tauri::generate_context!().app_handle();
    
    let notification = tauri::Notification::new(&app_handle.config().tauri.bundle.identifier)
        .title(&title)
        .body(&body)
        .icon(tauri::Icon::Raw(include_bytes!("../icons/app.png")));
    
    notification.show().map_err(|e| format!("Failed to send notification: {}", e))
}
```

### 2.3 前端集成

#### 2.3.1 Tauri API 封装

```typescript
// src/lib/tauri.ts - Tauri API 封装
import { invoke } from '@tauri-apps/api/tauri';
import { open, save } from '@tauri-apps/api/dialog';
import { emit, listen } from '@tauri-apps/api/event';

export const fileApi = {
  readFile: async (path: string): Promise<string> => {
    return invoke('read_file', { path });
  },
  
  writeFile: async (path: string, content: string): Promise<void> => {
    return invoke('write_file', { path, content });
  },
  
  selectDirectory: async (): Promise<string> => {
    return invoke('select_directory');
  },
  
  openFile: async (filters?: { name: string; extensions: string[] }[]): Promise<string> => {
    return open({ filters });
  },
  
  saveFile: async (filters?: { name: string; extensions: string[] }[]): Promise<string> => {
    return save({ filters });
  }
};

export const notificationApi = {
  send: async (title: string, body: string): Promise<void> => {
    return invoke('send_notification', { title, body });
  }
};

export const eventApi = {
  emit: emit,
  listen
};
```

#### 2.3.2 离线数据同步

```typescript
// src/lib/offline.ts - 离线数据同步
import { fileApi } from './tauri';

const STORAGE_DIR = '.topems/data';

export interface OfflineData {
  companies: Company[];
  employees: Employee[];
  lastSync: Date;
}

export const offlineStorage = {
  async save(data: OfflineData): Promise<void> {
    const path = `${STORAGE_DIR}/offline.json`;
    await fileApi.writeFile(path, JSON.stringify(data, null, 2));
  },
  
  async load(): Promise<OfflineData | null> {
    try {
      const path = `${STORAGE_DIR}/offline.json`;
      const content = await fileApi.readFile(path);
      return JSON.parse(content);
    } catch {
      return null;
    }
  },
  
  async syncWithServer(): Promise<void> {
    const localData = await this.load();
    if (!localData) return;
    
    // 同步逻辑
    await api.syncData(localData);
    await this.save({ ...localData, lastSync: new Date() });
  }
};
```

---

## 三、目录结构

### 3.1 项目结构

```
apps/desktop/
├── src/                                    # Rust 核心代码
│   ├── main.rs                             # 应用入口
│   ├── lib.rs                              # 库定义
│   ├── commands/                           # Tauri 命令
│   │   ├── file.rs                         # 文件系统命令
│   │   ├── notification.rs                 # 通知命令
│   │   ├── window.rs                       # 窗口命令
│   │   └── mod.rs                          # 命令导出
│   └── plugins/                            # 自定义插件
│       ├── sync.rs                         # 离线同步插件
│       └── mod.rs
├── web/                                    # 前端代码（React）
│   ├── src/
│   │   ├── components/                     # UI组件
│   │   │   ├── Layout/                     # 布局组件
│   │   │   ├── Sidebar/                    # 侧边栏
│   │   │   └── Dialog/                     # 弹窗组件
│   │   ├── pages/                          # 页面
│   │   │   ├── Dashboard/                  # 仪表盘
│   │   │   ├── Company/                    # 公司管理
│   │   │   └── Employee/                   # 员工管理
│   │   ├── lib/                            # 工具库
│   │   │   ├── tauri.ts                    # Tauri API 封装
│   │   │   ├── offline.ts                  # 离线存储
│   │   │   └── api.ts                      # 后端API调用
│   │   ├── store/                          # 状态管理
│   │   ├── App.tsx                         # 应用入口
│   │   └── main.tsx                        # 渲染入口
│   ├── index.html                          # HTML模板
│   ├── package.json                        # 前端依赖
│   └── vite.config.ts                      # Vite配置
├── icons/                                  # 应用图标
│   ├── 32x32.png
│   ├── 64x64.png
│   ├── 128x128.png
│   ├── 256x256.png
│   └── 512x512.png
├── tauri.conf.json                         # Tauri配置
├── Cargo.toml                              # Rust依赖
└── package.json                            # 项目脚本
```

### 3.2 tauri.conf.json 关键配置

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:5173",
    "distDir": "../web/dist"
  },
  "package": {
    "productName": "TOPEMS",
    "version": "1.0.0",
    "icon": [
      "icons/32x32.png",
      "icons/64x64.png",
      "icons/128x128.png",
      "icons/256x256.png",
      "icons/512x512.png"
    ]
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "dialog": {
        "open": true,
        "save": true
      },
      "fs": {
        "readFile": true,
        "writeFile": true,
        "readDir": true,
        "scope": ["$HOME/.topems/**"]
      },
      "notification": {
        "all": true
      },
      "window": {
        "all": true
      }
    },
    "bundle": {
      "active": true,
      "targets": "all"
    }
  }
}
```

---

## 四、核心优势

### 4.1 性能优势

| 指标 | Tauri | Electron | 对比 |
|------|-------|----------|------|
| **包体积** | ~15MB | ~60MB | **75% 减小** |
| **启动时间** | ~0.8秒 | ~2.5秒 | **68% 提升** |
| **内存占用** | ~60MB | ~220MB | **73% 降低** |
| **CPU占用** | ~5% | ~15% | **67% 降低** |

### 4.2 安全优势

```
┌─────────────────────────────────────────────────────────────────┐
│                      Tauri 安全模型                           │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  权限清单机制                            │   │
│  │  • 默认禁止所有系统访问                                  │   │
│  │  • 显式声明所需权限                                      │   │
│  │  • 支持细粒度权限控制                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  沙箱隔离                                │   │
│  │  • WebView 运行在独立进程                               │   │
│  │  • Rust 核心与前端隔离                                  │   │
│  │  • IPC 通信严格校验                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  更新机制                                │   │
│  │  • 自动更新支持                                         │   │
│  │  • 签名验证                                             │   │
│  │  • 回滚机制                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 开发优势

| 维度 | 说明 |
|------|------|
| **统一技术栈** | 前端使用 React + TypeScript，与 Web 端共享代码 |
| **热更新** | 开发时支持即时热更新，无需重启应用 |
| **调试工具** | 支持 Chrome DevTools 调试 |
| **跨平台** | 一套代码构建 macOS、Windows、Linux |

### 4.4 离线能力

```
┌─────────────────────────────────────────────────────────────────┐
│                      离线能力架构                            │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  本地数据库                              │   │
│  │  • SQLite 存储                                          │   │
│  │  • 数据加密存储                                         │   │
│  │  • 增量同步                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  离线操作                                │   │
│  │  • 支持离线创建/编辑/删除                                │   │
│  │  • 操作队列管理                                         │   │
│  │  • 网络恢复后自动同步                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  数据冲突处理                            │   │
│  │  • 版本检测                                             │   │
│  │  • 冲突提示                                             │   │
│  │  • 手动/自动解决                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 五、打包与分发

### 5.1 构建命令

```bash
# 开发模式
npm run tauri dev

# 生产构建
npm run tauri build

# 指定平台构建
npm run tauri build -- --target x86_64-apple-darwin   # macOS
npm run tauri build -- --target x86_64-pc-windows-msvc # Windows
npm run tauri build -- --target x86_64-unknown-linux-gnu # Linux
```

### 5.2 分发格式

| 平台 | 格式 | 说明 |
|------|------|------|
| **macOS** | `.dmg`, `.app` | DMG 镜像包，可签名分发 |
| **Windows** | `.msi`, `.exe` | MSI 安装包，支持静默安装 |
| **Linux** | `.deb`, `.rpm`, `.AppImage` | 多种包管理器支持 |

### 5.3 自动更新

```rust
// src/main.rs - 自动更新
use tauri_plugin_updater::UpdaterBuilder;

fn main() {
    tauri::Builder::default()
        .plugin(
            UpdaterBuilder::new()
                .endpoint("https://update.topems.io/latest")
                .build()
        )
        .run(tauri::generate_context!())
        .expect("error running tauri app");
}
```

---

## 六、与 Web 端共享代码

### 6.1 共享模块

```
shared/
├── components/                      # 共享组件
│   ├── DataTable/                   # 数据表格
│   ├── Form/                        # 表单组件
│   └── Button/                      # 按钮组件
├── hooks/                           # 共享 Hooks
│   ├── useAuth.ts                   # 认证 Hook
│   ├── useCrud.ts                   # CRUD Hook
│   └── useToast.ts                  # 提示 Hook
├── lib/                             # 共享工具
│   ├── api.ts                       # API 调用
│   ├── utils.ts                     # 工具函数
│   └── validation.ts                # 验证逻辑
└── types/                           # 共享类型
    ├── index.ts                     # 类型定义
```

### 6.2 架构优势

```
┌─────────────────────────────────────────────────────────────────┐
│                   代码共享架构                               │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐        ┌──────────────────┐            │
│  │    Web 前端      │        │   Desktop 前端   │            │
│  │  (React + Vite)  │        │  (React + Tauri) │            │
│  └────────┬─────────┘        └────────┬─────────┘            │
│           │                           │                       │
│           └──────────┬────────────────┘                       │
│                      ▼                                        │
│           ┌──────────────────┐                                │
│           │    Shared Lib    │                                │
│           │   (共享代码)     │                                │
│           └──────────────────┘                                │
│                                                               │
│  优势:                                                        │
│  • 代码复用率 > 70%                                           │
│  • 功能一致性保证                                             │
│  • 维护成本降低                                               │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 七、总结

### 7.1 Tauri 桌面端核心优势

| 维度 | 优势 |
|------|------|
| **性能** | 轻量级、快速启动、低资源占用 |
| **安全** | 严格权限控制、沙箱隔离 |
| **跨平台** | 一套代码支持三大平台 |
| **开发体验** | 热更新、DevTools 支持 |
| **离线能力** | 完整的离线数据管理 |
| **代码复用** | 与 Web 端共享 70%+ 代码 |

### 7.2 实施路线图

| 阶段 | 时间 | 任务 |
|------|------|------|
| **Phase 1** | 2周 | 项目初始化，基础窗口搭建 |
| **Phase 2** | 3周 | 核心功能开发（公司、员工管理） |
| **Phase 3** | 2周 | 离线存储与同步功能 |
| **Phase 4** | 2周 | 系统集成（文件、通知等） |
| **Phase 5** | 2周 | 测试与打包分发 |

### 7.3 预期成果

- ✅ 轻量级桌面应用（~15MB）
- ✅ 支持离线操作
- ✅ 跨平台分发（macOS/Windows/Linux）
- ✅ 与 Web 端一致的用户体验
- ✅ 自动更新机制

---

**文档版本**: v1.0  
**最后更新**: 2026-06-10