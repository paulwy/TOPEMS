/**
 * 瓦片清单生成器
 *
 * 运行: node scripts/tile-manifest.js
 *
 * 功能：扫描 offline_tiles 目录，生成瓦片清单 JSON
 */

const fs = require("fs");
const path = require("path");

const OFFLINE_TILES_DIR = path.join(__dirname, "..", "offline_tiles");
const OUTPUT_FILE = path.join(OFFLINE_TILES_DIR, "manifest.json");

// 省市自治区边界（大致范围）
const PROVINCE_BOUNDS = {
  北京: [[39.4, 115.4], [41.1, 117.5]],
  天津: [[38.5, 116.7], [40.3, 118.3]],
  河北: [[36, 113.5], [42.6, 119.8]],
  山西: [[35, 110], [41, 115]],
  内蒙古: [[37, 97], [55, 127]],
  辽宁: [[38, 118], [44, 126]],
  吉林: [[40, 120], [47, 134]],
  黑龙江: [[43, 120], [54, 135]],
  上海: [[30.7, 120.8], [31.8, 122.0]],
  江苏: [[31, 116], [35, 122]],
  浙江: [[27, 118], [31, 123]],
  安徽: [[29, 114], [35, 120]],
  福建: [[23, 115], [29, 122]],
  江西: [[24, 113], [30, 120]],
  山东: [[34, 114], [39, 123]],
  河南: [[31, 110], [37, 117]],
  湖北: [[29, 108], [33, 117]],
  湖南: [[24, 108], [30, 115]],
  广东: [[20, 109], [26, 118]],
  广西: [[21, 104], [27, 113]],
  海南: [[18, 108], [21, 112]],
  重庆: [[28, 105], [32, 110]],
  四川: [[26, 97], [35, 109]],
  贵州: [[24, 103], [30, 110]],
  云南: [[21, 97], [29, 107]],
  西藏: [[26, 78], [37, 102]],
  陕西: [[31, 105], [40, 111]],
  甘肃: [[32, 92], [43, 109]],
  青海: [[31, 89], [40, 103]],
  宁夏: [[35, 104], [40, 108]],
  新疆: [[34, 73], [50, 97]],
  香港: [[22.1, 113.5], [22.6, 115]],
  澳门: [[22.1, 113.5], [22.3, 113.6]],
  台湾: [[21, 119], [26, 123]],
};

/**
 * 递归扫描目录获取所有文件
 */
function scanDir(dir, baseDir = dir) {
  const files = [];

  if (!fs.existsSync(dir)) {
    console.error(`目录不存在: ${dir}`);
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...scanDir(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith(".png")) {
      // 瓦片文件路径（相对于 OFFLINE_TILES_DIR）
      const relativePath = path.relative(baseDir, fullPath);
      files.push({
        path: relativePath,
        // 从路径解析 zoom/x/y
        // 路径格式: source/zoom/x/y.png
        parts: relativePath.split(path.sep),
      });
    }
  }

  return files;
}

/**
 * 解析瓦片路径获取坐标
 * 路径格式: amap/10/847/507.png
 */
function parseTilePath(relativePath) {
  const parts = relativePath.split(path.sep);
  if (parts.length !== 4) return null;

  const [source, zoomStr, xStr, fileName] = parts;
  const zoom = parseInt(zoomStr, 10);
  const x = parseInt(xStr, 10);
  const y = parseInt(fileName.replace(".png", ""), 10);

  if (isNaN(zoom) || isNaN(x) || isNaN(y)) return null;

  return { source, zoom, x, y };
}

/**
 * 计算瓦片边界
 */
function tileToLatLng(z, x, y) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  const lng = (x / Math.pow(2, z)) * 360 - 180;
  return [lat, lng];
}

/**
 * 生成瓦片清单
 */
function generateManifest() {
  console.log("扫描瓦片目录:", OFFLINE_TILES_DIR);

  const tiles = scanDir(OFFLINE_TILES_DIR);
  console.log(`找到 ${tiles.length} 个瓦片文件`);

  // 按源分组
  const tilesBySource = {};

  for (const file of tiles) {
    const coords = parseTilePath(file.path);
    if (!coords) continue;

    const { source, zoom, x, y } = coords;

    if (!tilesBySource[source]) {
      tilesBySource[source] = [];
    }

    const [minLat, minLng] = tileToLatLng(zoom, x, y);
    const [maxLat, maxLng] = tileToLatLng(zoom, x + 1, y + 1);

    tilesBySource[source].push({
      z: zoom,
      x,
      y,
      path: file.path,
      size: fs.statSync(path.join(OFFLINE_TILES_DIR, file.path)).size,
      bounds: {
        minLat,
        minLng,
        maxLat,
        maxLng,
      },
    });
  }

  // 生成清单
  const manifest = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    sources: {},
  };

  for (const [source, sourceTiles] of Object.entries(tilesBySource)) {
    const zoomLevels = [...new Set(sourceTiles.map((t) => t.z))].sort((a, b) => a - b);

    // 计算总体边界
    let minLat = 90,
      minLng = 180,
      maxLat = -90,
      maxLng = -180;

    for (const tile of sourceTiles) {
      if (tile.bounds.minLat < minLat) minLat = tile.bounds.minLat;
      if (tile.bounds.minLng < minLng) minLng = tile.bounds.minLng;
      if (tile.bounds.maxLat > maxLat) maxLat = tile.bounds.maxLat;
      if (tile.bounds.maxLng > maxLng) maxLng = tile.bounds.maxLng;
    }

    manifest.sources[source] = {
      bounds: [[minLat, minLng], [maxLat, maxLng]],
      zoomLevels,
      tileCount: sourceTiles.length,
      tiles: sourceTiles.map(({ bounds, ...rest }) => rest),
    };
  }

  return manifest;
}

// 主程序
if (require.main === module) {
  const manifest = generateManifest();

  // 保存清单
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));

  console.log("\n========== 清单生成完成 ==========");
  console.log(`文件: ${OUTPUT_FILE}`);
  console.log(`源: ${Object.keys(manifest.sources).join(", ")}`);

  for (const [source, info] of Object.entries(manifest.sources)) {
    console.log(`\n${source}:`);
    console.log(`  瓦片数: ${info.tileCount}`);
    console.log(`  缩放级别: ${info.zoomLevels.join(", ")}`);
    console.log(
      `  边界: [${info.bounds[0][0].toFixed(2)}, ${info.bounds[0][1].toFixed(2)}] - [${info.bounds[1][0].toFixed(2)}, ${info.bounds[1][1].toFixed(2)}]`,
    );
  }
}

module.exports = { generateManifest };
