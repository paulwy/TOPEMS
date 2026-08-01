const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '../node_modules/react-transition-group/package.json');

if (!fs.existsSync(pkgPath)) {
  console.log('react-transition-group not found, skipping patch');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

const requiredExports = {
  ".": {
    "import": "./cjs/index.js",
    "require": "./cjs/index.js"
  },
  "./TransitionGroupContext": {
    "import": "./cjs/TransitionGroupContext.js",
    "require": "./cjs/TransitionGroupContext.js"
  },
  "./cjs/": {
    "import": "./cjs/",
    "require": "./cjs/"
  },
  "./cjs/TransitionGroupContext.js": {
    "import": "./cjs/TransitionGroupContext.js",
    "require": "./cjs/TransitionGroupContext.js"
  },
  "./cjs/CSSTransition.js": {
    "import": "./cjs/CSSTransition.js",
    "require": "./cjs/CSSTransition.js"
  },
  "./cjs/Transition.js": {
    "import": "./cjs/Transition.js",
    "require": "./cjs/Transition.js"
  },
  "./cjs/TransitionGroup.js": {
    "import": "./cjs/TransitionGroup.js",
    "require": "./cjs/TransitionGroup.js"
  },
  "./cjs/SwitchTransition.js": {
    "import": "./cjs/SwitchTransition.js",
    "require": "./cjs/SwitchTransition.js"
  },
  "./cjs/ReplaceTransition.js": {
    "import": "./cjs/ReplaceTransition.js",
    "require": "./cjs/ReplaceTransition.js"
  },
  "./CSSTransition": {
    "import": "./cjs/CSSTransition.js",
    "require": "./cjs/CSSTransition.js"
  },
  "./Transition": {
    "import": "./cjs/Transition.js",
    "require": "./cjs/Transition.js"
  },
  "./TransitionGroup": {
    "import": "./cjs/TransitionGroup.js",
    "require": "./cjs/TransitionGroup.js"
  },
  "./SwitchTransition": {
    "import": "./cjs/SwitchTransition.js",
    "require": "./cjs/SwitchTransition.js"
  },
  "./ReplaceTransition": {
    "import": "./cjs/ReplaceTransition.js",
    "require": "./cjs/ReplaceTransition.js"
  }
};

let changed = false;
if (!pkg.exports) {
  pkg.exports = requiredExports;
  changed = true;
} else {
  const currentKeys = new Set(Object.keys(pkg.exports));
  const requiredKeys = new Set(Object.keys(requiredExports));
  const missingKeys = [...requiredKeys].filter(k => !currentKeys.has(k));
  if (missingKeys.length > 0) {
    pkg.exports = { ...pkg.exports, ...requiredExports };
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log('Patched react-transition-group/package.json exports');
} else {
  console.log('react-transition-group already patched');
}