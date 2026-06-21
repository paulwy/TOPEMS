#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const muiTransitionPath = path.resolve(
  process.cwd(),
  '../../node_modules/@mui/material/internal/Transition.mjs'
);

if (!fs.existsSync(muiTransitionPath)) {
  console.log('Warning: @mui/material/internal/Transition.mjs not found');
  process.exit(0);
}

let content = fs.readFileSync(muiTransitionPath, 'utf-8');

const oldImport = 'react-transition-group/TransitionGroupContext';
const newImport = 'react-transition-group/cjs/TransitionGroupContext.js';

if (content.includes(oldImport)) {
  content = content.replace(oldImport, newImport);
  fs.writeFileSync(muiTransitionPath, content, 'utf-8');
  console.log('Fixed: @mui/material/internal/Transition.mjs - updated TransitionGroupContext import');
} else {
  console.log('Already fixed: @mui/material/internal/Transition.mjs');
}

const rtkContextDir = path.resolve(
  process.cwd(),
  '../../node_modules/react-transition-group/TransitionGroupContext'
);

const indexJsPath = path.join(rtkContextDir, 'index.js');
if (!fs.existsSync(indexJsPath)) {
  fs.writeFileSync(indexJsPath, 'module.exports = require(\'../cjs/TransitionGroupContext.js\');', 'utf-8');
  console.log('Created: react-transition-group/TransitionGroupContext/index.js');
} else {
  console.log('Already exists: react-transition-group/TransitionGroupContext/index.js');
}

const indexMjsPath = path.join(rtkContextDir, 'index.mjs');
if (!fs.existsSync(indexMjsPath)) {
  fs.writeFileSync(indexMjsPath, 'export { default } from \'../esm/TransitionGroupContext.js\';', 'utf-8');
  console.log('Created: react-transition-group/TransitionGroupContext/index.mjs');
} else {
  console.log('Already exists: react-transition-group/TransitionGroupContext/index.mjs');
}
