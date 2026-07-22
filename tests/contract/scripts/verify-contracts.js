import { Verifier } from '@pact-foundation/pact';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pactDir = join(__dirname, '../pacts');

const providerBaseUrl = process.env.PROVIDER_BASE_URL || 'http://localhost:8000';

async function verifyContracts(providerName) {
  const verifier = new Verifier({
    providerBaseUrl,
    provider: providerName,
    pactBrokerUrl: process.env.PACT_BROKER_URL || 'http://localhost:9292',
    providerVersion: process.env.npm_package_version || '1.0.0',
  });

  try {
    const output = await verifier.verifyProvider();
    console.log(`Verification successful for ${providerName}:`);
    console.log(output);
    return true;
  } catch (error) {
    console.error(`Verification failed for ${providerName}:`, error.message);
    return false;
  }
}

async function main() {
  const providers = ['topems-iam', 'topems-finance', 'topems-ticket'];
  let allPassed = true;

  for (const provider of providers) {
    const passed = await verifyContracts(provider);
    if (!passed) {
      allPassed = false;
    }
  }

  process.exit(allPassed ? 0 : 1);
}

main();
