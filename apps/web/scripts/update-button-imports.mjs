/**
 * 批量更新 Button 导入脚本
 * 将 MUI Button 替换为自定义的 Button 组件
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 获取 src 目录路径（脚本在 scripts/ 目录下，src 在上一级）
const projectRoot = path.resolve(__dirname, "..");
const srcDir = path.join(projectRoot, "src");

console.log(`项目根目录: ${projectRoot}`);
console.log(`源代码目录: ${srcDir}\n`);

// 扫描目录
function scanDir(dir, extensions = [".ts", ".tsx"]) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // 跳过 node_modules、.git 等目录
    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === "dist" ||
      entry.name === "build"
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...scanDir(fullPath, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

// 处理单个文件
function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  let modified = false;

  // 检查是否已导入自定义 Button
  if (content.includes('from "@/components/ui/Button"')) {
    return false;
  }

  // 匹配 import { Button, ... } from "@mui/material"
  const muiImportRegex = /import\s+\{([^}]+)\}\s+from\s+["']@mui\/material["'];?/g;
  let match;
  const matches = [];

  while ((match = muiImportRegex.exec(content)) !== null) {
    matches.push(match);
  }

  for (const m of matches) {
    const fullImport = m[0];
    const imports = m[1];

    // 检查是否导入了 Button
    if (!imports.includes("Button")) {
      continue;
    }

    // 分离 imports
    const importList = imports.split(",").map((s) => s.trim());
    const buttonIndex = importList.findIndex((s) => s === "Button" || s.startsWith("Button as "));

    if (buttonIndex === -1) {
      continue;
    }

    // 获取 Button 的别名（如果有）
    let buttonImport = "Button";
    let muiImports = importList.filter((_, i) => i !== buttonIndex);

    if (importList[buttonIndex].startsWith("Button as ")) {
      const alias = importList[buttonIndex].split(" as ").pop().trim();
      buttonImport = `Button as ${alias}`;
      muiImports.push(`Button as MUI_Button`);
    }

    // 构建新的导入语句
    let newMuiImports = muiImports.join(", ");
    let newImport;

    if (newMuiImports) {
      newImport = `import { ${newMuiImports} } from "@mui/material";\nimport { ${buttonImport} } from "@/components/ui/Button";`;
    } else {
      newImport = `import { ${buttonImport} } from "@/components/ui/Button";`;
    }

    // 替换导入语句
    content = content.replace(fullImport, newImport);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, "utf-8");
  }

  return modified;
}

// 主函数
function main() {
  const files = scanDir(srcDir);

  console.log(`扫描到 ${files.length} 个 TypeScript 文件\n`);

  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    try {
      const result = processFile(file);
      if (result) {
        console.log(`✅ 更新: ${path.relative(srcDir, file)}`);
        updated++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`❌ 错误: ${path.relative(srcDir, file)}`);
      console.error(err.message);
    }
  }

  console.log(`\n完成！更新了 ${updated} 个文件，跳过 ${skipped} 个文件。`);
}

main();
