const fs = require('fs');
const path = require('path');

const tomlPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native',
  'gradle-plugin',
  'gradle',
  'libs.versions.toml'
);

if (!fs.existsSync(tomlPath)) {
  console.log('fix-agp: libs.versions.toml not found, skipping');
  process.exit(0);
}

const original = fs.readFileSync(tomlPath, 'utf8');
const fixed = original.replace(/agp = "8\.11\.0"/, 'agp = "8.7.3"');

if (original === fixed) {
  console.log('fix-agp: AGP version already at 8.7.3 or not 8.11.0, no change needed');
} else {
  fs.writeFileSync(tomlPath, fixed);
  console.log('fix-agp: patched AGP 8.11.0 -> 8.7.3');
}
