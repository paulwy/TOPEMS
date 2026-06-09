import { generateAllServiceConfigs } from '../src/services';
import {
  generateServiceMigration,
  generateIndexMigration,
  generateAuditMigration,
} from '../src/generator';
import * as fs from 'fs';
import * as path from 'path';

const outDir = path.join(__dirname, '..', 'verify-output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const services = generateAllServiceConfigs();
console.log('服务数量:', services.length);
console.log('服务列表:', services.map((s) => s.name).join(', '));

let allOk = true;

services.forEach((s) => {
  try {
    const schemaFile = generateServiceMigration(s, outDir);
    const indexFile = generateIndexMigration(s, outDir);
    const auditFile = generateAuditMigration(s, outDir);

    if (!schemaFile || !indexFile || !auditFile) {
      console.log(`  ✗ ${s.name}: 文件生成失败`);
      allOk = false;
      return;
    }

    const schemaContent = fs.readFileSync(
      path.join(outDir, schemaFile),
      'utf8',
    );
    const hasFk = schemaContent.includes('FOREIGN KEY');
    const hasIndex = schemaContent.includes('CREATE INDEX');
    const hasAudit = schemaContent.includes('audit_logs');
    const hasTrigger = schemaContent.includes('update_timestamp');
    console.log(
      `  ✓ ${s.name}: ${schemaContent.split('\n').length} 行 ` +
        `[FK:${hasFk}, IDX:${hasIndex}, AUDIT:${hasAudit}, TRIGGER:${hasTrigger}]`,
    );
  } catch (e) {
    console.log(`  ✗ ${s.name}: 生成异常`, (e as Error).message);
    allOk = false;
  }
});

fs.rmSync(outDir, { recursive: true, force: true });

if (allOk) {
  console.log('\n所有服务迁移生成验证通过 ✓');
  process.exit(0);
} else {
  console.log('\n存在验证失败 ✗');
  process.exit(1);
}
