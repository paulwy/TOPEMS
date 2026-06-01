# TOPEMS 2.0 总体架构设计（完整版）

**文档版本**: v2.0.1  
**更新日期**: 2026-05-25  
**设计目标**: 化工新材料企业全业务数字化平台  
**当前阶段**: 阶段二（核心研发+实验室王牌产品）

---

## 一、总体定位与核心设计理念

### 1.1 系统定位

TOPEMS = 10 个可独立商业化产品 + 4 个中台底座系统 + 统一数据互通总线

**对外**：每个子系统均可单独私有化部署、独立售卖、独立版本迭代；  
**对内**：统一账号、统一权限、统一文件、统一消息、统一数据标准，聚合为完整一体化平台。

### 1.2 核心设计原则

| 原则 | 说明 |
|------|------|
| 边界清晰 | 每个子系统业务闭环，无强依赖 |
| 独立运行 | 脱离其他模块可完整使用 |
| 融合一体 | 中台统一打通，无数据孤岛 |
| 垂直差异化 | 优先打造化工新材料赛道稀缺产品 |
| 迭代解耦 | 各系统独立排期、独立版本、独立团队 |

---

## 二、整体架构设计

### 2.1 全系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              统一门户入口层                                   │
│                    (统一工作台 + 统一待办中心 + 统一数据大屏)                 │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               API 网关层                                     │
│               (统一认证、统一路由、统一限流、统一日志、统一监控)              │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
         ▼                             ▼                             ▼
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│    中台底座系统      │     │     业务系统        │     │    数据系统         │
├──────────────────────┤     ├──────────────────────┤     ├──────────────────────┤
│ TOPEMS-IAM 身份认证 │     │ TOPEMS-RS 科研研发  │     │ TOPEMS-BI 数据大屏 │
│ TOPEMS-FLOW OA流程  │     │ TOPEMS-LIMS 实验管理│     │ 数据仓库/ODS       │
│ TOPEMS-DOC 文件管理 │     │ TOPEMS-QMS 质量合规 │     │ 实时流处理         │
│ TOPEMS-AI 智能知识  │     │ TOPEMS-EHS 安全环保 │     │ 向量数据库         │
│ TOPEMS-IM 即时通讯  │     │ TOPEMS-ERP 专用ERP │     │                    │
│ TOPEMS-MOBILE 移动  │     │ TOPEMS-SRM 供应商   │     │                    │
│                      │     │ TOPEMS-GIS 空间数字化│     │                    │
└──────────────────────┘     └──────────────────────┘     └──────────────────────┘
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             数据存储层                                       │
│   PostgreSQL 16 + Redis 7 + 文件存储 + 向量数据库 (Chroma)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 系统全视图（10+4架构）

#### 商业化独立产品（10个，均可对外售卖）

| 序号 | 系统名称 | 优先级 | 独立能力 | 产品价值 | 耦合度 |
|------|---------|--------|----------|----------|--------|
| 1 | TOPEMS-DOC | 基础 | 可独立作为企业网盘、项目文档库、科研资料库交付 | 研发型企业文档中台、项目资料管理系统 | 极低 |
| 2 | TOPEMS-AI | ⭐⭐⭐ | 独立私有化部署，可单独卖给新材料、化工、制造企业 | 企业私有RAG知识库、研发知识中台、合规智能检索 | 低 |
| 3 | TOPEMS-RS | ⭐⭐⭐ | 闭环运行，行业竞品少、溢价高，优先打造对外核心产品 | 精细化工/新材料专用研发管理系统 | 中等 |
| 4 | TOPEMS-LIMS | ⭐⭐⭐ | 独立性极高，比ERP更易商业化，第三方实验室、企业质检中心刚需 | 化工新材料专业实验室数字化系统 | 中等 |
| 5 | TOPEMS-QMS | ⭐⭐ | 可独立售卖，化工行业合规监管必备 | 精细化工质量追溯、合规审计系统 | 中等 |
| 6 | TOPEMS-EHS | ⭐⭐ | 化工园区、工厂强制刚需，可独立工程交付 | 化工厂区安全环保数字化系统 | 中等 |
| 7 | TOPEMS-ERP | ⭐⭐ | 脱离其他模块完整运行，区别于通用用友/金蝶 | 精细化工专用ERP，适配配方、批次、质量管控 | 中高 |
| 8 | TOPEMS-SRM | ⭐ | 中小企业供应商协同刚需，可独立交付 | 新材料行业供应商协同系统 | 中等 |
| 9 | TOPEMS-GIS | ⭐ | 可独立作为厂区管理、工程台账、现场数字化产品 | 化工园区、工厂厂区空间数字化系统 | 中等 |
| 10 | TOPEMS-BI | ⭐⭐ | 可独立承接企业数字化大屏、经营分析项目 | 垂直行业数据可视化平台 | 低 |

