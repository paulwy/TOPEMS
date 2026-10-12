# Mobile（Expo）EAS 原生构建 Runbook

> 移动端 `apps/mobile` 的 EAS（Expo Application Services）云构建操作指引。
> 适用于：Expo SDK 57 迁移验证、内部预览包、正式上架构建。
>
> 关联：[部署总览](./README.md) · [容器部署](./container-strategy.md) · [Windows 部署](./windows-deployment.md)

## 1. 现状速览

| 项 | 值 |
|---|---|
| 技术栈 | Expo SDK 57 · React Native 0.86.3 · React 19.2.3 · TypeScript 6.0.3 |
| 目录 | `apps/mobile/` |
| 已配置 | `eas.json`（3 profiles）、`.easignore`（排除敏感信息）、`app.json`（bundleIdentifier/package/plugins） |
| 原生验证 | **尚未实跑**（需 EAS 云构建或本地设备） |

## 2. EAS 配置说明

### 2.1 `eas.json` 构建 profile

| Profile | 用途 | Android 产物 | 分发 | 适用场景 |
|---|---|---|---|---|
| `development` | 开发调试 | APK | internal | 本地联调（Expo Go / dev client） |
| `preview` | 内部预览 | **APK** | internal | **迁移验证首选**（装机验证） |
| `production` | 正式上架 | app-bundle | store | Play/App Store 提交 |

> 迁移验证阶段推荐 `preview`：产物是可直接装机的 APK，能覆盖扫码、通知、相机权限等真实运行路径，且占用最低成本档位。

### 2.2 `.easignore`（敏感信息保护）

已排除不入 EAS 云端：
- `.env` / `.env.*`（含 `EXPO_PUBLIC_API_URL` 等本地配置）
- 签名密钥（`*.p12` / `*.p8` / `*.jks` / `*.keystore` / `*.mobileprovision`）
- `google-service-account.json`、`auth-state.json`
- `node_modules` / 构建产物 / `.git` / IDE 文件

> ⚠️ 若新增敏感文件（如 Google 服务 JSON、Apple 密钥），**必须先加入 `.easignore`** 再上传构建，防止密钥泄露到云端。

## 3. 首次构建操作指引（需本人账号）

> EAS 构建绑定个人 Expo 账号，**登录、项目关联、发起构建必须由开发者本人操作**，以下命令在 `apps/mobile/` 下执行。

### 3.1 登录 Expo 账号

```bash
cd apps/mobile
npx eas-cli login
```

- 首次需注册 Expo 账号（email/username + 密码）
- 也可用 `eas login --help` 查看浏览器授权等其它登录方式

### 3.2 关联 / 创建 EAS 项目

```bash
npx eas-cli init
```

- 会在 `app.json` 写入 `extra.eas.projectId`
- 若已有 EAS 项目，选择关联即可

### 3.3 发起构建（迁移验证）

```bash
# 首选：Android preview（内部 APK，装机验证）
npx eas-cli build --platform android --profile preview

# iOS 模拟器/调试（若需）
npx eas-cli build --platform ios --profile development
```

- 首次构建需生成/上传签名配置（Android 会自动生成 debug keystore，iOS 需 Apple 证书）
- Free 档构建约 15~45 分钟（低优先级队列）
- 完成后终端会返回安装链接 / QR，真机扫码或下载 APK 安装

## 4. SDK 57 迁移验证清单

> 以下项为 Expo SDK 50→57（RN 0.73→0.86，React 18→19）迁移后**必须真机覆盖**的回归点。

### 4.1 扫码（核心改动）

- [ ] 相机权限弹窗正常（首次进入）
- [ ] 拒绝权限后能跳转系统设置、返回重试
- [ ] 二维码 / 条形码识别（`expo-camera` `CameraView`）
- [ ] 扫描结果回显、自动识别（inventory/asset/order）
- [ ] 手电筒开关（`enableTorch`）
- [ ] 连续扫描模式

### 4.2 推送通知

- [ ] 通知权限申请
- [ ] 前台/后台通知横幅显示（`shouldShowBanner`/`shouldShowList` 新字段）
- [ ] 通知点击跳转

### 4.3 全局 / React 19

- [ ] 首页 / 列表 / 详情页渲染正常（React 19 并发特性）
- [ ] `react-native-paper` 组件样式正常
- [ ] `react-native-svg`（lucide 图标）正常显示
- [ ] 状态栏、安全区适配

### 4.4 离线 / 本地存储

- [ ] 离线操作入队（AsyncStorage 2.x）
- [ ] 网络恢复后同步

### 4.5 构建产物

- [ ] Android APK 安装运行
- [ ] iOS 模拟器/真机（如构建）

## 5. 成本参考

| 套餐 | 月费 | 包含构建 | 优先级 | 建议 |
|---|---|---|---|---|
| **Free** | **$0** | 15 Android + 15 iOS | 低（45min 超时） | ✅ 迁移验证足够 |
| Starter | $19 | $45 额度 | 高（2h 超时） | 频繁构建 / 上架加速 |
| Production | $199 | $225 额度 | 高 | 团队规模发布 |

> 当前迁移验证阶段**推荐 Free 档**，零成本即可完成全部验证项。

## 6. 排障速查

| 现象 | 处理 |
|---|---|
| `eas login` 提示无账号 | 先注册 Expo 账号 |
| 构建提示缺 `projectId` | 先执行 `eas init` 关联项目 |
| iOS 构建失败（证书） | 需 Apple Developer 账号 + 证书，参照 Expo 官方文档 |
| 构建中 `Cannot resolve expo-splash-screen` | 确认已 `pnpm add expo-splash-screen@~57.0.10`（已配置） |
| 手机无法安装 | 确认 `preview` profile（internal 分发）；Android 需允许"未知来源" |
