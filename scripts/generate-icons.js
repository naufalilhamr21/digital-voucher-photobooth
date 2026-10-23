const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generate() {
  const logoPath = path.join(__dirname, '../public/icons/alineas-logo.png');
  const iconsDir = path.join(__dirname, '../public/icons');

  if (!fs.existsSync(logoPath)) {
    console.error('Logo file not found at:', logoPath);
    process.exit(1);
  }

  console.log('Generating PWA icons from official alineas-logo.png...');

  // 192x192 (White background, logo centered)
  await sharp(logoPath)
    .resize(160, 160, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .extend({
      top: 16,
      bottom: 16,
      left: 16,
      right: 16,
      background: '#FFFFFF'
    })
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'));
  console.log('Created icon-192.png');

  // 512x512
  await sharp(logoPath)
    .resize(440, 440, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .extend({
      top: 36,
      bottom: 36,
      left: 36,
      right: 36,
      background: '#FFFFFF'
    })
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'));
  console.log('Created icon-512.png');

  // 512x512 Maskable (with extra padding for Android adaptive icons)
  await sharp(logoPath)
    .resize(360, 360, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .extend({
      top: 76,
      bottom: 76,
      left: 76,
      right: 76,
      background: '#FFFFFF'
    })
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512.png'));
  console.log('Created icon-maskable-512.png');

  // Apple Touch Icon (180x180)
  await sharp(logoPath)
    .resize(150, 150, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .extend({
      top: 15,
      bottom: 15,
      left: 15,
      right: 15,
      background: '#FFFFFF'
    })
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  console.log('All PWA icons generated from alineas-logo.png successfully!');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
