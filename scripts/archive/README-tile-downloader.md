# 地图瓦片预下载工具

## 功能

- 按区域下载 OSM / 高德地图瓦片
- 支持多级缩放级别 (如 10-16 级)
- 断点续传 (已下载的瓦片不会重复下载)
- 并发下载 (默认 10 并发)
- 失败重试 (默认 3 次)
- 进度显示

## 使用方法

### 基本语法

```bash
node scripts/tile-downloader.js [选项]
```

### 选项

| 选项 | 说明 | 示例 |
|------|------|------|
| `--bounds <坐标>` | 指定下载边界 [minLat,minLng,maxLat,maxLng] | `--bounds 30.7,120.8,31.8,122.0` |
| `--city <城市>` | 按城市名下载 | `--city 上海` |
| `--province <省份>` | 按省份名下载 | `--province 浙江` |
| `--zoom <级别>` | 缩放级别范围 | `--zoom 10-16` |
| `--source <源>` | 瓦片源: osm/amap/amap_satellite | `--source osm` |
| `--output <目录>` | 输出目录 | `--output ./tiles` |

### 支持的区域

| 省份 | 城市 | 全国 |
|------|------|------|
| 北京、天津、河北 | 上海 | 全国 |
| 山西、内蒙古 | 广州、深圳 | |
| 辽宁、吉林、黑龙江 | 杭州、成都 | |
| 江苏、浙江、安徽 | 武汉、西安 | |
| 福建、江西、山东 | | |
| 河南、湖北、湖南 | | |
| 广东、广西、海南 | | |
| 重庆、四川、贵州 | | |
| 云南、西藏、陕西 | | |
| 甘肃、青海、宁夏 | | |
| 新疆、台湾、香港、澳门 | | |

## 示例

### 1. 下载上海市 OSM 瓦片 (缩放级别 10-16)

```bash
node scripts/tile-downloader.js --city 上海 --zoom 10-16 --source osm
```

### 2. 下载浙江省 高德卫星图 (缩放级别 8-14)

```bash
node scripts/tile-downloader.js --province 浙江 --zoom 8-14 --source amap_satellite
```

### 3. 下载指定区域 (上海市区)

```bash
node scripts/tile-downloader.js --bounds 30.7,120.8,31.8,122.0 --zoom 12-18
```

### 4. 下载全国地图 (需要较大存储空间)

```bash
node scripts/tile-downloader.js --province 全国 --zoom 6-12 --source osm
```

## 输出

下载的瓦片保存在指定目录，结构如下：

```
offline_tiles/
├── osm/
│   ├── 10/
│   │   ├── 512/
│   │   │   ├── 341.png
│   │   │   └── 342.png
│   │   └── 513/
│   │       └── ...
│   ├── 11/
│   │   └── ...
│   └── download_info.json
├── amap/
│   └── ...
└── amap_satellite/
    └── ...
```

`download_info.json` 包含下载信息：

```json
{
  "source": "osm",
  "bounds": [[30.7, 120.8], [31.8, 122.0]],
  "minZoom": 10,
  "maxZoom": 16,
  "downloadedAt": "2024-01-01T00:00:00.000Z",
  "totalTiles": 12345,
  "successCount": 12300,
  "skippedCount": 0,
  "failedCount": 45
}
```

## 存储估算

| 区域 | 缩放级别 | 瓦片数 | 预估大小 |
|------|----------|--------|----------|
| 上海 | 10-16 | ~50,000 | ~500 MB |
| 浙江 | 8-14 | ~200,000 | ~2 GB |
| 全国 | 6-12 | ~5,000,000 | ~50 GB |

## 常见问题

### Q: 下载中断了怎么办？

A: 工具支持断点续传，重新运行相同的命令即可，已下载的瓦片会被跳过。

### Q: 如何清理已下载的瓦片？

A: 直接删除输出目录即可：
```bash
rm -rf ./offline_tiles
```

### Q: 可以同时下载多个区域的瓦片吗？

A: 可以分多次运行命令，或修改脚本支持批量下载。

## 在应用中使用

前端 `OfflineManager.tsx` 会从 IndexedDB 读取瓦片。如果需要预置瓦片，可以：

1. 运行本工具下载瓦片到服务器
2. 将瓦片部署到静态文件服务器
3. 修改前端配置指向瓦片服务器地址

## 技术细节

- Node.js 18+ 内置 fetch，低版本有 polyfill
- 使用 Promise.all 实现并发控制
- 瓦片命名: `{z}/{x}/{y}.png`
- HTTP 头 User-Agent 标识为 TOPEMS-TileDownloader
