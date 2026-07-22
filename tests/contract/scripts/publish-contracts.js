import { Publisher } from '@pact-foundation/pact';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pactDir = join(__dirname, '../pacts');

const publisher = new Publisher({
  pactBrokerUrl: process.env.PACT_BROKER_URL || 'http://localhost:9292',
  pactFilesOrDirs: [pactDir],
  consumerVersion: process.env.npm_package_version || '1.0.0',
  tags: ['latest', 'development'],
});

async function publishContracts() {
  try {
    const pactFiles = readdirSync(pactDir).filter(file => file.endsWith('.json'));
    if (pactFiles.length === 0) {
      console.log('No pact files found to publish');
      return;
    }

    console.log(`Found ${pactFiles.length} pact files:`);
    pactFiles.forEach(file => console.log(`  - ${file}`));

    await publisher.publishPacts();
    console.log('Contracts published successfully');
  } catch (error) {
    console.error('Failed to publish contracts:', error.message);
    process.exit(1);
  }
}

publishContracts();
