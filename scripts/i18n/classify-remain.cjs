const fs = require('fs');
const details = require('./scan-precise-details.json');

const classified = {
  bi_mock_data: [],
  ai_regex_prompts: [],
  tmp_files: [],
  obj_key_shorthand: [],
  ui_text_remain: [],
  others: []
};

const CJK_RE = /[\u4e00-\u9fff]/;

details.forEach(it => {
  const line = it.content;
  if (it.file.startsWith('pages/bi')) { classified.bi_mock_data.push(it); return; }
  if (it.file.startsWith('tmp/')) { classified.tmp_files.push(it); return; }
  if (it.file.startsWith('ai/agent/context-engine')) { classified.ai_regex_prompts.push(it); return; }
  if (it.file.startsWith('pages/ai/') && /`[^`]*[\u4e00-\u9fff]/.test(line)) { classified.ai_regex_prompts.push(it); return; }
  const shorthandRe = /^\s*[\u4e00-\u9fff"\u4e00-\u9fff][\u4e00-\u9fff\w]*[:：]/;
  if (shorthandRe.test(line) && line.includes(':') && !line.includes('>') && !line.includes('<')) {
    classified.obj_key_shorthand.push(it); return;
  }
  if (line.includes('>') || line.includes("'") || line.includes('"')) {
    classified.ui_text_remain.push(it); return;
  }
  classified.others.push(it);
});

console.log('=== Classification ===');
console.log('BI mock data keys (whitelist):', classified.bi_mock_data.length);
console.log('AI regex/prompts (whitelist):', classified.ai_regex_prompts.length);
console.log('tmp files (ignore):', classified.tmp_files.length);
console.log('Object property keys (whitelist):', classified.obj_key_shorthand.length);
console.log('REAL UI TEXT to handle:', classified.ui_text_remain.length);
console.log('Others:', classified.others.length);
console.log('');
console.log('UI samples (first 30):');
classified.ui_text_remain.slice(0,30).forEach(it => console.log('  ' + it.file + ':' + it.line + ' | ' + it.content.slice(0,120)));
console.log('');
console.log('Other samples:');
classified.others.slice(0,20).forEach(it => console.log('  ' + it.file + ':' + it.line + ' | ' + it.content.slice(0,120)));
