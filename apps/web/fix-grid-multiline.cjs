const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find files with Grid item pattern (multiline)
const files = execSync('grep -rl "item" src/microfrontend/ src/pages/ src/fullstack-automation/', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);

let total = 0;
for (const f of files) {
  const p = path.resolve(f);
  let s = fs.readFileSync(p, 'utf8');
  let count = 0;

  // Match multiline: <Grid\n  item\n  xs={N}\n  sm={M}\n  ...> 
  // or <Grid\n  item\n  xs={N}\n  md={M}\n  ...>
  s = s.replace(/<Grid\s*\n\s*item\s*\n\s*((?:xs|sm|md|lg|xl)\s*=\s*\{\d+\}\s*\n\s*)+>/g, (match) => {
    // Extract breakpoint props
    const bpRegex = /(xs|sm|md|lg|xl)\s*=\s*\{(\d+)\}/g;
    const bps = {};
    let m;
    while ((m = bpRegex.exec(match)) !== null) {
      bps[m[1]] = parseInt(m[2]);
    }
    const bpStr = Object.entries(bps).map(([k, v]) => k + ': ' + v).join(', ');
    count++;
    return '<Grid\n            size={{ ' + bpStr + ' }}\n          >';
  });

  // Also handle: <Grid item button> (remove both item and button)
  s = s.replace(/<Grid\s+item\s+button\s*>/g, (m) => {
    count++;
    return '<Grid>';
  });

  // Handle: <Grid\n  button\n  ...> (button prop removal)
  s = s.replace(/<Grid\s*\n\s*button\s*\n/g, (m) => {
    count++;
    return '<Grid\n';
  });

  if (count > 0) {
    fs.writeFileSync(p, s, 'utf8');
    total += count;
    console.log(f + ': ' + count);
  }
}
console.log('TOTAL:', total);
