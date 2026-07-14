import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const chalk = await import('chalk').then(m => m.default);
const fs = require('fs');
const path = require('path');

const distDir = join(__dirname, '../dist');

function analyzeBundle() {
  console.log(chalk.blue('=== Bundle Analysis Report ===\n'));

  if (!fs.existsSync(distDir)) {
    console.log(chalk.yellow('dist directory not found. Please run "npm run build" first.'));
    console.log(chalk.yellow('Running build now...'));
    
    const { execSync } = require('child_process');
    try {
      execSync('npm run build', { cwd: join(__dirname, '..'), stdio: 'inherit' });
    } catch (error) {
      console.log(chalk.red('Build failed. Exiting.'));
      process.exit(1);
    }
  }

  const files = fs.readdirSync(distDir).filter(f => f.endsWith('.js') && !f.includes('.map'));
  
  let totalSize = 0;
  const fileSizes = [];

  files.forEach(file => {
    const filePath = path.join(distDir, file);
    const stats = fs.statSync(filePath);
    const sizeKb = (stats.size / 1024).toFixed(2);
    totalSize += stats.size;
    fileSizes.push({ name: file, size: stats.size, sizeKb });
  });

  fileSizes.sort((a, b) => b.size - a.size);

  console.log(chalk.green('Total Bundle Size:'), chalk.bold(`${(totalSize / 1024).toFixed(2)} KB (${(totalSize / 1024 / 1024).toFixed(2)} MB)`));
  console.log('');
  console.log(chalk.green('Top 10 Largest Files:'));
  console.log('─────────────────────────────────────────────────────────────');
  
  fileSizes.slice(0, 10).forEach((file, index) => {
    const percentage = ((file.size / totalSize) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round((file.size / totalSize) * 30));
    console.log(`${index + 1}. ${file.name}`);
    console.log(`   ${file.sizeKb} KB (${percentage}%) ${bar}`);
  });

  console.log('');
  console.log(chalk.green('File Distribution:'));
  console.log('─────────────────────────────────────────────────────────────');
  
  const categories = {
    vendor: 0,
    app: 0,
    chunks: 0,
    other: 0
  };

  fileSizes.forEach(file => {
    if (file.name.includes('vendor') || file.name.includes('node_modules')) {
      categories.vendor += file.size;
    } else if (file.name.includes('index') || file.name.includes('main')) {
      categories.app += file.size;
    } else if (file.name.includes('chunk')) {
      categories.chunks += file.size;
    } else {
      categories.other += file.size;
    }
  });

  Object.entries(categories).forEach(([category, size]) => {
    const percentage = ((size / totalSize) * 100).toFixed(1);
    console.log(`${chalk.cyan(category)}: ${(size / 1024).toFixed(2)} KB (${percentage}%)`);
  });

  console.log('');
  console.log(chalk.green('Optimization Suggestions:'));
  console.log('─────────────────────────────────────────────────────────────');
  
  if (categories.vendor / 1024 > 500) {
    console.log(chalk.yellow('✓ Vendor bundle is large. Consider code splitting for large dependencies.'));
  }
  
  if (categories.app / 1024 > 300) {
    console.log(chalk.yellow('✓ Main app bundle is large. Consider lazy loading non-critical components.'));
  }
  
  console.log(chalk.green('✓ Use React.lazy for route-level code splitting'));
  console.log(chalk.green('✓ Use dynamic imports for heavy components'));
  console.log(chalk.green('✓ Consider tree-shaking for unused dependencies'));
}

analyzeBundle();