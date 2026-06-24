const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'apps/web/src');

const fixes = [
  {
    file: 'pages/integration/IntegrationLimsQmsPage.tsx',
    replacements: [
      { old: 'data.lims_sample_id', new: '(data as Record<string, unknown>).lims_sample_id as string' },
      { old: 'data.sample_name', new: '(data as Record<string, unknown>).sample_name as string' },
      { old: 'data.inspection_result', new: '(data as Record<string, unknown>).inspection_result as string' },
      { old: 'data.inspection_notes', new: '(data as Record<string, unknown>).inspection_notes as string' },
    ],
  },
  {
    file: 'pages/integration/IntegrationMesErpPage.tsx',
    replacements: [
      { old: 'data.mes_order_id', new: '(data as Record<string, unknown>).mes_order_id as string' },
      { old: 'data.order_number', new: '(data as Record<string, unknown>).order_number as string' },
      { old: 'data.product_name', new: '(data as Record<string, unknown>).product_name as string' },
      { old: 'data.quantity', new: '(data as Record<string, unknown>).quantity as string' },
    ],
  },
  {
    file: 'pages/integration/IntegrationWmsScmPage.tsx',
    replacements: [
      { old: 'data.wms_inventory_id', new: '(data as Record<string, unknown>).wms_inventory_id as string' },
      { old: 'data.item_name', new: '(data as Record<string, unknown>).item_name as string' },
      { old: 'data.unit', new: '(data as Record<string, unknown>).unit as string' },
    ],
  },
  {
    file: 'pages/integration/ConversionRulesPage.tsx',
    replacements: [
      { old: 'trigger_type: (data as Record<string, unknown>).trigger_type as string', new: 'trigger_type: (data as Record<string, unknown>).trigger_type as any' },
      { old: 'field_mappings: (data as Record<string, unknown>).field_mappings as any', new: 'field_mappings: ((data as Record<string, unknown>).field_mappings || []).map((fm: any) => ({ source_field: fm.source, target_field: fm.target, transform: fm.transform }))' },
    ],
  },
  {
    file: 'pages/integration/ExternalErpConnectionsPage.tsx',
    replacements: [
      { old: 'sync_direction: (data as Record<string, unknown>).sync_direction as string', new: 'sync_direction: (data as Record<string, unknown>).sync_direction as any' },
      { old: 'sync_mode: (data as Record<string, unknown>).sync_mode as string', new: 'sync_mode: (data as Record<string, unknown>).sync_mode as any' },
      { old: 'type: (data as Record<string, unknown>).type as string', new: 'type: (data as Record<string, unknown>).type as any' },
    ],
  },
];

fixes.forEach(({ file, replacements }) => {
  const fullPath = path.join(srcDir, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  let changed = false;

  replacements.forEach(({ old: oldStr, new: newStr }) => {
    if (content.includes(oldStr)) {
      content = content.replace(oldStr, newStr);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
});

console.log('\nDone!');