#### 中台底座系统（4个，可独立、优先自用，支撑整体平台）

| 序号 | 系统名称 | 独立能力 | 产品价值 | 耦合度 |
|------|---------|----------|----------|--------|
| 11 | TOPEMS-IAM | 可独立售卖企业级安全中台 | 一套账号、角色、组织、岗位、数据权限，一次登录全系统互通 | 极低 |
| 12 | TOPEMS-FLOW | 可独立做通用OA，市场内卷，优先作为内部审批中枢 | 全系统统一审批入口、待办中心、消息通知 | 高 |
| 13 | TOPEMS-MOBILE | 可独立交付工厂移动终端系统 | 全系统移动端统一入口 | 低 |
| 14 | TOPEMS-IM | 可独立，但竞争激烈，优先内部协同 | 支撑全系统内部沟通 | 低 |

---

## 三、技术架构设计

### 3.1 技术栈选型

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 前端框架 | React | 18.x | UI组件开发 |
| 语言 | TypeScript | 5.x | 类型安全 |
| 构建工具 | Vite | 6.x | 快速构建 |
| 状态管理 | Zustand | 4.x | 全局状态 |
| 路由 | React Router | 6.x | 路由管理 |
| 后端框架 | Axum | 0.8.x | Web框架 |
| 语言 | Rust | 1.77+ | 后端逻辑 |
| ORM | SQLx | 0.8.x | 数据库访问 |
| 主数据库 | PostgreSQL | 16 | 业务数据存储 |
| 向量扩展 | pgvector | - | 向量检索 |
| 缓存/消息 | Redis | 7 | 缓存、会话、消息队列 |
| 向量数据库 | Chroma | - | 文档向量存储 |
| AI | Ollama | - | 本地模型部署 |
| 容器化 | Docker Compose | - | 开发环境编排 |
| 生产编排 | Kubernetes | - | 生产环境编排 |
| 桌面框架 | Tauri | 2.x | 跨平台桌面应用 |
| 移动框架 | Capacitor | 6.x | 跨平台移动应用 |
| 地图服务 | Mapbox/高德地图 | - | 定位与地图展示 |

### 3.2 前端技术架构

#### 多端支持策略

TOPEMS 采用 **Web + Desktop + Mobile** 三端架构，核心代码复用，根据不同端的特性提供差异化体验：

| 端类型 | 技术栈 | 适用场景 | 特点 |
|--------|--------|----------|------|
| Web | React + Vite | 通用访问、远程协作 | 跨平台、无需安装 |
| Desktop | Tauri + React | 文档管理、本地文件操作 | 原生体验、系统集成 |
| Mobile | Capacitor + React | 现场巡检、定位取证、移动审批 | 原生能力、离线支持、定位服务 |

#### 桌面端架构

```
┌─────────────────────────────────────────────────────────────┐
│                    TOPEMS Desktop App                       │
│                    (Tauri + React)                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │              React Web 应用 (共享代码)                │   │
│  │  - UI 组件、业务逻辑、状态管理                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                 │
│                          ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               Tauri Bridge (原生能力)                │   │
│  │  - 文件系统访问 (读取/写入本地文件)                  │   │
│  │  - 系统托盘集成                                     │   │
│  │  - 本地通知推送                                     │   │
│  │  - 窗口管理                                         │   │
│  │  - 系统对话框 (打开/保存文件)                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                 │
│                          ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              原生操作系统层                          │   │
│  │  - macOS (x86_64 / ARM64)                          │   │
│  │  - Windows (x86_64)                                │   │
│  │  - Linux (x86_64)                                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 桌面端核心能力

| 能力 | 说明 | 技术实现 |
|------|------|---------|
| 文件拖拽 | 支持从桌面拖拽文件到应用 | Tauri FileDrop API |
| 本地文件读取 | 直接读取本地文档进行解析 | Tauri fs API |
| 系统托盘 | 最小化到托盘，后台运行 | Tauri Tray API |
| 本地通知 | 推送系统级通知 | Tauri Notification API |
| 窗口管理 | 支持多窗口、模态框 | Tauri Window API |

#### 桌面端项目结构

```
platform/topems-doc/frontend/
├── src/                              # Web 共享代码
│   ├── components/                  # UI 组件
│   ├── pages/                       # 页面
│   ├── hooks/                       # 自定义 Hooks
│   └── lib/                         # 工具库
├── src-tauri/                        # Tauri 桌面端配置
│   ├── src/
│   │   ├── lib.rs                   # Rust 后端逻辑
│   │   └── main.rs                  # 应用入口
│   ├── capabilities/                # 能力权限配置
│   │   └── default.json             # 默认权限
│   ├── icons/                       # 应用图标
│   ├── Cargo.toml                   # Rust 依赖
│   └── tauri.conf.json              # Tauri 配置
├── index.html
├── package.json
└── vite.config.ts
```

#### 移动端架构

```
┌─────────────────────────────────────────────────────────────┐
│                    TOPEMS Mobile App                        │
│                  (Capacitor + React)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │              React Web 应用 (共享代码)                │   │
│  │  - UI 组件、业务逻辑、状态管理                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                 │
│                          ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             Capacitor Bridge (原生能力)              │   │
│  │  - 定位服务 (GPS/北斗/Wi-Fi定位)                    │   │
│  │  - 相机/扫码                                        │   │
│  │  - 离线存储                                         │   │
│  │  - 推送通知                                         │   │
│  │  - 文件系统                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                 │
│                          ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              原生操作系统层                          │   │
│  │  - iOS (Swift)                                     │   │
│  │  - Android (Kotlin)                                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 移动端核心能力

