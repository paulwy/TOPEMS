import fs from 'fs';
import path from 'path';

const pagesDir = path.join(path.dirname(import.meta.url).replace('file://', ''), '../src/pages');

function fixTypographyFontWeight(content) {
  let changed = false;
  
  const fontWeightRegex = /<Typography([^>]*)fontWeight="([^"]+)"/g;
  
  content = content.replace(fontWeightRegex, (match, props, fontWeight) => {
    changed = true;
    
    let hasSx = props.includes('sx=');
    
    if (hasSx) {
      content = content.replace(
        match,
        `<Typography${props.replace(/sx=\{([^}]*)\}/, (sxMatch, sxContent) => {
          return `sx={${sxContent.replace(/}$/, `, fontWeight: "${fontWeight}"}`)}}`;
        }).replace(`fontWeight="${fontWeight}"`, '')
      );
    } else {
      return `<Typography${props} sx={{ fontWeight: "${fontWeight}" }}`;
    }
    
    return match;
  });
  
  return { content, changed };
}

function processFiles() {
  const files = fs.readdirSync(pagesDir).filter(file => file.endsWith('.tsx'));
  
  files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, changed } = fixTypographyFontWeight(content);
    
    if (changed) {
      fs.writeFileSync(filePath, newContent);
      console.log(`Fixed Typography fontWeight in ${file}`);
    }
  });
  
  console.log('\nProcessing complete!');
}

processFiles();