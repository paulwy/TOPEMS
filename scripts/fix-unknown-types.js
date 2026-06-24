const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'apps/web/src');

function getAllFiles(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('.next') && !filePath.includes('dist')) {
        results.push(...getAllFiles(filePath));
      }
    } else if (file.endsWith('.tsx')) {
      results.push(filePath);
    }
  });
  
  return results;
}

const files = getAllFiles(srcDir);
let filesChanged = 0;

files.forEach((fullPath) => {
  let content = fs.readFileSync(fullPath, 'utf-8');
  let changed = false;

  content = content.replace(
    /catch \(error: unknown\)\s*\{([^}]*?)error\?\.response\?\.status/g,
    (match) => {
      changed = true;
      return match.replace(
        /error\?\.response\?\.status/g,
        '(error as { response?: { status?: number } }).response?.status'
      );
    }
  );

  content = content.replace(
    /\.map\(\(item: unknown\) => \(\{/g,
    (match) => {
      changed = true;
      return match.replace('unknown', '{ [key: string]: unknown }');
    }
  );

  content = content.replace(
    /\.map\(\(item: unknown\)\s*=>\s*\(/g,
    (match) => {
      changed = true;
      return match.replace('unknown', '{ [key: string]: unknown }');
    }
  );

  content = content.replace(
    /\.map\(\(item: unknown\)\s*=>\s*\{/g,
    (match) => {
      changed = true;
      return match.replace('unknown', '{ [key: string]: unknown }');
    }
  );

  content = content.replace(
    /catch \(err: unknown\)\s*\{([^}]*?)err\.message/g,
    (match) => {
      changed = true;
      return match.replace(
        /err\.message/g,
        '(err as { message?: string }).message'
      );
    }
  );

  content = content.replace(
    /catch \(error: unknown\)\s*\{([^}]*?)error\.message/g,
    (match) => {
      changed = true;
      return match.replace(
        /error\.message/g,
        '(error as { message?: string }).message'
      );
    }
  );

  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    const relPath = fullPath.replace(srcDir + '/', '');
    console.log(`Updated ${relPath}`);
    filesChanged++;
  }
});

console.log(`\nDone! Updated ${filesChanged} files.`);