| 能力 | 说明 | 技术实现 |
|------|------|---------|
| **定位服务** | GPS/北斗/Wi-Fi混合定位，支持实时位置追踪 | Capacitor Geolocation API |
| **地图展示** | 集成地图服务，展示位置、导航、标记点 | Mapbox SDK / 高德地图SDK |
| **扫码识别** | 扫码入库、设备巡检、二维码识别 | Capacitor Barcode Scanner |
| **相机拍照** | 现场取证、文档扫描、图片上传（自动附加位置信息） | Capacitor Camera API |
| **录音功能** | 语音记录、现场汇报、安全巡检录音（自动附加位置信息） | Capacitor Audio Recorder |
| **录像功能** | 视频取证、设备状态记录、现场情况录制（自动附加位置信息） | Capacitor Camera API |
| **离线存储** | 离线数据缓存、本地数据库 | Capacitor Storage + SQLite |
| **推送通知** | 系统推送、审批提醒、消息通知 | Capacitor Push Notifications |
| **文件操作** | 本地文件读写、附件上传下载 | Capacitor Filesystem API |

#### 移动端定位服务设计

##### 定位能力分层

```
┌─────────────────────────────────────────────────────────────┐
│                    应用层                                  │
│  - 巡检打卡、位置上报、区域围栏、导航路径                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    服务层                                  │
│  - 定位服务、地图服务、路径规划、地理编码                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Capacitor层                             │
│  - Geolocation API、位置监听、权限管理                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    原生层                                  │
│  - CoreLocation (iOS) / FusedLocationProvider (Android)   │
└─────────────────────────────────────────────────────────────┘
```

##### 定位应用场景

| 场景 | 功能说明 | 定位精度要求 |
|------|----------|-------------|
| 巡检打卡 | 员工在厂区内指定位置打卡 | 高精度（≤10米） |
| 设备定位 | 查看设备在厂区的空间位置 | 中精度（≤50米） |
| 区域围栏 | 危险区域进入提醒、电子围栏 | 中精度（≤50米） |
| 导航指引 | 厂区内路径导航、位置引导 | 高精度（≤10米） |
| 现场取证 | 拍照/录音/录像时自动记录位置信息 | 中精度（≤50米） |

##### 基于定位的多媒体功能设计

#### 1. 拍照取证（带位置信息）

**业务场景**：现场安全巡检、设备故障记录、隐患拍照

**数据结构**：
```typescript
interface PhotoEvidence {
  id: string;
  filename: string;
  file_path: string;
  thumbnail_path: string;
  location: {
    latitude: number;      // 纬度
    longitude: number;     // 经度
    accuracy: number;      // 精度（米）
    address: string;       // 地址描述
  };
  timestamp: string;       // 拍摄时间
  description: string;     // 备注说明
  category: 'safety' | 'equipment' | 'hazard' | 'other';
  uploaded: boolean;       // 是否已上传
}
```

**功能流程**：
1. 用户点击拍照按钮
2. 自动获取当前位置
3. 调用相机拍摄
4. 图片元数据附加位置信息
5. 本地存储并标记上传状态

---

#### 2. 录音记录（带位置信息）

**业务场景**：现场汇报、安全检查语音记录、会议纪要

**数据结构**：
```typescript
interface AudioRecording {
  id: string;
  filename: string;
  file_path: string;
  duration: number;        // 时长（秒）
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    address: string;
  };
  start_time: string;      // 开始时间
  end_time: string;        // 结束时间
  description: string;
  tags: string[];
  uploaded: boolean;
}
```

**功能流程**：
1. 用户开始录音
2. 记录开始位置
3. 录音过程中可标记关键点（带位置）
4. 停止录音，保存文件和位置信息

---

#### 3. 录像取证（带位置信息）

**业务场景**：设备运行状态记录、事故现场取证、施工过程记录

