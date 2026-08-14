#!/usr/bin/env node
/**
 * V219 Last Mile Fix: Handle the final ~116 non-comment hardcoded Chinese lines.
 *
 * Patterns covered:
 *  1. t('key', '中文fallback') → t('key')  (remove Chinese fallback)
 *  2. String literals in data objects (label: '中文', name: '中文', etc.)
 *  3. Bare JSX text (no quotes, no braces)
 *  4. JSX text with expression: 中文{expr} or {expr}中文
 *  5. Error message fallbacks: setError(... || '中文')
 *  6. Template literals with Chinese: `${expr} (中文)`
 *  7. <InputLabel>中文</InputLabel>, <MenuItem value='X'>中文</MenuItem>
 *  8. Multi-line JSX text (e.g. • 根据预算... in Typography)
 *  9. DialogTitle with Chinese (missed by previous scripts)
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const verbose = args.includes('--verbose');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const PAGES_DIR = path.join(WEB_ROOT, 'pages');
const I18N_DIR = path.join(WEB_ROOT, 'i18n', 'locales');
const P2 = ['gis','im','system','automation','finance','lowcode','hrm','pdm','scm','integration'];
const CJK = /[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff]/;

let totalReplaced = 0, filesFixed = 0;
const translations = {};
let keyCounters = {};

function loadT(mod) {
  if (translations[mod]) return translations[mod];
  const p = path.join(I18N_DIR, 'zh', `${mod}.json`);
  translations[mod] = {};
  if (fs.existsSync(p)) { try { translations[mod] = JSON.parse(fs.readFileSync(p,'utf8')); } catch {} }
  return translations[mod];
}

function saveT(mod) {
  const zhP = path.join(I18N_DIR, 'zh', `${mod}.json`);
  const enP = path.join(I18N_DIR, 'en', `${mod}.json`);
  if (!fs.existsSync(zhP)) return;
  const zh = JSON.parse(fs.readFileSync(zhP,'utf8'));
  const en = JSON.parse(fs.readFileSync(enP,'utf8'));
  for (const [k,v] of Object.entries(translations[mod]||{})) {
    if (!zh[k]) zh[k]=v.zh;
    if (!en[k]) en[k]=v.en||v.zh;
  }
  if (!dryRun) {
    fs.writeFileSync(zhP, JSON.stringify(zh,null,2)+'\n');
    fs.writeFileSync(enP, JSON.stringify(en,null,2)+'\n');
  }
}

function fileLabel(fp, mod) {
  const rel = path.relative(path.join(PAGES_DIR, mod), fp);
  return rel.replace(/\.tsx?$/,'').replace(/\//g,'_')
    .replace(/([a-z0-9])([A-Z])/g,'$1_$2').toLowerCase();
}

function genKey(mod, label, text) {
  const prefix = `${mod}.${label}`;
  if (!keyCounters[prefix]) keyCounters[prefix]=0;
  keyCounters[prefix]++;
  for (const [k,v] of Object.entries(translations[mod]||{}))
    if (v.zh===text) return k;
  return `${prefix}.l${keyCounters[prefix]}`;
}

function addT(mod,key,zh,en) {
  if (!translations[mod]) loadT(mod);
  if (!translations[mod][key]) translations[mod][key]={zh,en:en||zh};
  return key;
}

function getLastImport(lines) {
  let last=-1, inBlock=false;
  for (let i=0;i<lines.length;i++) {
    const t=lines[i].trim();
    if (t.startsWith('import ')) {
      last=i;
      if (t.includes('{')&&!t.includes('}')) inBlock=true;
      else if (t.endsWith(';')) inBlock=false;
    } else if (inBlock) {
      if (t.endsWith(';')) { last=i; inBlock=false; }
    } else if (last>=0 && !t.startsWith('import') && t!=='') break;
  }
  return last;
}

function ensureImports(lines) {
  let changed=false;
  const needsI18n = lines.some(l=>/i18n\.t\s*\(/.test(l));
  const hasI18n = lines.some(l=>/import\s+i18n\s+from/.test(l));
  if (needsI18n && !hasI18n) {
    const last=getLastImport(lines);
    if (last>=0) { lines.splice(last+1,0,"import i18n from '@/i18n';"); changed=true; }
  }
  const needsT = lines.some(l=>/\bt\s*\(\s*['"`]/.test(l)&&!/i18n\.t/.test(l)&&!/const\s*\{\s*t\s*\}/.test(l)&&!/import/.test(l));
  const hasT = lines.some(l=>/import\s*\{[^}]*useTranslation/.test(l));
  if (needsT && !hasT) {
    const last=getLastImport(lines);
    if (last>=0) { lines.splice(last+1,0,"import { useTranslation } from 'react-i18next';"); changed=true; }
  }
  return changed;
}

function isComment(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('{/*');
}

function processFile(filePath, mod) {
  let lines = fs.readFileSync(filePath,'utf8').split('\n');
  let modified=false, count=0;
  const label = fileLabel(filePath, mod);
  loadT(mod);

  for (let i=0; i<lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    if (isComment(trimmed)) continue;
    if (/^import\s/.test(trimmed)) continue;
    if (trimmed==='') continue;

    let cleaned = line.replace(/i18n\.t\s*\([^)]*\)/g,'').replace(/\bt\s*\(\s*['"`][^)]*\)/g,'');
    if (!CJK.test(cleaned)) continue;

    let replaced = false;

    // 1. t('key', '中文fallback') → t('key')
    {
      const m = line.match(/(\bt|i18n\.t)\s*\(\s*(['"`][^'"`]*['"`])\s*,\s*(['"`])((?:[^'"`]*[\u4e00-\u9fff][^'"`]*?))\3\s*\)/);
      if (m) {
        const fn = m[1], key = m[2];
        lines[i] = line.replace(m[0], `${fn}(${key})`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [t-fallback] ${mod}/${label}:${i+1}`);
      }
    }

    // 2. setError(err instanceof Error ? err.message : '中文')
    if (!replaced) {
      const m = line.match(/(:\s*err\s+instanceof\s+Error\s*\?\s*err\.message\s*:\s*)(['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\2/);
      if (m) {
        const prefix = m[1], text = m[3];
        const key = genKey(mod,label,text);
        addT(mod,key,text);
        lines[i] = line.replace(m[0], `${prefix}i18n.t('${key}')`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [err-fb] ${mod}/${label}:${i+1} "${text.substring(0,15)}"`);
      }
    }

    // 3. data.data.message || '中文' (or similar || '中文')
    if (!replaced) {
      const m = line.match(/(\|\|\s*)(['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\2/);
      if (m && !line.includes('i18n.t(')) {
        const text = m[3];
        const key = genKey(mod,label,text);
        addT(mod,key,text);
        lines[i] = line.replace(m[0], `${m[1]}i18n.t('${key}')`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [or-fb] ${mod}/${label}:${i+1} "${text.substring(0,15)}"`);
      }
    }

    // 4. Template literal: `${expr} (中文)` or `${expr}中文`
    if (!replaced) {
      const m = line.match(/`(\$\{[^}]+\})\s*([\u4e00-\u9fff][\u4e00-\u9fff\w\s（）()·\-:]*?)([\s\S]*?)`/);
      if (m && !line.includes('i18n.t(')) {
        const expr = m[1], chinese = m[2], after = m[3]||'';
        // Build translation text with interpolation
        let transText = '{{v1}}' + chinese;
        let interpParts = [`v1: ${expr.replace(/\$\{|}/g,'')}`];
        // Check for more ${} in after
        let remaining = after;
        let vi = 2;
        let varRe = /\$\{([^}]+)\}/g;
        let vm;
        while ((vm = varRe.exec(after)) !== null) {
          transText += '{{v'+vi+'}}';
          interpParts.push(`v${vi}: ${vm[1]}`);
          vi++;
        }
        transText = transText.trim();
        const key = genKey(mod,label,transText);
        addT(mod,key,transText);
        const params = interpParts.length > 0 ? `, { ${interpParts.join(', ')} }` : '';
        lines[i] = line.replace(m[0], `i18n.t('${key}'${params})`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [tmpl] ${mod}/${label}:${i+1}`);
      }
    }

    // 5. Template literal starting with Chinese: `中文${expr}`
    if (!replaced) {
      const m = line.match(/`([\u4e00-\u9fff][^`]*?)\$\{([^}]+)\}([^`]*)`/);
      if (m && !line.includes('i18n.t(')) {
        const before = m[1], expr = m[2], after = m[3]||'';
        let transText = before + '{{v1}}' + after;
        transText = transText.trim();
        const key = genKey(mod,label,transText);
        addT(mod,key,transText);
        lines[i] = line.replace(m[0], `i18n.t('${key}', { v1: ${expr} })`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [tmpl-zh] ${mod}/${label}:${i+1}`);
      }
    }

    // 6. <InputLabel ...>中文</InputLabel>
    if (!replaced) {
      const m = line.match(/<InputLabel([^>]*)>([\u4e00-\u9fff][^<{}]*?)<\/InputLabel>/);
      if (m && !line.includes('i18n.t(') && !line.includes('{t(')) {
        const attrs=m[1]||'', text=m[2].trim();
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=line.replace(m[0],`<InputLabel${attrs}>{t('${key}')}</InputLabel>`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [input-lbl] ${mod}/${label}:${i+1} "${text.substring(0,15)}"`);
      }
    }

    // 7. <MenuItem value='X'>中文</MenuItem>
    if (!replaced) {
      const m = line.match(/<MenuItem\s+value=(['"])([^'"]*)\1>([\u4e00-\u9fff][^<{}]*?)<\/MenuItem>/);
      if (m && !line.includes('i18n.t(') && !line.includes('{t(')) {
        const val=m[2], text=m[3].trim();
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=line.replace(m[0],`<MenuItem value='${val}'>{t('${key}')}</MenuItem>`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [menu-item] ${mod}/${label}:${i+1} "${text.substring(0,15)}"`);
      }
    }

    // 8. <DialogTitle>中文</DialogTitle> (catch remaining)
    if (!replaced) {
      const m = line.match(/<DialogTitle>([\u4e00-\u9fff][^<{}]*?)<\/DialogTitle>/);
      if (m && !line.includes('i18n.t(') && !line.includes('{t(')) {
        const text=m[1].trim();
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=line.replace(m[0],`<DialogTitle>{t('${key}')}</DialogTitle>`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [dlg-title] ${mod}/${label}:${i+1}`);
      }
    }

    // 9. String literal in data: label: '中文' (in .ts/.tsx data objects, not JSX)
    if (!replaced) {
      const m = line.match(/(\s+)(label|title|name|description|device|alert_type|alertlevel|alert_message|contract_name|contract_action|user_name|process_name|approval_status|approver_name|approval_comment|expire_time|content):\s*(['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\3/);
      if (m && !line.includes('i18n.t(') && !line.includes('={t(')) {
        const field=m[2], text=m[4];
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=line.replace(m[0],`${m[1]}${field}: i18n.t('${key}')`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [data-str] ${mod}/${label}:${i+1} ${field}="${text.substring(0,15)}"`);
      }
    }

    // 10. Bare Chinese text in JSX (line is just Chinese text in JSX context)
    // e.g. "GIS地图", "税前月收入 (元)", "BOM总数"
    if (!replaced) {
      const m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w\s（）()·\-\/.]*?)(\s*)$/);
      if (m && !line.includes('=') && !line.includes('(') && !line.includes('`') && 
          !line.includes('{') && !line.includes('const') && !line.includes('let') && 
          !line.includes('return') && !line.includes('if') && !line.includes('import') &&
          !line.includes('//') && !line.includes('<') && !line.includes('>')) {
        const indent=m[1], text=m[2].trim(), trail=m[3];
        if (text && CJK.test(text) && text.length>1) {
          const key=genKey(mod,label,text);
          addT(mod,key,text);
          lines[i]=`${indent}{t('${key}')}${trail}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [bare] ${mod}/${label}:${i+1} "${text.substring(0,20)}"`);
        }
      }
    }

    // 11. JSX text with expression: 中文{expr} or 中文：{expr}
    // e.g. "耗时：{detailRun.duration_ms ? ... : '-'}"
    if (!replaced) {
      const m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-]*?)\s*\{([^}]+)\}(\s*)$/);
      if (m && !line.includes('i18n.t(') && !line.includes('<')) {
        const indent=m[1], text=m[2].trim(), expr=m[3], trail=m[4];
        if (text && CJK.test(text)) {
          const fullText = text + ' {{v1}}';
          const key=genKey(mod,label,fullText);
          addT(mod,key,fullText);
          lines[i]=`${indent}{t('${key}', { v1: ${expr} })}${trail}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [jsx-expr] ${mod}/${label}:${i+1} "${text.substring(0,15)}"`);
        }
      }
    }

    // 12. {expr}中文 (expression followed by Chinese)
    if (!replaced) {
      const m = line.match(/^(\s*)\{([^}]+)\}\s*([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-]*?)(\s*)$/);
      if (m && !line.includes('i18n.t(') && !line.includes('<')) {
        const indent=m[1], expr=m[2], text=m[3].trim(), trail=m[4];
        if (text && CJK.test(text)) {
          const fullText = '{{v1}} ' + text;
          const key=genKey(mod,label,fullText);
          addT(mod,key,fullText);
          lines[i]=`${indent}{t('${key}', { v1: ${expr} })}${trail}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [expr-zh] ${mod}/${label}:${i+1}`);
        }
      }
    }

    // 13. (中文) - parenthesized Chinese in JSX
    if (!replaced) {
      const m = line.match(/^(\s+)\(([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-\/.]*?)\)(\s*)$/);
      if (m && !line.includes('i18n.t(') && !line.includes('=') && !line.includes('<') && !line.includes('{') && !line.includes('`')) {
        const indent=m[1], text=m[2].trim(), trail=m[3];
        if (text && CJK.test(text)) {
          const key=genKey(mod,label,text);
          addT(mod,key,text);
          lines[i]=`${indent}({t('${key}')})${trail}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [paren] ${mod}/${label}:${i+1}`);
        }
      }
    }

    // 14. (半径: {expr}m) - mixed parenthesized text with expression
    if (!replaced) {
      const m = line.match(/^(\s+)\(([\u4e00-\u9fff][^()]*?):\s*\{([^}]+)\}([^)]*?)\)(\s*)$/);
      if (m && !line.includes('i18n.t(') && !line.includes('<')) {
        const indent=m[1], before=m[2], expr=m[3], after=m[4]||'', trail=m[5];
        const fullText = before + ': {{v1}}' + after;
        const key=genKey(mod,label,fullText);
        addT(mod,key,fullText);
        lines[i]=`${indent}({t('${key}', { v1: ${expr} })})${trail}`;
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [paren-expr] ${mod}/${label}:${i+1}`);
      }
    }

    // 15. <Typography>• 中文</Typography> (bullet text)
    if (!replaced) {
      const m = line.match(/<Typography([^>]*)>([•\u4e00-\u9fff][^<{}]*?)<\/Typography>/);
      if (m && !line.includes('i18n.t(') && !line.includes('{t(')) {
        const attrs=m[1]||'', text=m[2].trim();
        if (text && CJK.test(text)) {
          const key=genKey(mod,label,text);
          addT(mod,key,text);
          lines[i]=line.replace(m[0],`<Typography${attrs}>{t('${key}')}</Typography>`);
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [typ-bullet] ${mod}/${label}:${i+1} "${text.substring(0,20)}"`);
        }
      }
    }

    // 16. Chinese text followed by : and <strong>...</strong>
    // e.g. "使用率: <strong>{budget.usageRate}%</strong>"
    if (!replaced) {
      const m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w\s]*?):\s*(<strong>[\s\S]*<\/strong>)(\s*)$/);
      if (m && !line.includes('i18n.t(')) {
        const indent=m[1], text=m[2].trim()+':', strong=m[3], trail=m[4];
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=`${indent}{t('${key}')}{' '}${strong}${trail}`;
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [zh-strong] ${mod}/${label}:${i+1}`);
      }
    }

    // 17. Chinese text with trailing punctuation: ，请关注...
    if (!replaced) {
      const m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w\s，。、（）()·\-：]*?)(\s*)$/);
      if (m && !line.includes('=') && !line.includes('(') && !line.includes('`') && 
          !line.includes('{') && !line.includes('const') && !line.includes('let') && 
          !line.includes('return') && !line.includes('if') && !line.includes('import') &&
          !line.includes('//') && !line.includes('<') && !line.includes('>')) {
        const indent=m[1], text=m[2].trim(), trail=m[3];
        if (text && CJK.test(text) && text.length>1) {
          const key=genKey(mod,label,text);
          addT(mod,key,text);
          lines[i]=`${indent}{t('${key}')}${trail}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [zh-trail] ${mod}/${label}:${i+1} "${text.substring(0,20)}"`);
        }
      }
    }

    // 18. {expr}（后端...）- expression followed by Chinese parenthetical
    if (!replaced) {
      const m = line.match(/^(\s*)\{([^}]+)\}（([\u4e00-\u9fff][\u4e00-\u9fff\w\s，。、（）()·\-：]*?)）(\s*)$/);
      if (m && !line.includes('i18n.t(')) {
        const indent=m[1], expr=m[2], text=m[3].trim(), trail=m[4];
        const fullText = '{{v1}}（' + text + '）';
        const key=genKey(mod,label,fullText);
        addT(mod,key,fullText);
        lines[i]=`${indent}{t('${key}', { v1: ${expr} })}${trail}`;
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [expr-paren-zh] ${mod}/${label}:${i+1}`);
      }
    }

    // 19. Chinese text with colon and expression: 超时(小时)
    if (!replaced) {
      const m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w]*?\([^)]*\))(\s*)$/);
      if (m && !line.includes('=') && !line.includes('i18n.t(') && !line.includes('{') && 
          !line.includes('const') && !line.includes('let') && !line.includes('return') && 
          !line.includes('if') && !line.includes('//') && !line.includes('<')) {
        const indent=m[1], text=m[2].trim(), trail=m[3];
        if (text && CJK.test(text)) {
          const key=genKey(mod,label,text);
          addT(mod,key,text);
          lines[i]=`${indent}{t('${key}')}${trail}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [zh-paren] ${mod}/${label}:${i+1} "${text.substring(0,20)}"`);
        }
      }
    }

    // 20. {{变量名}} style placeholder text
    if (!replaced) {
      const m = line.match(/(['"])\{\{([\u4e00-\u9fff][\u4e00-\u9fff\w]*)\}\}\1/);
      if (m && !line.includes('i18n.t(')) {
        const text = '{{' + m[2] + '}}';
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=line.replace(m[0], `t('${key}')`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [placeholder] ${mod}/${label}:${i+1}`);
      }
    }
  }

  if (modified) {
    const impChanged = ensureImports(lines);
    if (impChanged) count++;
    if (!dryRun) fs.writeFileSync(filePath, lines.join('\n'));
    filesFixed++;
    totalReplaced += count;
  }
  return count;
}

function walk(dir,ext,cb){
  if(!fs.existsSync(dir))return;
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory())walk(p,ext,cb);
    else if(e.name.endsWith(ext)&&!e.name.includes('.test.'))cb(p);
  }
}

console.log(`\n=== V219 Last Mile Fix ===`);
console.log(`Mode: ${dryRun?'DRY RUN':'WRITE'}\n`);

for(const mod of P2){
  const dir=path.join(PAGES_DIR,mod);
  if(!fs.existsSync(dir))continue;
  keyCounters={};
  loadT(mod);
  let c=0;
  console.log(`Processing ${mod}...`);
  // Process both .tsx and .ts files
  walk(dir,'.tsx',(f)=>{try{c+=processFile(f,mod)}catch(e){console.error(`  ERR:${f}:${e.message}`)}});
  walk(dir,'.ts',(f)=>{try{c+=processFile(f,mod)}catch(e){console.error(`  ERR:${f}:${e.message}`)}});
  if(c>0){saveT(mod);console.log(`  ${mod}: ${c} replacements`);}
}

console.log(`\nFiles: ${filesFixed}, Replacements: ${totalReplaced}, Mode: ${dryRun?'DRY':'WRITE'}`);
