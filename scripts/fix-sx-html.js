const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'apps/web/src');

const files = [
  'components/im/ChatInput.tsx',
  'components/plugin/PluginDetailModal.tsx',
];

files.forEach((relPath) => {
  const fullPath = path.join(srcDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${fullPath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  
  content = content.replace(/<input([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<input$1style={$2}$3>');
  content = content.replace(/<div([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<div$1style={$2}$3>');
  content = content.replace(/<span([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<span$1style={$2}$3>');
  content = content.replace(/<button([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<button$1style={$2}$3>');
  content = content.replace(/<a([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<a$1style={$2}$3>');
  content = content.replace(/<textarea([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<textarea$1style={$2}$3>');
  content = content.replace(/<select([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<select$1style={$2}$3>');
  content = content.replace(/<img([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<img$1style={$2}$3>');
  content = content.replace(/<label([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<label$1style={$2}$3>');
  content = content.replace(/<table([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<table$1style={$2}$3>');
  content = content.replace(/<tr([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<tr$1style={$2}$3>');
  content = content.replace(/<td([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<td$1style={$2}$3>');
  content = content.replace(/<th([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<th$1style={$2}$3>');
  content = content.replace(/<ul([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<ul$1style={$2}$3>');
  content = content.replace(/<ol([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<ol$1style={$2}$3>');
  content = content.replace(/<li([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<li$1style={$2}$3>');
  content = content.replace(/<p([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<p$1style={$2}$3>');
  content = content.replace(/<h1([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<h1$1style={$2}$3>');
  content = content.replace(/<h2([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<h2$1style={$2}$3>');
  content = content.replace(/<h3([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<h3$1style={$2}$3>');
  content = content.replace(/<h4([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<h4$1style={$2}$3>');
  content = content.replace(/<h5([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<h5$1style={$2}$3>');
  content = content.replace(/<h6([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<h6$1style={$2}$3>');
  content = content.replace(/<form([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<form$1style={$2}$3>');
  content = content.replace(/<fieldset([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<fieldset$1style={$2}$3>');
  content = content.replace(/<legend([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<legend$1style={$2}$3>');
  content = content.replace(/<hr([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<hr$1style={$2}$3>');
  content = content.replace(/<br([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<br$1style={$2}$3>');
  content = content.replace(/<iframe([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<iframe$1style={$2}$3>');
  content = content.replace(/<video([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<video$1style={$2}$3>');
  content = content.replace(/<audio([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<audio$1style={$2}$3>');
  content = content.replace(/<canvas([^>]*?)sx=\{([^}]*)\}([^>]*?)>/g, '<canvas$1style={$2}$3>');
  
  fs.writeFileSync(fullPath, content, 'utf-8');
  console.log(`Fixed ${relPath}`);
});

console.log('Done!');