**数据结构**：
```typescript
interface VideoRecording {
  id: string;
  filename: string;
  file_path: string;
  thumbnail_path: string;
  duration: number;        // 时长（秒）
  resolution: string;      // 分辨率
  frame_rate: number;      // 帧率
  location_track: Array<{
    timestamp: string;
    latitude: number;
    longitude: number;
    accuracy: number;
  }>;                      // 录像期间的位置轨迹
  start_location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  description: string;
  uploaded: boolean;
}
```

**功能流程**：
1. 用户开始录像
2. 持续记录位置轨迹（每秒采样）
3. 停止录像，生成缩略图
4. 保存视频文件和完整位置轨迹

---

#### 4. 多媒体与位置关联架构

```
┌─────────────────────────────────────────────────────────────┐
│                    应用层                                  │
│  - 巡检取证、安全检查、设备记录                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    多媒体服务层                            │
│  - CameraService、AudioService、LocationService            │
│  - 自动关联位置信息到媒体文件                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Capacitor层                             │
│  - Camera API、Audio Recorder API、Geolocation API         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    原生层                                  │
│  - Camera、AVFoundation、CoreLocation                      │
└─────────────────────────────────────────────────────────────┘
```

#### 移动端项目结构

```
platform/topems-mobile/frontend/
├── src/                              # Web 共享代码
│   ├── components/                  # UI 组件（响应式）
│   │   ├── CameraButton.tsx         # 拍照按钮组件
│   │   ├── RecorderButton.tsx       # 录音按钮组件
│   │   └── VideoButton.tsx          # 录像按钮组件
│   ├── pages/                       # 移动端页面
│   │   ├── PatrolPage.tsx          # 巡检页面
│   │   ├── CheckInPage.tsx         # 打卡页面
│   │   ├── MapPage.tsx             # 地图页面
│   │   ├── ScanPage.tsx            # 扫码页面
│   │   └── EvidencePage.tsx        # 取证页面（拍照/录音/录像）
│   ├── hooks/                       # 自定义 Hooks
│   │   ├── useLocation.ts          # 定位 Hook
│   │   ├── useCamera.ts            # 相机 Hook
│   │   ├── useAudioRecorder.ts     # 录音 Hook
│   │   └── useVideoRecorder.ts     # 录像 Hook
│   ├── services/                    # 服务层
│   │   ├── LocationService.ts      # 定位服务
│   │   ├── CameraService.ts        # 相机服务
│   │   ├── AudioService.ts         # 音频服务
│   │   └── MediaService.ts         # 多媒体服务（位置关联）
│   └── lib/                         # 工具库
├── ios/                             # iOS 原生项目
│   ├── App/
│   └── Podfile
├── android/                         # Android 原生项目
│   ├── app/
│   └── build.gradle
├── capacitor.config.ts              # Capacitor 配置
├── index.html
├── package.json
└── vite.config.ts
```

#### 三端代码复用策略

| 代码模块 | Web | Desktop | Mobile | 说明 |
|----------|-----|---------|--------|------|
| 组件库 | ✅ | ✅ | ✅ | 基础UI组件完全复用 |
| 业务逻辑 | ✅ | ✅ | ✅ | 核心业务逻辑复用 |
| 状态管理 | ✅ | ✅ | ✅ | Zustand 全局状态 |
| API 调用 | ✅ | ✅ | ✅ | 统一 API 客户端 |
| 原生能力 | ❌ | Tauri | Capacitor | 平台特定实现 |
| 样式适配 | ✅ | ✅ | ✅ | Tailwind 响应式 |

#### Web 前端目录结构

```
frontend/src/
├── components/                          # 组件层
│   ├── ui/                             # 基础UI组件（一级）
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Dialog.tsx
│   │   ├── DataTable.tsx
│   │   └── index.ts
│   ├── layout/                         # 布局组件（一级）
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── PortalSidebar.tsx
│   └── business/                       # 业务组件（一级）
│       ├── StatWidget.tsx
│       └── WorkflowPanel.tsx
├── pages/                             # 页面层（一级）
│   ├── Login.tsx                       # 登录页
│   ├── Dashboard.tsx                   # 工作台首页
│   ├── Profile.tsx                     # 个人中心
│   ├── workbench/                      # 工作台子页面（二级）
│   │   ├── MyTasks.tsx
│   │   └── ApprovalNotifications.tsx
│   ├── projects/                       # 项目管理子页面（二级）
│   │   ├── engineering/                # 工程项目（三级）
│   │   │   ├── ProjectList.tsx
│   │   │   └── ProgressManagement.tsx
│   │   └── research/                   # 科研项目（三级）
│   │       └── ProjectList.tsx
│   ├── knowledge/                      # 知识中台子页面（二级）
│   │   ├── Documents.tsx
│   │   ├── KnowledgeBase.tsx
│   │   └── AIChat.tsx
│   ├── business/                       # 业务中心子页面（二级）
│   │   ├── hr/
│   │   ├── finance/
│   │   └── ...
│   ├── system/                         # 系统管理子页面（二级）
│   │   ├── PermissionManagement.tsx
│   │   ├── WorkflowManagement.tsx
│   │   └── DictionaryManagement.tsx
│   └── portal/                         # 统一门户子页面（二级）
│       ├── Portal.tsx
│       └── ProductsPage.tsx
├── business/                           # 业务模块（一级）
│   ├── center/                         # 业务中心（二级）
│   │   ├── BusinessCenter.tsx
│   │   └── Dashboard.tsx
│   └── modules/                        # 业务子模块（二级）
│       ├── doc/
│       ├── ai/
│       ├── rs/
│       ├── lims/
│       └── ...
├── hooks/                              # 自定义Hooks（一级）
│   ├── useApi.ts
│   ├── useAuth.ts
│   ├── usePermission.ts
│   └── useWorkflow.ts
├── store/                              # 状态管理（一级）
│   ├── useAuthStore.ts
│   ├── useSidebarStore.ts
│   └── useViewStore.ts
├── lib/                                # 工具库（一级）
│   ├── api.ts
│   ├── utils.ts
│   └── errors.ts
├── config/                             # 配置文件（一级）
│   ├── menuConfig.tsx
│   └── api.ts
├── types/                              # 类型定义（一级）
│   ├── api.ts
│   ├── modules.ts
│   └── permissions.ts
└── main.tsx                            # 入口文件
```

