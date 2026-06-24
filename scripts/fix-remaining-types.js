const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'apps/web/src');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  content = content.replace(
    /catch \(error: unknown\)\s*\{([^}]*?)error\.message/g,
    (match) => {
      changed = true;
      return match.replace(/error\.message/g, '(error as { message?: string }).message');
    }
  );

  content = content.replace(
    /const handleSubmit = async \(data: unknown\) => \{/g,
    (match) => {
      changed = true;
      return match.replace('data: unknown', 'data: Record<string, unknown>');
    }
  );

  content = content.replace(
    /data\.name/g,
    (match) => {
      const context = content.substring(content.indexOf(match) - 50, content.indexOf(match));
      if (context.includes('handleSubmit')) {
        changed = true;
        return '(data.name as string)';
      }
      return match;
    }
  );

  content = content.replace(
    /parseFloat\(value\)/g,
    (match) => {
      changed = true;
      return 'parseFloat(value as string)';
    }
  );

  content = content.replace(
    /value\.toString\(\)/g,
    (match) => {
      changed = true;
      return '(value as string)';
    }
  );

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    const relPath = filePath.replace(srcDir + '/', '');
    console.log(`Updated ${relPath}`);
    return true;
  }
  return false;
}

const filesToFix = [
  'pages/integration/ExternalErpConnectionsPage.tsx',
  'pages/integration/IntegrationLimsQmsPage.tsx',
  'pages/integration/IntegrationMesErpPage.tsx',
  'pages/integration/IntegrationWmsScmPage.tsx',
  'store/pluginStore.ts',
  'utils/validation.ts',
];

let filesChanged = 0;
filesToFix.forEach((file) => {
  const fullPath = path.join(srcDir, file);
  if (fs.existsSync(fullPath)) {
    if (fixFile(fullPath)) {
      filesChanged++;
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});

console.log(`\nDone! Updated ${filesChanged} files.`);
