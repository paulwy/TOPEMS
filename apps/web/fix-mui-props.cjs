const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find files with fontWeight= or display= patterns
const files = execSync('grep -rl "fontWeight=\\|display=" src/microfrontend/ src/pages/ src/fullstack-automation/ src/dev-platform/', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);

let total = 0;
for (const f of files) {
  const p = path.resolve(f);
  let s = fs.readFileSync(p, 'utf8');
  let count = 0;

  // Case 1: fontWeight={N} followed by sx={{ ... }} on same line
  s = s.replace(/fontWeight=\{(\d+)\}\s+sx=\{\{([^}]*)\}\}/g, (m, num, sxContent) => {
    count++;
    return "sx={{ fontWeight: " + num + ", " + sxContent.trim() + " }}";
  });

  // Case 2: sx={{ ... }} followed by fontWeight={N} on same line
  s = s.replace(/sx=\{\{([^}]*)\}\}\s+fontWeight=\{(\d+)\}/g, (m, sxContent, num) => {
    count++;
    return "sx={{ " + sxContent.trim() + ", fontWeight: " + num + " }}";
  });

  // Case 3: standalone fontWeight={N}
  s = s.replace(/fontWeight=\{(\d+)\}/g, (m, num) => {
    count++;
    return "sx={{ fontWeight: " + num + " }}";
  });

  if (count > 0) {
    fs.writeFileSync(p, s, 'utf8');
    total += count;
    console.log(f + ': ' + count);
  }
}
console.log('TOTAL:', total);