### 3.3 后端技术架构

#### 服务端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| topems-doc | 8001 | 统一文件管理 |
| topems-iam | 8002 | 身份认证与权限管理 |
| topems-ai | 8003 | AI知识库与RAG服务 |
| topems-flow | 8004 | OA流程审批引擎 |
| topems-rs | 8005 | 科研研发管理系统 |
| topems-lims | 8006 | 实验室信息管理系统 |
| topems-qms | 8007 | 质量合规管理系统 |
| topems-ehs | 8008 | 安全环保系统 |
| topems-erp | 8009 | 新材料专用ERP |
| topems-srm | 8010 | 供应商管理系统 |
| topems-scm | 8011 | 供应链管理系统 |
| topems-gis | 8012 | 厂区空间数字化系统 |
| topems-bi | 8013 | 数据可视化服务 |
| topems-mobile | 8014 | 移动端API服务 |
| topems-im | 8015 | 即时通讯服务 |
| topems-pdm | 8016 | 产品数据管理系统 |
| topems-portal | 8017 | 统一门户服务 |
| topems-integration | 8018 | 系统集成服务 |
| topems-wms | 8019 | 仓库管理系统 |
| topems-hrm | 8020 | 人力资源管理系统 |
| topems-crm | 8021 | 客户关系管理系统 |
| topems-mes | 8022 | 制造执行系统 |
| 前端门户 | 3000 | 统一门户入口 |

#### 统一API响应格式

```json
{
  "code": 200,
  "success": true,
  "data": {},
  "message": "Success",
  "timestamp": "2026-05-21T00:00:00Z"
}
```

### 3.4 数据库架构设计

#### 数据库分层策略

| 层级 | 数据库 | 用途 |
|------|--------|------|
| OLTP业务库 | PostgreSQL | 各业务系统主数据库 |
| 向量库 | pgvector/Chroma | 文档向量存储、语义检索 |
| 缓存库 | Redis | 会话、热点数据、消息队列 |
| 数仓/ODS | PostgreSQL | BI分析数据 |
| 文件存储 | 对象存储/本地 | 文档、附件存储 |

#### 数据库Schema划分

每个系统独立数据库Schema：

```sql
-- 身份权限中台
CREATE SCHEMA iam;

-- 工作流引擎
CREATE SCHEMA flow;

-- 文件管理
CREATE SCHEMA doc;

-- AI知识库
CREATE SCHEMA ai;

-- 科研研发
CREATE SCHEMA rs;

-- 实验室管理
CREATE SCHEMA lims;

-- 质量合规
CREATE SCHEMA qms;

-- 安全环保
CREATE SCHEMA ehs;

-- 企业资源计划
CREATE SCHEMA erp;

-- 供应商管理
CREATE SCHEMA srm;

-- 空间数字化
CREATE SCHEMA gis;

-- 数据可视化
CREATE SCHEMA bi;

-- 即时通讯
CREATE SCHEMA im;

-- 移动端
CREATE SCHEMA mobile;
```

---

## 四、统一知识中台设计（TOPEMS-AI 2.0）

### 4.1 核心定位

**TOPEMS-Knowledge** = 知识库 + 数据连接器 + AI引擎

- **统一知识存储**：所有知识来源统一存储和索引
- **模块化架构**：各业务模块独立演进，通过标准接口接入
- **版本化迭代**：知识中台可独立升级，不影响业务模块
- **数据契约**：通过标准接口协议解耦

