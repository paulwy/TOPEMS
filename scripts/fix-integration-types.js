const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'apps/web/src');

function fixIntegrationFiles() {
  const files = [
    'pages/integration/ConversionRulesPage.tsx',
    'pages/integration/ExternalErpConnectionsPage.tsx',
    'pages/integration/IntegrationLimsQmsPage.tsx',
    'pages/integration/IntegrationMesErpPage.tsx',
    'pages/integration/IntegrationWmsScmPage.tsx',
  ];

  files.forEach((file) => {
    const fullPath = path.join(srcDir, file);
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${file}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');
    let changed = false;

    content = content.replace(
      /const handleSubmit = async \(data: Record<string, unknown>\) => \{/g,
      (match) => {
        changed = true;
        return match.replace('Record<string, unknown>', 'unknown');
      }
    );

    content = content.replace(
      /data\.name/g,
      '(data as Record<string, unknown>).name as string'
    );

    content = content.replace(
      /data\.description/g,
      '(data as Record<string, unknown>).description as string'
    );

    content = content.replace(
      /data\.api_url/g,
      '(data as Record<string, unknown>).api_url as string'
    );

    content = content.replace(
      /data\.app_key/g,
      '(data as Record<string, unknown>).app_key as string'
    );

    content = content.replace(
      /data\.app_secret/g,
      '(data as Record<string, unknown>).app_secret as string'
    );

    content = content.replace(
      /data\.timeout/g,
      '(data as Record<string, unknown>).timeout as number'
    );

    content = content.replace(
      /data\.sync_direction/g,
      '(data as Record<string, unknown>).sync_direction as string'
    );

    content = content.replace(
      /data\.sync_mode/g,
      '(data as Record<string, unknown>).sync_mode as string'
    );

    content = content.replace(
      /data\.type/g,
      '(data as Record<string, unknown>).type as string'
    );

    content = content.replace(
      /data\.source_system/g,
      '(data as Record<string, unknown>).source_system as string'
    );

    content = content.replace(
      /data\.source_entity/g,
      '(data as Record<string, unknown>).source_entity as string'
    );

    content = content.replace(
      /data\.target_system/g,
      '(data as Record<string, unknown>).target_system as string'
    );

    content = content.replace(
      /data\.target_entity/g,
      '(data as Record<string, unknown>).target_entity as string'
    );

    content = content.replace(
      /data\.trigger_type/g,
      '(data as Record<string, unknown>).trigger_type as string'
    );

    content = content.replace(
      /data\.field_mappings/g,
      '(data as Record<string, unknown>).field_mappings as any'
    );

    content = content.replace(
      /data\.transform_script/g,
      '(data as Record<string, unknown>).transform_script as string'
    );

    content = content.replace(
      /data\.priority/g,
      '(data as Record<string, unknown>).priority as number'
    );

    content = content.replace(
      /data\.max_retries/g,
      '(data as Record<string, unknown>).max_retries as number'
    );

    content = content.replace(
      /data\.retry_interval_secs/g,
      '(data as Record<string, unknown>).retry_interval_secs as number'
    );

    content = content.replace(
      /data\.stop_on_failure/g,
      '(data as Record<string, unknown>).stop_on_failure as boolean'
    );

    content = content.replace(
      /data\.code/g,
      '(data as Record<string, unknown>).code as string'
    );

    content = content.replace(
      /data\.connection_id/g,
      '(data as Record<string, unknown>).connection_id as string'
    );

    content = content.replace(
      /data\.source_table/g,
      '(data as Record<string, unknown>).source_table as string'
    );

    content = content.replace(
      /data\.target_table/g,
      '(data as Record<string, unknown>).target_table as string'
    );

    content = content.replace(
      /data\.sync_fields/g,
      '(data as Record<string, unknown>).sync_fields as any'
    );

    content = content.replace(
      /data\.sync_condition/g,
      '(data as Record<string, unknown>).sync_condition as string'
    );

    content = content.replace(
      /data\.sync_interval/g,
      '(data as Record<string, unknown>).sync_interval as number'
    );

    if (changed) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log(`Updated ${file}`);
    }
  });
}

function fixLimsFiles() {
  const files = [
    'pages/lims/LimsInstrumentPage.tsx',
    'pages/lims/LimsTaskPage.tsx',
  ];

  files.forEach((file) => {
    const fullPath = path.join(srcDir, file);
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${file}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');
    let changed = false;

    content = content.replace(
      /description: \(item\) => \{/g,
      (match) => {
        changed = true;
        return match.replace('(item)', '(item: unknown)');
      }
    );

    content = content.replace(
      /icon: \(item\) => \{/g,
      (match) => {
        changed = true;
        return match.replace('(item)', '(item: unknown)');
      }
    );

    content = content.replace(
      /onClick: \(item\) => openInstrumentDetailModal/g,
      (match) => {
        changed = true;
        return match.replace('(item)', '(item: unknown)');
      }
    );

    content = content.replace(
      /onClick: \(item\) => openMaintenanceModal/g,
      (match) => {
        changed = true;
        return match.replace('(item)', '(item: unknown)');
      }
    );

    content = content.replace(
      /onClick: \(item\) => openInstrumentModal/g,
      (match) => {
        changed = true;
        return match.replace('(item)', '(item: unknown)');
      }
    );

    content = content.replace(
      /onClick: \(item\) => handleDeleteInstrument/g,
      (match) => {
        changed = true;
        return match.replace('(item)', '(item: unknown)');
      }
    );

    content = content.replace(
      /onClick: \(item\) => openTaskDetailModal/g,
      (match) => {
        changed = true;
        return match.replace('(item)', '(item: unknown)');
      }
    );

    content = content.replace(
      /onClick: \(item\) => openRecordModal/g,
      (match) => {
        changed = true;
        return match.replace('(item)', '(item: unknown)');
      }
    );

    content = content.replace(
      /disabled: \(item\) => \(item as InspectionTask\)/g,
      (match) => {
        changed = true;
        return match.replace('(item)', '(item: unknown)');
      }
    );

    content = content.replace(
      /title: \(item\) => getSampleName/g,
      (match) => {
        changed = true;
        return match.replace('(item)', '(item: unknown)');
      }
    );

    content = content.replace(
      /description: \(item\) => `检验流程/g,
      (match) => {
        changed = true;
        return match.replace('(item)', '(item: unknown)');
      }
    );

    content = content.replace(
      /format: \(.*item\) => getProcessName/g,
      (match) => {
        changed = true;
        return match.replace(/item\s*\)/, 'item: unknown)');
      }
    );

    content = content.replace(
      /format: \(.*item\) => getCurrentStepName/g,
      (match) => {
        changed = true;
        return match.replace(/item\s*\)/, 'item: unknown)');
      }
    );

    content = content.replace(
      /onCardClick={openInstrumentDetailModal}/g,
      (match) => {
        changed = true;
        return 'onCardClick={(item) => openInstrumentDetailModal(item as Instrument)}';
      }
    );

    content = content.replace(
      /onCardClick={openTaskDetailModal}/g,
      (match) => {
        changed = true;
        return 'onCardClick={(item) => openTaskDetailModal(item as InspectionTask)}';
      }
    );

    if (changed) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log(`Updated ${file}`);
    }
  });
}

fixIntegrationFiles();
fixLimsFiles();
console.log('\nDone!');
