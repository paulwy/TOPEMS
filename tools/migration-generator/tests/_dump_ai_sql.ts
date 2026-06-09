import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Client } from 'pg';
import { generateServiceMigration } from '../src/generator';
import { getServiceByName } from '../src/services';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-test-'));
const ai = getServiceByName('ai')!;
const f = generateServiceMigration(ai, tmp)!;
const content = fs.readFileSync(path.join(tmp, f), 'utf8');

// 切出 knowledge_bases 的前 700 字符
console.log('====== 前 1500 字符 ======');
console.log(content.slice(0, 1500));
console.log('====== 1500-3500 ======');
console.log(content.slice(1500, 3500));

(async () => {
  const client = new Client({
    host: process.env.PG_HOST || '127.0.0.1',
    port: Number(process.env.PG_PORT || 5432),
    user: 'topems',
    password: 'topems',
    database: 'topems',
  });
  try {
    await client.connect();
  } catch (e) {
    console.error('无法连接数据库，跳过本地验证');
    return;
  }
  try {
    await client.query(content);
    console.log('✅ schema 成功');
  } catch (e: any) {
    console.error('❌ 失败:', e.message);
  } finally {
    await client.end();
  }
})();