### 4.2 知识中台架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                          TOPEMS-Knowledge                             │
│                        智能知识中台核心层                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌───────────────┐ │
│  │   统一文档管理模块  │  │    AI 问答引擎      │  │ 知识索引引擎  │ │
│  │  - 文档上传下载    │  │  - 语义理解        │  │ - 向量索引    │ │
│  │  - 分类管理        │  │  - 上下文 RAG      │  │ - 全文检索    │ │
│  │  - 版本控制        │  │  - 智能推荐        │  │ - 标签管理    │ │
│  │  - 权限控制        │  │  - 多轮对话        │  │ - 摘要生成    │ │
│  └─────────────────────┘  └─────────────────────┘  └───────────────┘ │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        数据连接器层                                   │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ DOC连接器 │ │ RS连接器 │ │LIMS连接器│ │FLOW连接器│ │...更多...│ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           存储层                                       │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌───────────────┐ │
│  │  PostgreSQL (业务)  │  │ Chroma (向量存储)  │  │ 文件存储 (DOC)│ │
│  └─────────────────────┘  └─────────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 数据连接器设计

#### 标准数据契约

所有接入知识中台的系统需要实现以下标准接口：

```typescript
// 知识条目统一格式
interface KnowledgeEntry {
  id: string;
  source: 'DOC' | 'RS' | 'LIMS' | 'FLOW' | 'QMS' | 'EHS' | 'ERP' | 'SRM' | 'OTHER';
  source_id: string;
  title: string;
  content: string;
  content_type: 'text' | 'markdown' | 'html' | 'pdf' | 'json';
  metadata: Record<string, any>;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_indexed_at: string;
}

// 连接器接口
interface KnowledgeConnector {
  // 获取知识条目列表
  list_entries(options: {
    page: number;
    page_size: number;
    updated_since?: string;
  }): Promise<{
    entries: KnowledgeEntry[];
    total: number;
    has_more: boolean;
  }>;

  // 获取单个知识条目详情
  get_entry(id: string): Promise<KnowledgeEntry | null>;

  // 搜索知识条目
  search_entries(query: string, options?: {
    limit?: number;
    filters?: Record<string, any>;
  }): Promise<KnowledgeEntry[]>;

  // 获取元数据
  get_metadata(): Promise<{
    source: string;
    version: string;
    capabilities: string[];
  }>;
}
```

#### 核心数据流

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             完整数据流转                                 │
└─────────────────────────────────────────────────────────────────────────┘

  用户查询
     │
     ▼
  TOPEMS-Knowledge API
     │
     ├─ 查询语义理解
     │
     ├─ 向量检索 → Chroma/PostgreSQL
     │
     ├─ 多源融合 → DOC + RS + LIMS + ...
     │
     ├─ 上下文构建 → 相关文档 + 对话历史
     │
     ├─ AI 问答 → Ollama / OpenAI
     │
     └─ 结果返回 → 统一格式

  数据同步流程：

  业务系统数据更新
     │
     ▼
  触发 WebHook / 定时拉取
     │
     ▼
  连接器解析转换
     │
     ▼
  文本向量化 → Embedding
     │
     ▼
  向量索引更新 → Chroma/pgvector
     │
     ▼
  知识条目存储 → PostgreSQL
```

### 4.4 AI 功能模块

| 模块 | 功能 | 技术实现 |
|------|------|---------|
| 智能问答 | 基于知识的多轮对话，支持上下文理解 | Ollama + RAG |
| 文档解析 | 支持PDF、Word、Markdown、Excel等多格式文档解析 | LangChain + 自研解析器 |
| 智能标签 | 自动为文档生成标签，便于分类检索 | NLP + 词嵌入 |
| 摘要生成 | 自动为长文档生成摘要 | 大语言模型 |
| 问答推荐 | 基于用户历史推荐相关问题 | 协同过滤 + 语义相似 |
| 知识库管理 | 知识库创建、文档导入、权限管理 | 统一门户 |

---

## 五、安全架构设计

### 5.1 身份认证架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                           TOPEMS-IAM                                 │
│                       统一身份与权限中台                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │   认证核心      │  │   权限管理      │  │   SSO 单点登录 │     │
│  │  - JWT Token   │  │  - RBAC 模型   │  │  - SAML 2.0   │     │
│  │  - 刷新令牌    │  │  - 行级权限     │  │  - OAuth 2.0   │     │
│  │  - 多租户隔离  │  │  - 数据权限     │  │  - 企业微信集成│     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 权限模型

```typescript
// 权限层次结构
interface PermissionModel {
  // 用户层
  user: {
    id: string;
    username: string;
    roles: string[];
    permissions: string[];
  };

  // 角色层
  roles: {
    [roleId: string]: {
      id: string;
      name: string;
      description: string;
      permissions: string[];
      is_system: boolean;
    };
  };

