#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || './src';

function fixGridApi(content) {
  // Fix Grid item with responsive props
  // Pattern: <Grid item xs={12} sm={6} md={4}>
  // Becomes: <Grid size={{ xs: 12, sm: 6, md: 4 }}>

  // Match Grid with item prop and responsive sizes
  const gridItemPattern = /<Grid\s+([^>]*?)item\s*=\s*\{?\s*true\s*\}?([^>]*?)(xs|sm|md|lg|xl)=\{(\d+)\}([^>]*?)>/g;

  // Simpler approach: find all Grid with item prop
  let result = content;

  // Remove item={true} or item
  result = result.replace(/<Grid\s+([^>]*?)\bitem\b\s*=\s*\{\s*true\s*\}([^>]*?)>/g, '<Grid $1$2>');
  result = result.replace(/<Grid\s+([^>]*?)\bitem\b([^>]*?)>/g, (match, before, after) => {
    // Check if there's already something before 'item'
    if (before.trim() && !before.trim().endsWith(' ')) {
      return `<Grid ${before} ${after}>`;
    }
    return `<Grid ${before}${after}>`;
  });

  // Collect responsive props and convert to size object
  const gridMatches = result.matchAll(/<Grid\s+([^>]*?)>/g);
  const replacements = [];

  for (const match of gridMatches) {
    const fullMatch = match[0];
    const props = match[1];

    // Check if has responsive props
    const sizeProps = {};
    const propPattern = /\b(xs|sm|md|lg|xl)\s*=\s*\{?\s*(\d+)\s*\}?/g;
    let propMatch;
    let hasSizeProps = false;

    while ((propMatch = propPattern.exec(props)) !== null) {
      sizeProps[propMatch[1]] = parseInt(propMatch[2]);
      hasSizeProps = true;
    }

    if (hasSizeProps) {
      // Remove old props and add size object
      let newProps = props;
      for (const [key, value] of Object.entries(sizeProps)) {
        newProps = newProps.replace(new RegExp(`\\b${key}\\s*=\\s*\\{?\\s*${value}\\s*\\}?`), '');
      }

      // Clean up multiple spaces
      newProps = newProps.replace(/\s+/g, ' ').trim();

      // Build size object
      const sizeEntries = Object.entries(sizeProps);
      let sizeStr;
      if (sizeEntries.length === 1) {
        sizeStr = `size={${sizeEntries[0][1]}}`;
      } else {
        const sizeObj = sizeEntries.map(([k, v]) => `${k}: ${v}`).join(', ');
        sizeStr = `size={{ ${sizeObj} }}`;
      }

      const newGrid = `<Grid ${newProps} ${sizeStr}>`.replace(/\s+/g, ' ').replace('> ', '>');
      replacements.push({ old: fullMatch, new: newGrid });
    }
  }

  // Apply replacements
  for (const { old, new: newVal } of replacements) {
    result = result.replace(old, newVal);
  }

  return result;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const newContent = fixGridApi(content);

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`Fixed: ${filePath}`);
      return 1;
    }
    return 0;
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message);
    return 0;
  }
}

function walkDir(dir) {
  let fixedCount = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
        fixedCount += walkDir(fullPath);
      }
    } else if (entry.isFile() && /\.(tsx|jsx)$/.test(entry.name)) {
      fixedCount += processFile(fullPath);
    }
  }

  return fixedCount;
}

const fixedCount = walkDir(targetDir);
console.log(`\nTotal files fixed: ${fixedCount}`);
