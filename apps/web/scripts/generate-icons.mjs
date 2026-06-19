import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const svgPath = join(__dirname, '../../../docs/logo.svg');
const outputDir = join(__dirname, '../public/icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgBuffer = readFileSync(svgPath);

console.log('Generating icons...');

for (const size of sizes) {
  const outputPath = join(outputDir, `icon-${size}x${size}.png`);
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outputPath);
  console.log(`Generated: icon-${size}x${size}.png`);
}

console.log('Done!');
