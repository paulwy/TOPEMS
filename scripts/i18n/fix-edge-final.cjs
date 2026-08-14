#!/usr/bin/env node
/**
 * V219 Edge Final: Handle the last ~79 non-comment hardcoded Chinese lines.
 * Targets specific patterns missed by previous scripts.
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
  return `${prefix}.e${keyCounters[prefix]}`;
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

    // Check for ANY Chinese in the line (before cleaning, to catch t('key', '中文') too)
    if (!CJK.test(line)) continue;

    let replaced = false;

    // 1. Remove Chinese fallback from t('key', '中文') or t("key", "中文")
    // Must run before cleaning step
    {
      const re = /\bt\s*\(\s*(['"`][^'"`]*['"`])\s*,\s*(['"`])((?:[^'"`]*[\u4e00-\u9fff][^'"`]*?))\2\s*\)/g;
      let m;
      let newLine = line;
      while ((m = re.exec(line)) !== null) {
        const key = m[1];
        newLine = newLine.replace(m[0], `t(${key})`);
        count++;
        replaced = true;
        if (verbose) console.log(`  [t-fb-rm] ${mod}/${label}:${i+1}`);
      }
      if (replaced) {
        lines[i] = newLine;
        line = newLine;
        modified = true;
      }
    }

    // Re-check: skip lines where Chinese is only inside t()/i18n.t() calls
    let cleaned = line.replace(/i18n\.t\s*\([^)]*\)/g,'').replace(/\bt\s*\(\s*['"`][^)]*\)/g,'');
    if (!CJK.test(cleaned)) continue;

    // 2. setError(err instanceof Error ? err.message : '中文')
    if (!replaced) {
      const m = line.match(/(err\s+instanceof\s+Error\s*\?\s*err\.message\s*:\s*)(['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\2/);
      if (m) {
        const prefix = m[1], text = m[3];
        const key = genKey(mod,label,text);
        addT(mod,key,text);
        lines[i] = line.replace(m[0], `${prefix}i18n.t('${key}')`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [err-iso] ${mod}/${label}:${i+1} "${text.substring(0,15)}"`);
      }
    }

    // 3. Standalone fallback: : '中文' (on its own line, after ternary)
    if (!replaced) {
      const m = line.match(/^(\s*):\s*(['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\2(\s*)$/);
      if (m && !line.includes('i18n.t(')) {
        const text = m[3];
        const key = genKey(mod,label,text);
        addT(mod,key,text);
        lines[i] = `${m[1]}: i18n.t('${key}')${m[4]}`;
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [standalone-fb] ${mod}/${label}:${i+1} "${text.substring(0,15)}"`);
      }
    }

    // 4. Template literal: `${expr} (中文)` or `${expr}中文`
    if (!replaced) {
      const m = line.match(/`(\$\{([^}]+)\})\s*([\u4e00-\u9fff（）()][\u4e00-\u9fff\w\s（）()家]*)`/);
      if (m && !line.includes('i18n.t(')) {
        const fullExpr = m[1], expr = m[2], chinese = m[3];
        const transText = '{{v1}}' + chinese;
        const key = genKey(mod,label,transText);
        addT(mod,key,transText);
        lines[i] = line.replace(m[0], `i18n.t('${key}', { v1: ${expr} })`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [tmpl-expr] ${mod}/${label}:${i+1}`);
      }
    }

    // 5. Template literal: `中文${expr}`
    if (!replaced) {
      const m = line.match(/`([\u4e00-\u9fff][\u4e00-\u9fff\w\s：]*?)\$\{([^}]+)\}([^`]*)`/);
      if (m && !line.includes('i18n.t(')) {
        const before = m[1], expr = m[2], after = m[3]||'';
        const transText = (before + '{{v1}}' + after).trim();
        const key = genKey(mod,label,transText);
        addT(mod,key,transText);
        lines[i] = line.replace(m[0], `i18n.t('${key}', { v1: ${expr} })`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [tmpl-zh2] ${mod}/${label}:${i+1}`);
      }
    }

    // 6. Template literal with Chinese only: ` 绑定数据模型：${expr}`
    if (!replaced) {
      const m = line.match(/`([\u4e00-\u9fff][^`]*)\$\{([^}]+)\}([^`]*)`/);
      if (m && !line.includes('i18n.t(')) {
        const before = m[1], expr = m[2], after = m[3]||'';
        let transText = before + '{{v1}}' + after;
        transText = transText.trim();
        const key = genKey(mod,label,transText);
        addT(mod,key,transText);
        lines[i] = line.replace(m[0], `i18n.t('${key}', { v1: ${expr} })`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [tmpl-bind] ${mod}/${label}:${i+1}`);
      }
    }

    // 7. Record<string, string> with Chinese values in .ts files
    // e.g. trigger: '触发器',
    if (!replaced) {
      const m = line.match(/^(\s+)(\w+):\s*(['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\3,?\s*$/);
      if (m && !line.includes('i18n.t(') && !line.includes('={t(') && 
          !line.includes('label=') && !line.includes('title=') && !line.includes('placeholder=')) {
        const indent=m[1], field=m[2], text=m[4];
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=`${indent}${field}: i18n.t('${key}'),`;
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [record-val] ${mod}/${label}:${i+1} ${field}="${text.substring(0,10)}"`);
      }
    }

    // 8. <InputLabel htmlFor='X'>中文</InputLabel> (including text starting with ASCII)
    if (!replaced) {
      const m = line.match(/<InputLabel\s+([^>]+)>([^<{}]*[\u4e00-\u9fff][^<{}]*?)<\/InputLabel>/);
      if (m && !line.includes('i18n.t(') && !line.includes('{t(')) {
        const attrs=m[1], text=m[2].trim();
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=line.replace(m[0],`<InputLabel ${attrs}>{t('${key}')}</InputLabel>`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [input-lbl2] ${mod}/${label}:${i+1} "${text.substring(0,15)}"`);
      }
    }

    // 9. <DialogTitle>中文</DialogTitle> (including text starting with ASCII like "BOM版本对比")
    if (!replaced) {
      const m = line.match(/<DialogTitle>([^<{}]*[\u4e00-\u9fff][^<{}]*?)<\/DialogTitle>/);
      if (m && !line.includes('i18n.t(') && !line.includes('{t(')) {
        const text=m[1].trim();
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=line.replace(m[0],`<DialogTitle>{t('${key}')}</DialogTitle>`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [dlg-title2] ${mod}/${label}:${i+1} "${text.substring(0,15)}"`);
      }
    }

    // 10. <MenuItem value='X'>中文</MenuItem> (including text like "2024年01月")
    if (!replaced) {
      const m = line.match(/<MenuItem\s+value=(['"])([^'"]*)\1>([^<{}]*[\u4e00-\u9fff][^<{}]*?)<\/MenuItem>/);
      if (m && !line.includes('i18n.t(') && !line.includes('{t(')) {
        const val=m[2], text=m[3].trim();
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=line.replace(m[0],`<MenuItem value='${val}'>{t('${key}')}</MenuItem>`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [menu-item2] ${mod}/${label}:${i+1} "${text.substring(0,15)}"`);
      }
    }

    // 11. Bare JSX text (no quotes, no braces, no tags)
    // e.g. "GIS地图", "BOM总数", "税前月收入 (元)"
    if (!replaced) {
      const m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w\s（）()·\-\/.]*?)(\s*)$/);
      if (m && !line.includes('=') && !line.includes('(') && !line.includes(')') && 
          !line.includes('`') && !line.includes('{') && !line.includes('}') &&
          !line.includes('const') && !line.includes('let') && !line.includes('return') && 
          !line.includes('if') && !line.includes('import') && !line.includes('//') && 
          !line.includes('<') && !line.includes('>')) {
        const indent=m[1], text=m[2].trim(), trail=m[3];
        if (text && CJK.test(text) && text.length>1) {
          const key=genKey(mod,label,text);
          addT(mod,key,text);
          lines[i]=`${indent}{t('${key}')}${trail}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [bare2] ${mod}/${label}:${i+1} "${text.substring(0,20)}"`);
        }
      }
    }

    // 12. Bare JSX text with parentheses: "税前月收入 (元)"
    if (!replaced) {
      const m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w\s]*?\s*\([^)]*\))(\s*)$/);
      if (m && !line.includes('=') && !line.includes('`') && !line.includes('{') && 
          !line.includes('const') && !line.includes('let') && !line.includes('return') && 
          !line.includes('if') && !line.includes('import') && !line.includes('//') && 
          !line.includes('<') && !line.includes('>')) {
        const indent=m[1], text=m[2].trim(), trail=m[3];
        if (text && CJK.test(text)) {
          const key=genKey(mod,label,text);
          addT(mod,key,text);
          lines[i]=`${indent}{t('${key}')}${trail}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [bare-paren] ${mod}/${label}:${i+1} "${text.substring(0,20)}"`);
        }
      }
    }

    // 13. JSX text with colon+expression: 耗时：{expr}
    if (!replaced) {
      const m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w\s：]*?)\s*\{([^}]+)\}(\s*)$/);
      if (m && !line.includes('i18n.t(') && !line.includes('<')) {
        const indent=m[1], text=m[2].trim(), expr=m[3], trail=m[4];
        if (text && CJK.test(text)) {
          const fullText = text + ' {{v1}}';
          const key=genKey(mod,label,fullText);
          addT(mod,key,fullText);
          lines[i]=`${indent}{t('${key}', { v1: ${expr} })}${trail}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [jsx-colon-expr] ${mod}/${label}:${i+1} "${text.substring(0,15)}"`);
        }
      }
    }

    // 14. Multi-part JSX: 确定要为 <strong>{expr}</strong> 的合同进行续签吗？
    if (!replaced) {
      const m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w\s]*?)\s*(<strong>\{[^}]+\}<\/strong>)\s*([\u4e00-\u9fff][\u4e00-\u9fff\w\s？?]*?)(\s*)$/);
      if (m && !line.includes('i18n.t(')) {
        const indent=m[1], before=m[2].trim(), strong=m[3], after=m[4].trim(), trail=m[5];
        const expr = strong.match(/\{([^}]+)\}/)?.[1] || '';
        const fullText = before + ' {{v1}} ' + after;
        const key=genKey(mod,label,fullText);
        addT(mod,key,fullText);
        lines[i]=`${indent}{t('${key}', { v1: ${expr} })}${trail}`;
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [jsx-strong-mix] ${mod}/${label}:${i+1}`);
      }
    }

    // 15. Bare text with URL: 请在 URL 上携带 ?page_id=xxx 以设计具体页面。
    if (!replaced) {
      const m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w\s?=.&_：，。、（）()·\-]*?)(\s*)$/);
      if (m && !line.includes('`') && !line.includes('{') &&
          !line.includes('const') && !line.includes('let') && !line.includes('return') &&
          !line.includes('if') && !line.includes('import') && !line.includes('//') &&
          !line.includes('<') && !line.includes('>')) {
        const indent=m[1], text=m[2].trim(), trail=m[3];
        if (text && CJK.test(text) && text.length>1) {
          // Still translate this as it's JSX text
          const key=genKey(mod,label,text);
          addT(mod,key,text);
          lines[i]=`${indent}{t('${key}')}${trail}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [bare-url] ${mod}/${label}:${i+1} "${text.substring(0,20)}"`);
        }
      }
    }

    // 16. Application management: 应用管理 {expr ? `· ${app.code}` : ''}
    if (!replaced) {
      const m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w\s]*?)\s*\{([^}]+)\}(\s*)$/);
      if (m && !line.includes('i18n.t(') && !line.includes('<')) {
        const indent=m[1], text=m[2].trim(), expr=m[3], trail=m[4];
        if (text && CJK.test(text)) {
          const fullText = text + ' {{v1}}';
          const key=genKey(mod,label,fullText);
          addT(mod,key,fullText);
          lines[i]=`${indent}{t('${key}', { v1: ${expr} })}${trail}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [app-mgmt] ${mod}/${label}:${i+1}`);
        }
      }
    }

    // 17. Current status: 当前状态：{expr} · v{expr}
    if (!replaced) {
      const m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w\s：]*?)\{([^}]+)\}\s*·\s*v\{([^}]+)\}(\s*)$/);
      if (m && !line.includes('i18n.t(')) {
        const indent=m[1], text=m[2].trim(), expr1=m[3], expr2=m[4], trail=m[5];
        const fullText = text + '{{v1}} · v{{v2}}';
        const key=genKey(mod,label,fullText);
        addT(mod,key,fullText);
        lines[i]=`${indent}{t('${key}', { v1: ${expr1}, v2: ${expr2} })}${trail}`;
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [status-mix] ${mod}/${label}:${i+1}`);
      }
    }

    // 18. Trailing Chinese text only: ，请关注后续支出情况。
    if (!replaced) {
      const m = line.match(/^(\s+)(，[\u4e00-\u9fff][\u4e00-\u9fff\w\s，。、（）()·\-]*?)(\s*)$/);
      if (m && !line.includes('=') && !line.includes('`') && !line.includes('{') && 
          !line.includes('const') && !line.includes('return') && !line.includes('if') && 
          !line.includes('import') && !line.includes('//') && !line.includes('<')) {
        const indent=m[1], text=m[2].trim(), trail=m[3];
        if (text && CJK.test(text)) {
          const key=genKey(mod,label,text);
          addT(mod,key,text);
          lines[i]=`${indent}{t('${key}')}${trail}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [trailing-zh] ${mod}/${label}:${i+1}`);
        }
      }
    }

    // 19. Mixed JSX: <strong>{t('key')}</strong> 借方合计 {expr} ≠ 贷方合计
    if (!replaced) {
      const m = line.match(/^(\s+)(<strong>\{[^}]+\}<\/strong>)\s*([\u4e00-\u9fff][^<{}]*?)\s*\{([^}]+)\}(\s*[^<]*?\s*)(\s*)$/);
      if (m && !line.includes('i18n.t(')) {
        const indent=m[1], strong=m[2], chinese1=m[3], expr=m[4], rest=m[5]||'', trail=m[6];
        // Extract expr from strong
        const strongExpr = strong.match(/\{([^}]+)\}/)?.[1] || '';
        const fullText = '{{v1}} ' + chinese1 + ' {{v2}}' + rest;
        const key=genKey(mod,label,fullText);
        addT(mod,key,fullText);
        lines[i]=`${indent}{t('${key}', { v1: ${strongExpr}, v2: ${expr} })}${trail}`;
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [mixed-jsx] ${mod}/${label}:${i+1}`);
      }
    }

    // 20. {expr},差额{' '}
    if (!replaced) {
      const m = line.match(/^(\s+)\{([^}]+)\}(，[\u4e00-\u9fff][\u4e00-\u9fff\w]*?)\{'\s*'\}(\s*)$/);
      if (m && !line.includes('i18n.t(')) {
        const indent=m[1], expr=m[2], chinese=m[3], trail=m[4];
        const fullText = '{{v1}}' + chinese;
        const key=genKey(mod,label,fullText);
        addT(mod,key,fullText);
        lines[i]=`${indent}{t('${key}', { v1: ${expr} })}${trail}`;
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [comma-expr] ${mod}/${label}:${i+1}`);
      }
    }

    // 21. <strong>{expr}</strong> - 借方合计 = 贷方合计 = {' '}
    if (!replaced) {
      const m = line.match(/^(\s+)(<strong>\{[^}]+\}<\/strong>)\s*-\s*([\u4e00-\u9fff][^<{}]*?)=\s*([\u4e00-\u9fff][^<{}]*?)\s*=\s*\{'\s*'\}(\s*)$/);
      if (m && !line.includes('i18n.t(')) {
        const indent=m[1], strong=m[2], zh1=m[3], zh2=m[4], trail=m[5];
        const strongExpr = strong.match(/\{([^}]+)\}/)?.[1] || '';
        const fullText = '- ' + zh1 + ' = ' + zh2 + ' = ';
        const key=genKey(mod,label,fullText);
        addT(mod,key,fullText);
        lines[i]=`${indent}{t('${key}', { v1: ${strongExpr} })}${trail}`;
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [strong-eq] ${mod}/${label}:${i+1}`);
      }
    }

    // 22. Redis 连接配置 / ERP 连接状态 (bare text with space)
    if (!replaced) {
      const m = line.match(/^(\s+)([A-Z]+[\w\s]*?[\u4e00-\u9fff][\u4e00-\u9fff\w\s]*?)(\s*)$/);
      if (m && !line.includes('=') && !line.includes('`') && !line.includes('{') && 
          !line.includes('const') && !line.includes('return') && !line.includes('if') && 
          !line.includes('import') && !line.includes('//') && !line.includes('<') && !line.includes('>')) {
        const indent=m[1], text=m[2].trim(), trail=m[3];
        if (text && CJK.test(text)) {
          const key=genKey(mod,label,text);
          addT(mod,key,text);
          lines[i]=`${indent}{t('${key}')}${trail}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [en-zh-mix] ${mod}/${label}:${i+1} "${text}"`);
        }
      }
    }

    // 23. 审批节点（{nodes.length}） - Chinese text with Chinese parens and expression
    if (!replaced) {
      const m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w]*?)（\{([^}]+)\}）(\s*)$/);
      if (m && !line.includes('i18n.t(') && !line.includes('<')) {
        const indent=m[1], text=m[2], expr=m[3], trail=m[4];
        const fullText = text + '（{{v1}}）';
        const key=genKey(mod,label,fullText);
        addT(mod,key,fullText);
        lines[i]=`${indent}{t('${key}', { v1: ${expr} })}${trail}`;
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [zh-paren-expr] ${mod}/${label}:${i+1}`);
      }
    }

    // 24. 上级科目: (Chinese text followed by colon)
    if (!replaced) {
      const m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w\s]*?):(\s*)$/);
      if (m && !line.includes('=') && !line.includes('`') && !line.includes('{') && 
          !line.includes('const') && !line.includes('return') && !line.includes('if') && 
          !line.includes('import') && !line.includes('//') && !line.includes('<') && !line.includes('>')) {
        const indent=m[1], text=m[2].trim()+':', trail=m[3];
        if (text && CJK.test(text)) {
          const key=genKey(mod,label,text);
          addT(mod,key,text);
          lines[i]=`${indent}{t('${key}')}:${trail}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [zh-colon] ${mod}/${label}:${i+1} "${text}"`);
        }
      }
    }

    // 25. 测试结果：{expr ? t('k') : '❌ 失败'} · {expr}
    if (!replaced) {
      const m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w\s：：]*?)\{([^}]+)\}(\s*·\s*\{[^}]+\})(\s*)$/);
      if (m && !line.includes('i18n.t(') && !line.includes('<')) {
        const indent=m[1], text=m[2].trim(), expr1=m[3], expr2=m[4], trail=m[5];
        const fullText = text + '{{v1}}' + expr2.replace(/·/g,' · ');
        // Simpler approach: wrap the whole thing
        const key=genKey(mod,label,text + ' {{v1}} · {{v2}}');
        addT(mod,key,text + ' {{v1}} · {{v2}}');
        // Extract second expr
        const expr2Content = expr2.match(/\{([^}]+)\}/)?.[1] || '';
        lines[i]=`${indent}{t('${key}', { v1: ${expr1}, v2: ${expr2Content} })}${trail}`;
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [test-result] ${mod}/${label}:${i+1}`);
      }
    }

    // 26. name: `${expr} (中文)` - template literal as full property value
    if (!replaced) {
      const m = line.match(/:\s*`\$\{([^}]+)\}\s*(\([\u4e00-\u9fff][\u4e00-\u9fff\w]*\))`/);
      if (m && !line.includes('i18n.t(')) {
        const expr = m[1], chinese = m[2];
        const transText = '{{v1}} ' + chinese;
        const key = genKey(mod,label,transText);
        addT(mod,key,transText);
        lines[i] = line.replace(m[0], `: i18n.t('${key}', { v1: ${expr} })`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [prop-tmpl] ${mod}/${label}:${i+1}`);
      }
    }

    // 27. ? ` (中文${expr}家)` - template literal inside ternary
    if (!replaced) {
      const m = line.match(/`[\s]*[（(]?([\u4e00-\u9fff][\u4e00-\u9fff\w]*?)[）)]?\$\{([^}]+)\}([\u4e00-\u9fff\w]*?)[）)]?`/);
      if (m && !line.includes('i18n.t(')) {
        const chinese1 = m[1], expr = m[2], chinese2 = m[3]||'';
        const transText = chinese1 + '{{v1}}' + chinese2;
        const key = genKey(mod,label,transText);
        addT(mod,key,transText);
        lines[i] = line.replace(m[0], `i18n.t('${key}', { v1: ${expr} })`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [ternary-tmpl] ${mod}/${label}:${i+1}`);
      }
    }

    // 28. {form && ` 中文：${expr}`} - JSX expression with template literal
    if (!replaced) {
      const m = line.match(/`[\s]*([\u4e00-\u9fff][\u4e00-\u9fff\w：：]*?)\$\{([^}]+)\}`/);
      if (m && !line.includes('i18n.t(')) {
        const chinese = m[1], expr = m[2];
        const transText = chinese + '{{v1}}';
        const key = genKey(mod,label,transText);
        addT(mod,key,transText);
        lines[i] = line.replace(m[0], `i18n.t('${key}', { v1: ${expr} })`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [jsx-tmpl] ${mod}/${label}:${i+1}`);
      }
    }

    // 29. 应用管理 {expr} - Chinese text followed by JSX expression with ternary
    if (!replaced) {
      const m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w\s]*?)\s*\{([^}]+)\}(\s*)$/);
      if (m && !line.includes('i18n.t(') && !line.includes('<')) {
        const indent=m[1], text=m[2].trim(), expr=m[3], trail=m[4];
        if (text && CJK.test(text)) {
          const fullText = text + ' {{v1}}';
          const key=genKey(mod,label,fullText);
          addT(mod,key,fullText);
          lines[i]=`${indent}{t('${key}', { v1: ${expr} })}${trail}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [zh-ternary] ${mod}/${label}:${i+1}`);
        }
      }
    }

    // 30. {expr},差额{' '} - expression + Chinese comma text + space (both ASCII and fullwidth comma)
    if (!replaced) {
      const m = line.match(/^(\s+)\{([^}]+)\}([,，][\u4e00-\u9fff][\u4e00-\u9fff\w]*?)\{'\s*'\}(\s*)$/);
      if (m && !line.includes('i18n.t(')) {
        const indent=m[1], expr=m[2], chinese=m[3], trail=m[4];
        const fullText = '{{v1}}' + chinese;
        const key=genKey(mod,label,fullText);
        addT(mod,key,fullText);
        lines[i]=`${indent}{t('${key}', { v1: ${expr} })}${trail}`;
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [comma-expr2] ${mod}/${label}:${i+1}`);
      }
    }

    // 31. 耗时：{expr} - Chinese text with colon followed by expression (with ternary)
    if (!replaced) {
      const m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w：：]*?)\{((?:[^{}]|\{[^}]*\})+)\}(\s*)$/);
      if (m && !line.includes('i18n.t(') && !line.includes('<')) {
        const indent=m[1], text=m[2].trim(), expr=m[3], trail=m[4];
        if (text && CJK.test(text)) {
          const fullText = text + '{{v1}}';
          const key=genKey(mod,label,fullText);
          addT(mod,key,fullText);
          lines[i]=`${indent}{t('${key}', { v1: ${expr} })}${trail}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [colon-ternary] ${mod}/${label}:${i+1}`);
        }
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

function walk(dir,exts,cb){
  if(!fs.existsSync(dir))return;
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory())walk(p,exts,cb);
    else if(exts.some(ext=>e.name.endsWith(ext)&&!e.name.includes('.test.')))cb(p);
  }
}

console.log(`\n=== V219 Edge Final Fix ===`);
console.log(`Mode: ${dryRun?'DRY RUN':'WRITE'}\n`);

for(const mod of P2){
  const dir=path.join(PAGES_DIR,mod);
  if(!fs.existsSync(dir))continue;
  keyCounters={};
  loadT(mod);
  let c=0;
  console.log(`Processing ${mod}...`);
  walk(dir,['.tsx','.ts'],(f)=>{try{c+=processFile(f,mod)}catch(e){console.error(`  ERR:${f}:${e.message}`)}});
  if(c>0){saveT(mod);console.log(`  ${mod}: ${c} replacements`);}
}

console.log(`\nFiles: ${filesFixed}, Replacements: ${totalReplaced}, Mode: ${dryRun?'DRY':'WRITE'}`);
