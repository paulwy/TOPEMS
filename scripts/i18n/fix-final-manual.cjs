#!/usr/bin/env node
/**
 * V219 P2 Manual Fix: Handle the last ~195 remaining hardcoded Chinese lines.
 * More aggressive pattern matching than previous scripts.
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
  return rel.replace(/\.tsx$/,'').replace(/\//g,'_')
    .replace(/([a-z0-9])([A-Z])/g,'$1_$2').toLowerCase();
}

function genKey(mod, label, text) {
  const prefix = `${mod}.${label}`;
  if (!keyCounters[prefix]) keyCounters[prefix]=0;
  keyCounters[prefix]++;
  for (const [k,v] of Object.entries(translations[mod]||{}))
    if (v.zh===text) return k;
  return `${prefix}.m${keyCounters[prefix]}`;
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

function processFile(filePath, mod) {
  let lines = fs.readFileSync(filePath,'utf8').split('\n');
  let modified=false, count=0;
  const label = fileLabel(filePath, mod);
  loadT(mod);

  // Also ensure useTranslation is called in components that use t()
  // We'll add it at the start of component bodies if missing

  for (let i=0; i<lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//')||trimmed.startsWith('*')||trimmed.startsWith('/*')||trimmed.startsWith('{/*')) continue;
    if (/^import\s/.test(trimmed)) continue;
    if (trimmed==='') continue;

    // Check for untranslated Chinese
    let cleaned = line.replace(/i18n\.t\s*\([^)]*\)/g,'').replace(/\bt\s*\(\s*['"`][^)]*\)/g,'');
    if (!CJK.test(cleaned)) continue;

    // Skip Chinese property names (report.归属于母公司净利润)
    if (/\.归属于母公司净利润/.test(line)) continue;

    let replaced = false;

    // 1. placeholder='中文' (including mixed: '如: workflow_approval' has no CJK, skip)
    // Match: placeholder='...中文...'
    let m = line.match(/placeholder=(['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\1/);
    if (m && !line.includes('i18n.t(') && !line.includes('{t(')) {
      const text = m[2];
      const key = genKey(mod,label,text);
      addT(mod,key,text);
      lines[i] = line.replace(m[0], `placeholder={t('${key}')}`);
      modified=true; count++; replaced=true; line=lines[i];
      if (verbose) console.log(`  [ph] ${mod}/${label}:${i+1}`);
    }

    // 2. label='中文'
    if (!replaced) {
      m = line.match(/\blabel=(['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\1/);
      if (m && !line.includes('i18n.t(') && !line.includes('{t(')) {
        const text = m[2];
        const key = genKey(mod,label,text);
        addT(mod,key,text);
        lines[i] = line.replace(m[0], `label={t('${key}')}`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [label] ${mod}/${label}:${i+1} "${text.substring(0,20)}"`);
      }
    }

    // 3. title='中文'
    if (!replaced) {
      m = line.match(/\btitle=(['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\1/);
      if (m && !line.includes('i18n.t(') && !line.includes('{t(')) {
        const text = m[2];
        const key = genKey(mod,label,text);
        addT(mod,key,text);
        lines[i] = line.replace(m[0], `title={t('${key}')}`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [title] ${mod}/${label}:${i+1} "${text.substring(0,20)}"`);
      }
    }

    // 4. helperText='中文'
    if (!replaced) {
      m = line.match(/helperText=(['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\1/);
      if (m && !line.includes('i18n.t(')) {
        const text = m[2];
        const key = genKey(mod,label,text);
        addT(mod,key,text);
        lines[i] = line.replace(m[0], `helperText={t('${key}')}`);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }

    // 5. {cond ? '中文...' : t('key')}
    if (!replaced) {
      m = line.match(/\?\s*['"]([^'"]*[\u4e00-\u9fff][^'"]*)['"]\s*:/);
      if (m && !line.includes('i18n.t(')) {
        const text = m[1];
        const key = genKey(mod,label,text);
        addT(mod,key,text);
        // Check if in JSX or module level
        const useI18n = !line.includes('{') || /message:|error:|warning:/.test(line.substring(0,line.indexOf(m[0])));
        const prefix = useI18n ? 'i18n.' : '';
        lines[i] = line.replace(m[0], `? ${prefix}t('${key}') :`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [ternary] ${mod}/${label}:${i+1} "${text.substring(0,15)}"`);
      }
    }

    // 6. apiLogger.error('中文')
    if (!replaced) {
      m = line.match(/apiLogger\.error\((['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\1/);
      if (m) {
        const text = m[2];
        const key = genKey(mod,label,text);
        addT(mod,key,text);
        lines[i] = line.replace(m[0], `apiLogger.error(i18n.t('${key}')`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [apiLog] ${mod}/${label}:${i+1}`);
      }
    }

    // 7. throw new Error('中文')
    if (!replaced) {
      m = line.match(/throw new Error\((['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\1/);
      if (m) {
        const text = m[2];
        const key = genKey(mod,label,text);
        addT(mod,key,text);
        lines[i] = line.replace(m[0], `throw new Error(i18n.t('${key}')`);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }

    // 8. message: '中文'
    if (!replaced) {
      m = line.match(/message:\s*(['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\1/);
      if (m && !line.includes('i18n.t(')) {
        const text = m[2];
        const key = genKey(mod,label,text);
        addT(mod,key,text);
        lines[i] = line.replace(m[0], `message: i18n.t('${key}')`);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }

    // 9. Chart data: { name: '中文', value: N }
    if (!replaced) {
      m = line.match(/(\s+)name:\s*(['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\2/);
      if (m && (line.includes('value:')||line.includes('value :')) && !line.includes('i18n.t(')) {
        const text = m[3];
        const key = genKey(mod,label,text);
        addT(mod,key,text);
        lines[i] = line.replace(m[0], `${m[1]}name: i18n.t('${key}')`);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }

    // 10. source: '中文' / target: '中文'
    if (!replaced) {
      m = line.match(/(\s+)(source|target):\s*(['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\3/);
      if (m && !line.includes('i18n.t(')) {
        const field = m[2], text = m[4];
        const key = genKey(mod,label,text);
        addT(mod,key,text);
        lines[i] = line.replace(m[0], `${m[1]}${field}: i18n.t('${key}')`);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }

    // 11. name: '中文' / title: '中文' (in data objects, not JSX attributes)
    if (!replaced) {
      m = line.match(/(\s+)(name|title|description|changeLabel):\s*(['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\3/);
      if (m && !line.includes('i18n.t(') && !line.includes('={t(') && !line.includes('label=')) {
        const field = m[2], text = m[4];
        const key = genKey(mod,label,text);
        addT(mod,key,text);
        lines[i] = line.replace(m[0], `${m[1]}${field}: i18n.t('${key}')`);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }

    // 12. <InputLabel ...>中文</InputLabel>
    if (!replaced) {
      m = line.match(/<InputLabel([^>]*)>([\u4e00-\u9fff\u3400-\u4dbf][^<]*?)<\/InputLabel>/);
      if (m && !line.includes('i18n.t(')) {
        const attrs=m[1], text=m[2].trim();
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=line.replace(m[0],`<InputLabel${attrs}>{t('${key}')}</InputLabel>`);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }

    // 13. <DialogTitle>中文</DialogTitle>
    if (!replaced) {
      m = line.match(/<DialogTitle>([\u4e00-\u9fff][^<]*?)<\/DialogTitle>/);
      if (m && !line.includes('i18n.t(') && !line.includes('{t(')) {
        const text=m[1].trim();
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=line.replace(m[0],`<DialogTitle>{t('${key}')}</DialogTitle>`);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }

    // 14. <TableCell>中文</TableCell>
    if (!replaced) {
      m = line.match(/<TableCell([^>]*)>([\u4e00-\u9fff][^<]*?)<\/TableCell>/);
      if (m && !line.includes('i18n.t(')) {
        const attrs=m[1]||'', text=m[2].trim();
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=line.replace(m[0],`<TableCell${attrs}>{t('${key}')}</TableCell>`);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }

    // 15. <MenuItem value='X'>中文</MenuItem>
    if (!replaced) {
      m = line.match(/<MenuItem\s+value=(['"])([^'"]*)\1>([\u4e00-\u9fff][^<]*?)<\/MenuItem>/);
      if (m && !line.includes('i18n.t(')) {
        const val=m[2], text=m[3].trim();
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=line.replace(m[0],`<MenuItem value='${val}'>{t('${key}')}</MenuItem>`);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }

    // 16. <Typography ...>中文</Typography> (simple, no expression)
    if (!replaced) {
      m = line.match(/<Typography([^>]*)>([\u4e00-\u9fff][^<{}]*?)<\/Typography>/);
      if (m && !line.includes('i18n.t(') && !line.includes('{t(')) {
        const attrs=m[1]||'', text=m[2].trim();
        if (text && CJK.test(text)) {
          const key=genKey(mod,label,text);
          addT(mod,key,text);
          lines[i]=line.replace(m[0],`<Typography${attrs}>{t('${key}')}</Typography>`);
          modified=true; count++; replaced=true; line=lines[i];
        }
      }
    }

    // 17. <Typography ...>中文{expr}后缀</Typography>
    if (!replaced) {
      m = line.match(/<Typography([^>]*)>([\u4e00-\u9fff][^<]*?)\{([^}]+)\}([^<]*?)<\/Typography>/);
      if (m && !line.includes('i18n.t(')) {
        const attrs=m[1]||'', before=m[2], expr=m[3], after=m[4]||'';
        const fullText=(before+'{{v1}}'+after).trim();
        const key=genKey(mod,label,fullText);
        addT(mod,key,fullText);
        lines[i]=line.replace(m[0],`<Typography${attrs}>{t('${key}', { v1: ${expr} })}</Typography>`);
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [typ-expr] ${mod}/${label}:${i+1}`);
      }
    }

    // 18. breadcrumbs: [{ label: '中文' }, ...]
    if (!replaced) {
      m = line.match(/label:\s*(['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\1/);
      if (m && line.includes('breadcrumb') && !line.includes('i18n.t(')) {
        const text=m[2];
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=line.replace(m[0],`label: i18n.t('${key}')`);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }

    // 19. label: '中文' in data (not breadcrumbs, not JSX attr)
    if (!replaced) {
      m = line.match(/(\s+)label:\s*(['"])((?:[^'"]*[\u4e00-\u9fff][^'"]*?))\2/);
      if (m && !line.includes('i18n.t(') && !line.includes('breadcrumb')) {
        const text=m[3];
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=line.replace(m[0],`${m[1]}label: i18n.t('${key}')`);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }

    // 20. Chinese object keys in export (映射名称: value)
    // Replace Chinese key with English equivalent + i18n for display
    if (!replaced) {
      m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w]*):\s+/);
      if (m && !line.includes('const') && !line.includes('let') && !line.includes('function') && !line.includes('//')) {
        const zhKey = m[2];
        // Map common Chinese keys to English
        const keyMap = {
          '映射名称': 'mapping_name', '映射类型': 'mapping_type',
          '源表': 'source_table', '目标表': 'target_table',
          '状态': 'status', '字段数': 'field_count',
          '最后同步': 'last_sync', '描述': 'description',
        };
        const enKey = keyMap[zhKey];
        if (enKey) {
          const key = genKey(mod,label,zhKey);
          addT(mod,key,zhKey);
          // Replace: 映射名称: m.name -> mapping_name: i18n.t('key') || m.name
          // Actually, keep the value but change the key to English
          lines[i] = line.replace(m[0], `${m[1]}${enKey}: `);
          // Add comment for reference
          // lines[i] = `${m[1]}// ${zhKey}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [objkey] ${mod}/${label}:${i+1} ${zhKey}->${enKey}`);
        }
      }
    }

    // 21. Bare Chinese text (in JSX, not in quotes/braces)
    if (!replaced) {
      m = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-…·]*?)(\s*)$/);
      if (m && !line.includes('=') && !line.includes('(') && !line.includes('`') && !line.includes('{') && !line.includes('const') && !line.includes('let') && !line.includes('return') && !line.includes('if') && !line.includes('//')) {
        const indent=m[1], text=m[2].trim();
        if (text && CJK.test(text) && text.length>1) {
          const key=genKey(mod,label,text);
          addT(mod,key,text);
          lines[i]=`${indent}{t('${key}')}${m[3]}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [bare] ${mod}/${label}:${i+1} "${text.substring(0,20)}"`);
        }
      }
    }

    // 22. JSX text: >中文{expr}</  (inside JSX tags)
    if (!replaced) {
      m = line.match(/(>\s*)([\u4e00-\u9fff][^<{}]*?)\s*(\{[^}]+\})\s*(\s*<\/)/);
      if (m && !line.includes('i18n.t(')) {
        const before=m[2], expr=m[3], after=m[4]||'';
        const fullText=(before+' {{v1}}').trim();
        const key=genKey(mod,label,fullText);
        addT(mod,key,fullText);
        lines[i]=line.replace(m[0],`${m[1]}{t('${key}', { v1: ${expr.replace(/[{}]/g,'')} })}${m[4]}`);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }

    // 23. JSX text: >{expr}中文</
    if (!replaced) {
      m = line.match(/(>\s*)(\{[^}]+\})\s*([\u4e00-\u9fff][^<{}]*?)(\s*<\/)/);
      if (m && !line.includes('i18n.t(')) {
        const expr=m[2], text=m[3];
        const fullText=('{{v1}} '+text).trim();
        const key=genKey(mod,label,fullText);
        addT(mod,key,fullText);
        lines[i]=line.replace(m[0],`${m[1]}{t('${key}', { v1: ${expr.replace(/[{}]/g,'')} })}${m[4]}`);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }

    // 24. <Cloud size={20} /> 中文
    if (!replaced) {
      m = line.match(/(<Cloud[^/]*\/>)\s*([\u4e00-\u9fff][\u4e00-\u9fff\w\s\-/()]*)/);
      if (m && !line.includes('i18n.t(')) {
        const cloud=m[1], text=m[2].trim();
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=line.replace(m[0],`${cloud} {t('${key}')}`);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }

    // 25. 🔗 中文
    if (!replaced) {
      m = line.match(/(🔗\s*)([\u4e00-\u9fff][\u4e00-\u9fff\w\s\-（）()]*)/);
      if (m && !line.includes('i18n.t(')) {
        const emoji=m[1], text=m[2].trim();
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=line.replace(m[0],`${emoji}{t('${key}')}`);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }

    // 26. message: `中文${cond ? i18n.t('k1') : i18n.t('k2')}`
    if (!replaced) {
      m = line.match(/message:\s*`([^`]*[\u4e00-\u9fff][^`]*)`/);
      if (m && !line.includes('i18n.t(')) {
        const inner=m[1];
        // Extract variables and translated parts
        const varRe=/\$\{([^}]+)\}/g;
        let vm, vi=0;
        const interp=[];
        let transText=inner;
        while((vm=varRe.exec(inner))!==null){
          interp.push({name:`v${vi+1}`,expr:vm[1]});
          transText=transText.replace(vm[0],`{{v${vi+1}}}`);
          vi++;
        }
        const key=genKey(mod,label,transText.trim());
        addT(mod,key,transText.trim());
        const ps=interp.length>0?`, { ${interp.map(p=>`${p.name}: ${p.expr}`).join(', ')} }`:'';
        lines[i]=line.replace(m[0],`message: i18n.t('${key}'${ps})`);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }

    // 27. {expr}中文 (bare text with expression prefix)
    if (!replaced) {
      m = line.match(/^(\s*)\{([^}]+)\}\s*([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-…]*?)(\s*)$/);
      if (m && !line.includes('i18n.t(') && !line.includes('=')) {
        const indent=m[1], expr=m[2], text=m[3].trim();
        const fullText=`{{v1}} ${text}`;
        const key=genKey(mod,label,fullText);
        addT(mod,key,fullText);
        lines[i]=`${indent}{t('${key}', { v1: ${expr} })}${m[4]}`;
        modified=true; count++; replaced=true; line=lines[i];
        if (verbose) console.log(`  [expr-prefix] ${mod}/${label}:${i+1}`);
      }
    }

    // 28. 请在 URL... (bare text with mixed content)
    if (!replaced) {
      m = line.match(/^(\s*)([\u4e00-\u9fff][\u4e00-\u9fff\w\s?=.&_：，。、（）()·\-…]*?)(\s*)$/);
      if (m && !line.includes('=') && !line.includes('const') && !line.includes('let') && !line.includes('return') && !line.includes('if') && !line.includes('//') && !line.includes('(') && !line.includes('{') && !line.includes('`')) {
        const indent=m[1], text=m[2].trim();
        if (text && CJK.test(text) && text.length>1) {
          const key=genKey(mod,label,text);
          addT(mod,key,text);
          lines[i]=`${indent}{t('${key}')}${m[3]}`;
          modified=true; count++; replaced=true; line=lines[i];
          if (verbose) console.log(`  [bare2] ${mod}/${label}:${i+1} "${text.substring(0,20)}"`);
        }
      }
    }

    // 29. <strong>中文:</strong> text
    if (!replaced) {
      m = line.match(/<strong>([\u4e00-\u9fff][^<]*?)<\/strong>\s*/);
      if (m && !line.includes('i18n.t(')) {
        const text=m[1].trim();
        const key=genKey(mod,label,text);
        addT(mod,key,text);
        lines[i]=line.replace(m[0],`<strong>{t('${key}')}</strong> `);
        modified=true; count++; replaced=true; line=lines[i];
      }
    }
  }

  // Ensure imports
  if (modified) {
    const impChanged = ensureImports(lines);
    if (impChanged) count++;
  }

  if (modified) {
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

console.log(`\n=== V219 P2 Manual Fix ===`);
console.log(`Mode: ${dryRun?'DRY RUN':'WRITE'}\n`);

for(const mod of P2){
  const dir=path.join(PAGES_DIR,mod);
  if(!fs.existsSync(dir))continue;
  keyCounters={};
  loadT(mod);
  let c=0;
  console.log(`Processing ${mod}...`);
  walk(dir,'.tsx',(f)=>{try{c+=processFile(f,mod)}catch(e){console.error(`  ERR:${f}:${e.message}`)}});
  if(c>0){saveT(mod);console.log(`  ${mod}: ${c} replacements`);}
}

console.log(`\nFiles: ${filesFixed}, Replacements: ${totalReplaced}, Mode: ${dryRun?'DRY':'WRITE'}`);