  // 权限层
  permissions: {
    [permissionId: string]: {
      id: string;
      code: string;
      name: string;
      resource: string;
      action: 'read' | 'write' | 'delete' | 'admin';
      description: string;
    };
  };

  // 数据权限层
  data_permissions: {
    [userId: string]: {
      row_filters: {
        table: string;
        condition: string;
        params: Record<string, any>;
      }[];
      field_filters: {
        table: string;
        fields: string[];
        mode: 'include' | 'exclude';
      }[];
    };
  };
}
```

### 5.3 安全审计

| 审计内容 | 存储位置 | 保存周期 | 用途 |
|---------|---------|---------|------|
| 登录登出 | audit_login | 2年 | 安全监控、异常检测 |
| 权限变更 | audit_permission | 5年 | 合规审计、责任追溯 |
| 数据访问 | audit_data_access | 2年 | 数据泄露追踪 |
| 审批记录 | audit_workflow | 永久 | 业务审计、历史追溯 |
| API调用 | audit_api | 6个月 | 性能监控、问题定位 |

---

## 六、部署架构设计

### 6.1 开发环境（Docker Compose）

```
topems/
├── docker-compose.yml
├── .env.example
├── infrastructure/
│   └── docker/
│       ├── postgres/
│       │   ├── Dockerfile
│       │   └── init.sql
│       ├── redis/
│       │   └── Dockerfile
│       └── ollama/
│           └── Dockerfile
├── platform/
│   ├── topems-iam/
│   ├── topems-flow/
│   ├── topems-doc/
│   └── ...
├── services/
│   ├── topems-ai/
│   ├── topems-rs/
│   └── ...
└── frontend/
    └── unified-portal/
```

### 6.2 生产环境（Kubernetes）

```
Kubernetes Cluster
├── Namespace: topems-system
│   ├── Deployment: topems-iam
│   ├── Deployment: topems-flow
│   ├── Deployment: topems-doc
│   ├── Deployment: topems-ai
│   ├── Deployment: topems-gateway
│   └── Service: 各服务
├── Namespace: topems-business
│   ├── Deployment: topems-rs
│   ├── Deployment: topems-lims
│   ├── Deployment: topems-qms
│   ├── Deployment: topems-ehs
│   ├── Deployment: topems-erp
│   ├── Deployment: topems-srm
│   ├── Deployment: topems-gis
│   └── Deployment: topems-bi
├── Namespace: topems-data
│   ├── StatefulSet: postgresql
│   ├── StatefulSet: redis
│   └── StatefulSet: chroma
└── Namespace: topems-monitor
    ├── Deployment: prometheus
    ├── Deployment: grafana
    └── Deployment: loki
