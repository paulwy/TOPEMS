import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const lowcodeDir = path.join(__dirname, '..', 'src', 'lowcode');
const componentsDir = path.join(__dirname, '..', 'src', 'components', 'lowcode');
const pagesDir = path.join(__dirname, '..', 'src', 'pages', 'lowcode');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // Fix 1: Typography fontWeight={N} -> sx={{ fontWeight: N }}
  // But be careful not to break sx={{ fontWeight: N }}
  const fontWeightRegex = /<Typography([^>]*?)\s+fontWeight=\{([^}]+)\}/g;
  if (fontWeightRegex.test(content)) {
    content = content.replace(/<Typography([^>]*?)\s+fontWeight=\{([^}]+)\}/g, (match, before, weight) => {
      // Check if there's already an sx prop
      if (before.includes('sx=')) {
        // Add fontWeight to existing sx
        return match.replace(/fontWeight=\{[^}]+\}/, '').replace(/sx=\{/, `sx={{ fontWeight: ${weight}, `);
      } else {
        // Add new sx prop
        return `<Typography${before} sx={{ fontWeight: ${weight} }}`;
      }
    });
    changed = true;
    console.log(`  Fixed fontWeight in ${path.basename(filePath)}`);
  }

  // Fix 2: Grid item={true} xs={N} md={N} -> size={{ xs: N, md: N }}
  // This is more complex, let's handle simple cases
  const gridItemRegex = /<Grid\s+item(?:=\{?true\}?)?([^>]*?)>/g;
  if (gridItemRegex.test(content)) {
    content = content.replace(/<Grid\s+item(?:=\{?true\}?)?([^>]*?)>/g, (match, rest) => {
      const sizeProps = [];
      let newRest = rest;
      
      // Extract xs, sm, md, lg, xl
      ['xs', 'sm', 'md', 'lg', 'xl'].forEach(size => {
        const regex = new RegExp(`\\s+${size}=\\{?([^}\\s]+)\\}?`, 'g');
        const match = rest.match(regex);
        if (match) {
          const val = match[0].match(/=\{?([^}\s]+)\}?/)[1];
          sizeProps.push(`${size}: ${val}`);
          newRest = newRest.replace(regex, '');
        }
      });

      if (sizeProps.length > 0) {
        return `<Grid size={{ ${sizeProps.join(', ')} }}${newRest}>`;
      }
      return `<Grid${newRest}>`;
    });
    changed = true;
    console.log(`  Fixed Grid item/size in ${path.basename(filePath)}`);
  }

  // Fix 3: Stack alignItems=... justifyContent=... -> move to sx
  const stackAlignRegex = /<Stack([^>]*?)\s+(alignItems|justifyContent|direction|spacing)=/g;
  if (stackAlignRegex.test(content)) {
    // Let's be more careful here - check if these are direct props vs in sx
    // For now, skip this as it's more complex
  }

  // Fix 4: TextField InputProps -> slotProps
  const inputPropsRegex = /InputProps=\{/g;
  if (inputPropsRegex.test(content)) {
    content = content.replace(/InputProps=\{/g, 'slotProps={{ input: ');
    // Need to close the extra bracket - this is tricky, let's skip for now
    changed = false; // revert since we can't easily fix closing brackets
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDir(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fixFile(filePath);
    }
  });
}

console.log('Fixing MUI v9 API issues...');
console.log('Processing components/lowcode...');
processDir(componentsDir);
console.log('Processing pages/lowcode...');
processDir(pagesDir);
console.log('Done!');
