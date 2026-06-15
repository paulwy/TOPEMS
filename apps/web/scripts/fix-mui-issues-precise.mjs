import fs from 'fs';
import path from 'path';

const pagesDir = path.join(path.dirname(import.meta.url).replace('file://', ''), '../src/pages');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  const muiImportRegex = /import\s*\{([\s\S]*?)\}\s*from\s*["']@mui\/material["']/;
  const match = content.match(muiImportRegex);
  
  if (match) {
    const imports = match[1];
    if (imports.includes('Grid') && !content.includes('import { Grid } from "@/components/Grid"')) {
      let newImports = imports.replace(/\s*Grid\s*,?/g, '');
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
  
  content = content.replace(/InputLabelProps=\{(\{[^}]+\})\}/g, (match, props) => {
    changed = true;
    return `slotProps={{ inputLabel: ${props} }}`;
  });
  
  content = content.replace(/InputProps=\{(\{[^}]+\})\}/g, (match, props) => {
    changed = true;
    return `slotProps={{ input: ${props} }}`;
  });
  
  content = content.replace(/SelectProps=\{(\{[^}]+\})\}/g, (match, props) => {
    changed = true;
    return `slotProps={{ select: ${props} }}`;
  });
  
  const typoRegex = /<Typography([^>]+)>/g;
  content = content.replace(typoRegex, (match, props) => {
    const fontWeightMatch = props.match(/fontWeight=([^>\s]+)/);
    const colorMatch = props.match(/color="([^"]+)"/);
    const mtMatch = props.match(/mt=([^>\s]+)/);
    
    if (fontWeightMatch || colorMatch || mtMatch) {
      changed = true;
      let newProps = props;
      let sxParts = [];
      
      if (fontWeightMatch) {
        sxParts.push(`fontWeight: ${fontWeightMatch[1]}`);
        newProps = newProps.replace(/fontWeight=[^>\s]+\s*/, '');
      }
      if (colorMatch) {
        sxParts.push(`color: "${colorMatch[1]}"`);
        newProps = newProps.replace(/color="[^"]+"\s*/, '');
      }
      if (mtMatch) {
        sxParts.push(`mt: ${mtMatch[1]}`);
        newProps = newProps.replace(/mt=[^>\s]+\s*/, '');
      }
      
      if (sxParts.length > 0) {
        const existingSxMatch = newProps.match(/sx=\{([^}]+)\}/);
        if (existingSxMatch) {
          const existingSx = existingSxMatch[1];
          const newSx = `${existingSx}, ${sxParts.join(', ')}`;
          newProps = newProps.replace(/sx=\{[^}]+\}/, `sx={{${newSx}}}`);
        } else {
          newProps += ` sx={{${sxParts.join(', ')}}}`;
        }
      }
      
      return `<Typography${newProps}>`;
    }
    
    return match;
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
  }
}

function processFiles() {
  const files = fs.readdirSync(pagesDir).filter(file => file.endsWith('.tsx'));
  
  files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    fixFile(filePath);
  });
  
  console.log('\nProcessing complete!');
}

processFiles();