import fs from 'fs';
import path from 'path';

const pagesDir = path.join(path.dirname(import.meta.url).replace('file://', ''), '../src/pages');

function findMatchingBrace(str, startIndex) {
  let depth = 1;
  let i = startIndex;
  
  while (i < str.length && depth > 0) {
    i++;
    if (str[i] === '{') depth++;
    if (str[i] === '}') depth--;
  }
  
  return i;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  const muiImportRegex = /import\s*\{([\s\S]*?)\}\s*from\s*["']@mui\/material["']/;
  const match = content.match(muiImportRegex);
  
  if (match) {
    const imports = match[1];
    if (imports.includes('Grid') && !content.includes('import { Grid } from "@/components/Grid"')) {
      let newImports = imports.replace(/(^|,)\s*Grid\s*(,|$)/g, (match, prefix, suffix) => {
        if (prefix === '' && suffix === '') return '';
        if (prefix === '' && suffix === ',') return '';
        if (prefix === ',' && suffix === '') return '';
        return ',';
      });
      newImports = newImports.replace(/,\s*,/g, ',').trim();
      if (newImports.startsWith(',')) newImports = newImports.substring(1).trim();
      if (newImports.endsWith(',')) newImports = newImports.substring(0, newImports.length - 1).trim();
      
      if (newImports) {
        content = content.replace(muiImportRegex, `import { ${newImports} } from "@mui/material"`);
      } else {
        content = content.replace(/import\s*\{[\s\S]*?\}\s*from\s*["']@mui\/material["']\n?/, '');
      }
      
      content = `import { Grid } from "@/components/Grid";\n${content}`;
      changed = true;
      console.log(`Added Grid import to ${path.basename(filePath)}`);
    }
  }
  
  let inputPropsIndex = content.indexOf('InputProps={');
  while (inputPropsIndex !== -1) {
    const outerOpenBrace = inputPropsIndex + 'InputProps='.length;
    const outerCloseBrace = findMatchingBrace(content, outerOpenBrace);
    
    if (outerCloseBrace > outerOpenBrace) {
      const innerStart = outerOpenBrace + 1;
      const innerEnd = outerCloseBrace;
      const innerContent = content.substring(innerStart, innerEnd);
      
      const replacement = `slotProps={{ input: ${innerContent} }}`;
      content = content.substring(0, inputPropsIndex) + replacement + content.substring(outerCloseBrace + 1);
      changed = true;
    }
    
    inputPropsIndex = content.indexOf('InputProps={', inputPropsIndex + 1);
  }
  
  let inputLabelPropsIndex = content.indexOf('InputLabelProps={');
  while (inputLabelPropsIndex !== -1) {
    const outerOpenBrace = inputLabelPropsIndex + 'InputLabelProps='.length;
    const outerCloseBrace = findMatchingBrace(content, outerOpenBrace);
    
    if (outerCloseBrace > outerOpenBrace) {
      const innerStart = outerOpenBrace + 1;
      const innerEnd = outerCloseBrace;
      const innerContent = content.substring(innerStart, innerEnd);
      
      const replacement = `slotProps={{ inputLabel: ${innerContent} }}`;
      content = content.substring(0, inputLabelPropsIndex) + replacement + content.substring(outerCloseBrace + 1);
      changed = true;
    }
    
    inputLabelPropsIndex = content.indexOf('InputLabelProps={', inputLabelPropsIndex + 1);
  }
  
  let selectPropsIndex = content.indexOf('SelectProps={');
  while (selectPropsIndex !== -1) {
    const outerOpenBrace = selectPropsIndex + 'SelectProps='.length;
    const outerCloseBrace = findMatchingBrace(content, outerOpenBrace);
    
    if (outerCloseBrace > outerOpenBrace) {
      const innerStart = outerOpenBrace + 1;
      const innerEnd = outerCloseBrace;
      const innerContent = content.substring(innerStart, innerEnd);
      
      const replacement = `slotProps={{ select: ${innerContent} }}`;
      content = content.substring(0, selectPropsIndex) + replacement + content.substring(outerCloseBrace + 1);
      changed = true;
    }
    
    selectPropsIndex = content.indexOf('SelectProps={', selectPropsIndex + 1);
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
  }
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      fixFile(fullPath);
    }
  }
}

function processFiles() {
  processDirectory(pagesDir);
  console.log('\nProcessing complete!');
}

processFiles();