import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateServiceMigration } from '../src/generator';
import { getServiceByName } from '../src/services';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-test-'));
const ai = getServiceByName('ai')!;
const f = generateServiceMigration(ai, tmp)!;
const content = fs.readFileSync(path.join(tmp, f), 'utf8');

console.log('len:', content.length);
const lines = content.split('\n');
for (let i = 18; i < 35; i++) {
  console.log(`${i}: ${JSON.stringify(lines[i])}`);
}
