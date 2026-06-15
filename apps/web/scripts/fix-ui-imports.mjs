import fs from 'fs';
import path from 'path';

const pagesDir = path.join(path.dirname(import.meta.url).replace('file://', ''), '../src/pages');

const importMappings = {
  '../components/ui/button': 'Button from "@mui/material/Button"',
  '../components/ui/skeleton': 'Skeleton from "@mui/material/Skeleton"',
  '../components/ui/card': '{ Card, CardContent, CardHeader } from "@mui/material"',
  '../components/ui/input': 'TextField from "@mui/material/TextField"',
  '../components/ui/badge': 'Badge from "@mui/material/Badge"',
  '../components/ui/progress': 'LinearProgress from "@mui/material/LinearProgress"',
  '../components/ui/tabs': '{ Tabs, Tab, Box } from "@mui/material"',
  '../components/ui/table': '{ Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material"',
  '../components/ui/dialog': '{ Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@mui/material"',
  '../components/ui/checkbox': 'Checkbox from "@mui/material/Checkbox"',
  '../components/ui/label': 'FormControlLabel from "@mui/material/FormControlLabel"',
};

function fixImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (const [oldImport, newImport] of Object.entries(importMappings)) {
    const regex = new RegExp(`import\\s+\\{[^}]+\\}\\s+from\\s+["']${oldImport}["']`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, `import ${newImport}`);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed imports in ${path.basename(filePath)}`);
  }
}

function processFiles() {
  const files = fs.readdirSync(pagesDir).filter(file => file.endsWith('.tsx'));
  
  files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    fixImports(filePath);
  });
  
  console.log('\nProcessing complete!');
}

processFiles();