import * as fs from 'fs';
import * as path from 'path';
import {
  generateServiceMigration,
  generateIndexMigration,
  generateAuditMigration,
} from '../src/generator';
import { getServiceByName } from '../src/services';

const outputDir = path.resolve(__dirname, '..', 'migrations');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[ai-migration] 目录已创建: ${dir}`);
  }
}

function main(): void {
  const ai = getServiceByName('ai');
  if (!ai) {
    console.error('[ai-migration] 未找到 AI 服务配置');
    process.exit(1);
  }

  ensureDir(outputDir);

  const schemaFile = generateServiceMigration(ai, outputDir);
  const indexFile = generateIndexMigration(ai, outputDir);
  const auditFile = generateAuditMigration(ai, outputDir);

  console.log('[ai-migration] 已生成以下迁移文件:');
  if (schemaFile) console.log(`  - schema : ${path.join(outputDir, schemaFile)}`);
  if (indexFile) console.log(`  - index  : ${path.join(outputDir, indexFile)}`);
  if (auditFile) console.log(`  - audit  : ${path.join(outputDir, auditFile)}`);

  if (!schemaFile || !indexFile || !auditFile) {
    console.error('[ai-migration] 部分文件生成失败');
    process.exit(1);
  }
}

main();
