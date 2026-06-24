const fs = require('fs');
const path = require('path');

const testFile = path.join(__dirname, '..', 'apps/web/src/__tests__/integration/integration.test.ts');

let content = fs.readFileSync(testFile, 'utf-8');

const patterns = [
  /expect\(const\s+err\s*=\s*error\s+as\s*\{([^}]+)\};\s*err\.([^)]+)\)/g,
  /expect\(const\s+err\s*=\s*error\s*as\s*\{([^}]+)\};\s*err\.([^)]+)\)/g,
];

content = content.replace(
  /expect\(const\s+err\s*=\s*error\s+as\s*\{([^}]+)\};\s*err\.([^)]+)\)/g,
  (match) => {
    const cleaned = match
      .replace('expect(const err = error as ', 'expect((error as ')
      .replace(';err.', ').');
    return cleaned;
  }
);

content = content.replace(
  /expect\(const\s+err\s*=\s*error\s+as\s*\{([^}]+)\}/g,
  (match) => {
    return match.replace('expect(const err = error as ', 'expect((error as ');
  }
);

content = content.replace(/;\s*err\.\w+\?\.\w+\)/g, (match) => {
  return match.replace(';err.', ').');
});

content = content.replace(/;\s*err\.\w+\)/g, (match) => {
  return match.replace(';err.', ').');
});

fs.writeFileSync(testFile, content, 'utf-8');
console.log('Fixed integration.test.ts');