```

---

## 七、分阶段实施规划

### 阶段一：基础底座搭建（2-3个月，4个系统上线）

**目标**：快速搭建平台骨架，可对外演示交付

#### 上线系统

| 系统 | 优先级 | 状态 |
|------|--------|------|
| TOPEMS-IAM | ⭐⭐⭐ | 上线 |
| TOPEMS-FLOW | ⭐⭐⭐ | 上线 |
| TOPEMS-DOC | ⭐⭐⭐ | 上线 |
| TOPEMS-AI | ⭐⭐⭐ | 上线 |
| 统一门户 | ⭐⭐⭐ | 上线 |

#### 核心任务

- [x] 搭建Docker Compose开发环境
- [x] 实现统一身份认证（JWT + SSO）
- [x] 完成基础工作流引擎
- [x] 实现文件管理系统
- [x] 集成Ollama + RAG知识库
- [x] 完成统一门户前端
- [x] 实现健康检查和监控基础

#### 交付成果

- 可运行的4个核心系统
- 统一门户演示版
- 开发环境部署文档
- API文档（Swagger/OpenAPI）

---

### 阶段二：核心研发+实验室王牌产品（3-4个月，2个核心商业化产品）

**目标**：打造TOPEMS差异化核心，优先对外独立售卖

#### 上线系统

| 系统 | 优先级 | 状态 |
|------|--------|------|
| TOPEMS-RS | ⭐⭐⭐ | 开发中 |
| TOPEMS-LIMS | ⭐⭐⭐ | 规划中 |

#### 核心任务

- [ ] 科研研发管理（立项、试验、配方、成果）
- [ ] 实验室管理（样品、仪器、检验流程）
- [ ] 数据连接器实现（RS/LIMS接入知识中台）
- [ ] 权限体系完善（细粒度权限）
- [ ] 测试覆盖（单元测试+集成测试）

#### 交付成果

- 研发管理系统（TOPEMS-RS）
- 实验室管理系统（TOPEMS-LIMS）
- 产品文档
- 部署手册

---

### 阶段三：质量安全+供应链闭环（3-4个月，4个刚需产品落地）

**目标**：研发-生产-质量-安全-供应链完整业务闭环

#### 上线系统

| 系统 | 优先级 | 状态 |
|------|--------|------|
| TOPEMS-QMS | ⭐⭐ | 规划中 |
| TOPEMS-EHS | ⭐⭐ | 规划中 |
| TOPEMS-ERP | ⭐⭐ | 规划中 |
| TOPEMS-SRM | ⭐ | 规划中 |

#### 核心任务

- [ ] 质量合规管理（GMP、ISO、审计追踪）
- [ ] 安全环保管理（危化品、安全生产、三废）
- [ ] 新材料专用ERP（采购、库存、生产）
- [ ] 供应商管理系统（准入、评审、协同）
- [ ] 系统间数据流打通
- [ ] 数据权限（行级、字段级）

---

### 阶段四：空间数字化+数据能力升级（2-3个月，4个系统补齐）

**目标**：全模块聚合，完整TOPEMS一体化平台成型

#### 上线系统

| 系统 | 优先级 | 状态 |
|------|--------|------|
| TOPEMS-GIS | ⭐ | 规划中 |
| TOPEMS-BI | ⭐⭐ | 规划中 |
| TOPEMS-MOBILE | ⭐ | 规划中 |
| TOPEMS-IM | ⭐ | 规划中 |

#### 核心任务

- [ ] 厂区空间数字化（地图、设备、管线）
- [ ] 数据可视化（大屏、报表、驾驶舱）
- [ ] 移动端工作台（巡检、审批、扫码）
- [ ] 即时通讯（内部聊天、文件、通知）
- [ ] 监控告警（Prometheus + Grafana）
- [ ] 日志收集（ELK/Loki）

---

## 八、团队分工建议

### 8.1 团队组织结构

```
TOPEMS 开发团队
├── 基础底座组
│   ├── TOPEMS-IAM
│   ├── TOPEMS-FLOW
│   ├── TOPEMS-DOC
│   └── TOPEMS-AI
├── 研发实验室组（核心盈利组）
│   ├── TOPEMS-RS
│   └── TOPEMS-LIMS
├── 质量安全组
│   ├── TOPEMS-QMS
│   └── TOPEMS-EHS
├── 供应链生产组
│   ├── TOPEMS-ERP
│   └── TOPEMS-SRM
├── 空间数字化组
│   └── TOPEMS-GIS
├── 数据移动组
│   ├── TOPEMS-BI
│   ├── TOPEMS-MOBILE
│   └── TOPEMS-IM
├── 前端组
│   └── 统一门户
└── DevOps组
    ├── CI/CD
    ├── 监控运维
    └── 基础设施
```

### 8.2 协作机制

**独立迭代**：各组独立开发、独立测试、独立版本  
**数据打通**：由基础底座组做数据连接器和统一API  
**每周同步**：各模块每周同步进度，协调依赖关系

---

## 九、监控运维体系

### 9.1 监控体系

| 监控层级 | 工具 | 用途 |
|---------|------|------|
| 基础设施 | Prometheus + Node Exporter | 服务器、容器监控 |
| 应用性能 | Prometheus + Axum Exporter | API响应时间、错误率 |
| 日志收集 | Loki + Promtail | 日志收集、分析、检索 |
| 链路追踪 | Jaeger | 分布式追踪、性能分析 |
| 可视化 | Grafana | 数据大屏、告警面板 |
| 告警管理 | AlertManager | 异常告警、通知推送 |

### 9.2 告警规则

| 告警级别 | 触发条件 | 通知方式 |
|---------|---------|---------|
| 严重 | 服务宕机、数据库异常 | 电话、短信、企业微信 |
| 警告 | API错误率>5%、响应时间>3s | 企业微信群、邮件 |
| 信息 | 服务重启、版本发布 | 邮件、开发群 |

---

## 十、整体价值总结

### 对内价值

- 一套TOPEMS覆盖研发、实验、生产、供应链、质量、安全、空间、知识、文档全业务
- 适配新材料企业全生命周期管理
- 统一身份、统一文件、统一消息，避免数据孤岛
- 模块化架构，可按需扩展

### 对外价值

- 10个商业化产品矩阵，覆盖化工新材料垂直赛道
- 从实验室到厂区全场景数字化
- 差异化强、溢价高
- 可拆分、可组合、可独立交付

### 技术价值

- 松耦合架构，可拆分、可扩展、可独立迭代
- 避免单体大系统臃肿难维护
- 基于Rust的高性能后端
- 基于React的现代化前端
- 完整的DevOps和监控体系

### 商业价值

- 先做底座+研发实验室系统快速变现
- 逐步补齐合规、供应链、空间数字化模块
- 稳步做大平台生态
- 形成行业壁垒，建立竞争优势

---

**文档完成日期**: 2026-05-21  
**下一版本**: v2.1.0 (预计2026-06-30)
