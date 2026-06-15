import fs from 'fs';
import path from 'path';

const pagesDir = path.join(path.dirname(import.meta.url).replace('file://', ''), '../src/pages');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  content = content.replace(/import \{ Button \} from "\.\.\/components\/ui\/button"/g, () => {
    changed = true;
    return 'import Button from "@mui/material/Button"';
  });
  
  content = content.replace(/import \{ Skeleton \} from "\.\.\/components\/ui\/skeleton"/g, () => {
    changed = true;
    return 'import Skeleton from "@mui/material/Skeleton"';
  });
  
  content = content.replace(/import \{ CardTitle \} from "\.\.\/components\/ui\/card"/g, () => {
    changed = true;
    return '';
  });
  
  content = content.replace(/import \{ Card, CardContent, CardHeader \} from "\.\.\/components\/ui\/card"/g, () => {
    changed = true;
    return 'import { Card, CardContent, CardHeader } from "@mui/material"';
  });
  
  content = content.replace(/import \{ Card, CardContent, CardHeader, CardTitle \} from "\.\.\/components\/ui\/card"/g, () => {
    changed = true;
    return 'import { Card, CardContent, CardHeader, Typography } from "@mui/material"';
  });
  
  content = content.replace(/import \{ Checkbox \} from "\.\.\/components\/ui\/checkbox"/g, () => {
    changed = true;
    return 'import Checkbox from "@mui/material/Checkbox"';
  });
  
  content = content.replace(/import \{ Label \} from "\.\.\/components\/ui\/label"/g, () => {
    changed = true;
    return 'import FormControlLabel from "@mui/material/FormControlLabel"';
  });
  
  content = content.replace(/import \{ Tabs, TabsContent, TabsList, TabsTrigger \} from "\.\.\/components\/ui\/tabs"/g, () => {
    changed = true;
    return 'import { Tabs, Tab, Box } from "@mui/material"';
  });
  
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
  
  content = content.replace(/<Typography ([^>]*) fontWeight="bold"/g, (match, props) => {
    changed = true;
    return `<Typography ${props} sx={{ fontWeight: "bold" }}`;
  });
  
  content = content.replace(/<Typography ([^>]*) fontWeight="medium"/g, (match, props) => {
    changed = true;
    return `<Typography ${props} sx={{ fontWeight: "medium" }}`;
  });
  
  content = content.replace(/<Stack ([^>]*) alignItems="center"/g, (match, props) => {
    changed = true;
    return `<Stack ${props} sx={{ alignItems: "center" }}`;
  });
  
  content = content.replace(/<CardTitle>([^<]+)<\/CardTitle>/g, (match, title) => {
    changed = true;
    return `<Typography variant="h6" sx={{ fontWeight: "bold" }}>${title}</Typography>`;
  });
  
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
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${path.basename(filePath)}`);
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