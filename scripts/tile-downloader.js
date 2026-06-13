#!/usr/bin/env node

/**
 * 地图瓦片预下载工具
 *
 * 功能：
 * - 按区域下载OSM/高德地图瓦片
 * - 支持多级缩放级别
 * - 断点续传
 * - 进度显示
 *
 * 使用方法：
 *   node scripts/tile-downloader.js --bounds 31.0,121.0,32.0,122.0 --zoom 10-16 --source osm
 *   node scripts/tile-downloader.js --city 上海 --zoom 10-16 --source amap
 *   node scripts/tile-downloader.js --province 浙江 --zoom 8-14 --source osm
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { promisify } = require('util');

// Node.js 10+ 支持 recursive 选项，无需 mkdirp
const mkdirp = async (dir) => {
  await fs.promises.mkdir(dir, { recursive: true });
};

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// 配置
const CONFIG = {
  outputDir: './offline_tiles',
  concurrency: 10,          // 并发下载数
  retryCount: 3,            // 重试次数
  retryDelay: 1000,         // 重试延迟(ms)
  requestTimeout: 30000,    // 请求超时(ms)
};

// 中国主要城市/省份边界 (大致范围)
const REGION_BOUNDS = {
  // 省份
  '北京': [[39.4, 115.4], [41.1, 117.5]],
  '天津': [[38.5, 116.7], [40.3, 118.3]],
  '河北': [[36.0, 113.5], [42.6, 119.8]],
  '山西': [[35.1, 110.1], [40.1, 115.1]],
  '内蒙古': [[37.4, 97.0], [51.1, 126.1]],
  '辽宁': [[38.7, 118.8], [43.5, 125.5]],
  '吉林': [[40.9, 121.6], [46.3, 131.2]],
  '黑龙江': [[43.4, 121.2], [53.6, 135.0]],
  '上海': [[30.7, 120.8], [31.8, 122.0]],
  '江苏': [[30.8, 116.4], [35.1, 122.1]],
  '浙江': [[27.0, 118.0], [31.2, 123.0]],
  '安徽': [[29.4, 114.9], [34.7, 119.5]],
  '福建': [[23.5, 116.5], [28.4, 120.4]],
  '江西': [[24.5, 113.6], [30.1, 118.5]],
  '山东': [[34.4, 114.8], [38.5, 122.9]],
  '河南': [[31.4, 110.4], [36.4, 116.6]],
  '湖北': [[29.1, 108.4], [33.3, 116.1]],
  '湖南': [[24.6, 108.8], [30.1, 114.2]],
  '广东': [[20.2, 109.7], [25.5, 117.3]],
  '广西': [[20.8, 104.6], [26.4, 112.1]],
  '海南': [[18.1, 108.6], [20.2, 111.1]],
  '重庆': [[28.2, 105.3], [32.2, 110.2]],
  '四川': [[26.0, 97.4], [34.4, 108.5]],
  '贵州': [[24.6, 103.6], [29.3, 109.6]],
  '云南': [[21.1, 97.5], [28.3, 106.2]],
  '西藏': [[26.7, 78.4], [36.5, 99.1]],
  '陕西': [[31.7, 105.5], [39.6, 111.1]],
  '甘肃': [[32.2, 92.2], [42.8, 108.7]],
  '青海': [[31.4, 89.4], [39.1, 102.0]],
  '宁夏': [[35.2, 104.2], [39.5, 107.0]],
  '新疆': [[34.3, 73.4], [49.2, 96.4]],
  '台湾': [[21.9, 119.3], [25.3, 122.0]],
  '香港': [[22.1, 113.8], [22.6, 114.6]],
  '澳门': [[22.1, 113.5], [22.3, 113.6]],

  // 全国
  '全国': [[18.0, 73.0], [54.0, 135.0]],

  // 城市（示例）
  '北京': [[39.4, 115.4], [41.1, 117.5]],
  '上海': [[30.7, 120.8], [31.8, 122.0]],
  '广州': [[22.4, 112.9], [23.9, 114.3]],
  '深圳': [[22.4, 113.7], [22.9, 114.6]],
  '杭州': [[29.9, 118.8], [30.6, 120.6]],
  '成都': [[30.1, 103.3], [30.9, 104.7]],
  '武汉': [[29.9, 113.7], [30.9, 115.1]],
  '西安': [[33.9, 107.6], [34.6, 109.2]],
};

// 瓦片URL生成器
const TILE_URLS = {
  osm: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  // 高德普通地图
  amap: (z, x, y) => {
    const s = ['1', '2', '3', '4'][Math.floor(Math.random() * 4)];
    return `https://webrd0${s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=${x}&y=${y}&z=${z}`;
  },
  // 高德卫星图
  amap_satellite: (z, x, y) => {
    const s = ['1', '2', '3', '4'][Math.floor(Math.random() * 4)];
    return `https://webst0${s}.is.autonavi.com/appmaptile?style=6&x=${x}&y=${y}&z=${z}`;
  },
};

// 进度跟踪器
class ProgressTracker {
  constructor(total, name = '下载') {
    this.total = total;
    this.current = 0;
    this.name = name;
    this.startTime = Date.now();
    this.failedTiles = [];
  }

  increment(success = true) {
    this.current++;
    if (!success) {
      this.failedTiles.push(this.current);
    }
    this.print();
  }

  print() {
    const percent = ((this.current / this.total) * 100).toFixed(1);
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const speed = (this.current / (Date.now() - this.startTime) * 1000).toFixed(1);

    process.stdout.write(`\r${this.name}: ${this.current}/${this.total} (${percent}%) 速度: ${speed} tiles/s  耗时: ${elapsed}s   `);

    if (this.current >= this.total) {
      console.log('\n');
    }
  }

  printSummary() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`\n========== 下载完成 ==========`);
    console.log(`总计: ${this.total} 瓦片`);
    console.log(`成功: ${this.total - this.failedTiles.length}`);
    console.log(`失败: ${this.failedTiles.length}`);
    console.log(`耗时: ${elapsed}秒`);
    if (this.failedTiles.length > 0) {
      console.log(`失败瓦片将在下次运行时自动重试`);
    }
  }
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    bounds: null,
    city: null,
    province: null,
    zoom: '10-16',
    source: 'osm',
    output: CONFIG.outputDir,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--bounds' && args[i + 1]) {
      const parts = args[++i].split(',').map(Number);
      if (parts.length === 4) {
        options.bounds = [[parts[0], parts[1]], [parts[2], parts[3]]];
      }
    } else if (arg === '--city' && args[i + 1]) {
      options.city = args[++i];
    } else if (arg === '--province' && args[i + 1]) {
      options.province = args[++i];
    } else if (arg === '--zoom' && args[i + 1]) {
      options.zoom = args[++i];
    } else if (arg === '--source' && args[i + 1]) {
      options.source = args[++i];
    } else if (arg === '--output' && args[i + 1]) {
      options.output = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  // 解析缩放级别范围
  const zoomParts = options.zoom.split('-').map(Number);
  if (zoomParts.length === 2) {
    options.minZoom = Math.min(zoomParts[0], zoomParts[1]);
    options.maxZoom = Math.max(zoomParts[0], zoomParts[1]);
  } else {
    options.minZoom = options.maxZoom = zoomParts[0];
  }

  // 解析区域
  if (options.city && REGION_BOUNDS[options.city]) {
    options.bounds = REGION_BOUNDS[options.city];
  } else if (options.province && REGION_BOUNDS[options.province]) {
    options.bounds = REGION_BOUNDS[options.province];
  }

  return options;
}

// 显示帮助
function showHelp() {
  console.log(`
地图瓦片预下载工具
====================

用法:
  node tile-downloader.js [选项]

选项:
  --bounds <minLat,minLng,maxLat,maxLng>  指定下载边界
  --city <城市名>                          按城市名下载（使用预定义边界）
  --province <省份名>                      按省份名下载（使用预定义边界）
  --zoom <级别>                            缩放级别范围，如 10-16
  --source <osm|amap|amap_satellite>      瓦片源 (默认: osm)
  --output <目录>                          输出目录 (默认: ./offline_tiles)
  --help, -h                               显示帮助

示例:
  # 下载上海市 OSM 瓦片 (缩放级别 10-16)
  node tile-downloader.js --city 上海 --zoom 10-16 --source osm

  # 下载浙江省 高德卫星图 (缩放级别 8-14)
  node tile-downloader.js --province 浙江 --zoom 8-14 --source amap_satellite

  # 下载指定区域 缩放级别 12-18
  node tile-downloader.js --bounds 30.7,120.8,31.8,122.0 --zoom 12-18

支持的城市/省份:
${Object.keys(REGION_BOUNDS).join(', ')}

瓦片源:
  osm              - OpenStreetMap (免费，国际)
  amap             - 高德地图 (国内，速度快)
  amap_satellite   - 高德卫星图
`);
}

// 经纬度转瓦片坐标
function latLngToTile(lat, lng, zoom) {
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  return { x, y };
}

// 获取缩放级别范围内的所有瓦片
function getTilesForBounds(bounds, minZoom, maxZoom) {
  const tiles = [];

  for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
    const minTile = latLngToTile(bounds[1][0], bounds[0][1], zoom); // 左上角
    const maxTile = latLngToTile(bounds[0][0], bounds[1][1], zoom); // 右下角

    for (let x = minTile.x; x <= maxTile.x; x++) {
      for (let y = minTile.y; y <= maxTile.y; y++) {
        tiles.push({ zoom, x, y });
      }
    }
  }

  return tiles;
}

// 下载单个瓦片
async function downloadTile(url, outputPath, options = {}) {
  const { retryCount = CONFIG.retryCount } = options;

  for (let attempt = 0; attempt < retryCount; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await mkdirp(path.dirname(outputPath));
        await writeFile(outputPath, buffer);
        return { success: true };
      }

      if (response.status === 404) {
        return { success: false, reason: 'not_found' };
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (attempt < retryCount - 1) {
        await new Promise(r => setTimeout(r, CONFIG.retryDelay));
      } else {
        return { success: false, reason: error.message };
      }
    }
  }
  return { success: false, reason: 'max_retries' };
}

// 并发下载控制
async function downloadWithConcurrency(tiles, urlGenerator, outputDir, source, options = {}) {
  const { concurrency = CONFIG.concurrency, onProgress } = options;
  const progress = new ProgressTracker(tiles.length, source);

  // 检查已有文件，实现断点续传
  const existingFiles = new Set();
  try {
    const existing = await readdir(outputDir, { recursive: true });
    existing.forEach(f => existingFiles.add(f));
  } catch (e) {
    // 目录不存在，继续
  }

  const results = [];
  let completed = 0;

  // 分批处理
  for (let i = 0; i < tiles.length; i += concurrency) {
    const batch = tiles.slice(i, i + concurrency);
    const batchPromises = batch.map(async (tile) => {
      const url = urlGenerator(tile.zoom, tile.x, tile.y);
      const ext = source === 'osm' ? 'png' : 'png';
      const outputPath = path.join(outputDir, source, String(tile.zoom), String(tile.x), `${tile.y}.${ext}`);

      // 跳过已存在的文件
      const relativePath = path.relative(outputDir, outputPath);
      if (existingFiles.has(relativePath) || existingFiles.has(path.join(source, String(tile.zoom), String(tile.x), `${tile.y}.${ext}`))) {
        progress.increment(true);
        return { success: true, skipped: true };
      }

      const result = await downloadTile(url, outputPath);
      progress.increment(result.success);

      return { ...result, path: outputPath };
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    completed += batch.length;
  }

  progress.printSummary();
  return results;
}

// 主函数
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  if (!options.bounds) {
    console.error('错误: 请指定 --bounds, --city 或 --province');
    console.error('使用 --help 查看帮助');
    process.exit(1);
  }

  const { bounds, minZoom, maxZoom, source, output } = options;

  console.log('========== 地图瓦片下载工具 ==========\n');
  console.log(`下载区域: ${options.city || options.province || '自定义'} [${bounds[0][0]}, ${bounds[0][1]}] - [${bounds[1][0]}, ${bounds[1][1]}]`);
  console.log(`缩放级别: ${minZoom} - ${maxZoom}`);
  console.log(`瓦片源: ${source}`);
  console.log(`输出目录: ${output}`);
  console.log(`并发数: ${CONFIG.concurrency}`);
  console.log('');

  // 计算瓦片数量
  const tiles = getTilesForBounds(bounds, minZoom, maxZoom);
  console.log(`预计瓦片数量: ${tiles.length}`);
  console.log('');

  // 确认下载
  if (tiles.length > 100000) {
    console.log('警告: 瓦片数量较大，可能需要较长时间和存储空间');
    console.log('按 Ctrl+C 取消，或等待 5 秒后继续...');
    await new Promise(r => setTimeout(r, 5000));
  }

  // 生成瓦片URL
  const urlGenerator = TILE_URLS[source];
  if (!urlGenerator) {
    console.error(`错误: 未知的瓦片源 ${source}`);
    process.exit(1);
  }

  // 开始下载
  console.log('开始下载...\n');
  const startTime = Date.now();

  const results = await downloadWithConcurrency(tiles, urlGenerator, output, source, {
    concurrency: CONFIG.concurrency,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const successCount = results.filter(r => r.success).length;
  const skippedCount = results.filter(r => r.skipped).length;
  const failedCount = results.filter(r => !r.success && !r.skipped).length;

  console.log('\n========== 下载统计 ==========');
  console.log(`总耗时: ${elapsed}秒`);
  console.log(`成功: ${successCount}`);
  console.log(`跳过(已存在): ${skippedCount}`);
  console.log(`失败: ${failedCount}`);

  // 保存下载信息
  const infoPath = path.join(output, source, 'download_info.json');
  const info = {
    source,
    bounds,
    minZoom,
    maxZoom,
    downloadedAt: new Date().toISOString(),
    totalTiles: tiles.length,
    successCount,
    skippedCount,
    failedCount,
  };

  try {
    await mkdirp(path.dirname(infoPath));
    await writeFile(infoPath, JSON.stringify(info, null, 2));
    console.log(`\n下载信息已保存到: ${infoPath}`);
  } catch (e) {
    console.error('保存下载信息失败:', e.message);
  }

  // 如果有失败的瓦片，保存失败列表
  if (failedCount > 0) {
    const failedPath = path.join(output, source, 'failed_tiles.json');
    const failedTiles = results.filter(r => !r.success && !r.skipped).map(r => r.path);
    await writeFile(failedPath, JSON.stringify(failedTiles, null, 2));
    console.log(`失败瓦片列表已保存到: ${failedPath}`);
  }
}

// 简单的fetch polyfill for Node.js < 18
if (typeof fetch === 'undefined') {
  global.fetch = async (url, options = {}) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': options.headers?.['User-Agent'] || 'TOPEMS-TileDownloader/1.0',
        },
        timeout: options.timeout || CONFIG.requestTimeout,
      };

      const req = client.request(reqOptions, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // 处理重定向
          fetch(res.headers.location, options).then(resolve).catch(reject);
          return;
        }

        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            buffer: () => Promise.resolve(buffer),
            blob: () => Promise.resolve(buffer),
            text: () => Promise.resolve(buffer.toString()),
            json: () => Promise.resolve(JSON.parse(buffer.toString())),
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  };
}

// 运行
main().catch(console.error);
