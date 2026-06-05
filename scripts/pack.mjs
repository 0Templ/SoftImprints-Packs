
// node scripts/pack.mjs <packId | --all> [--mode=local|release] [--version=X]

import { readFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const EXCLUDE = [
  'README.md',
  'CHANGELOG.md',
  '.gitignore',
  '*.DS_Store',
  'Thumbs.db',
  '*.bak',
  '*~',
  'pack_raw.png',
];

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      flags[key] = value === undefined ? true : value;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function resolveVersion(mode, flags) {
  if (mode === 'release') {
    if (!flags.version) {
      throw new Error('release mode requires --version=X (normally passed from the git tag)');
    }
    return flags.version;
  }
  return flags.version || `dev-${timestamp()}`;
}

function zipPack(srcDir, outFile) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outFile);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(archive.pointer()));
    archive.on('warning', (err) => (err.code === 'ENOENT' ? null : reject(err)));
    archive.on('error', reject);

    archive.pipe(output);
    archive.glob('**/*', {
      cwd: srcDir,
      ignore: EXCLUDE,
      dot: false,
    });
    archive.finalize();
  });
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const mode = flags.mode || 'local';
  const version = resolveVersion(mode, flags);

  const registry = JSON.parse(await readFile(path.join(ROOT, 'packs.json'), 'utf8'));
  const packs = registry.packs;

  let targets;
  if (flags.all || positional[0] === '--all') {
    targets = Object.keys(packs);
  } else if (positional[0]) {
    targets = [positional[0]];
  } else {
    throw new Error('usage: node scripts/pack.mjs <packId | --all> [--mode=local|release] [--version=X]');
  }

  const outDir = path.join(ROOT, mode === 'release' ? 'dist' : 'out');
  await mkdir(outDir, { recursive: true });

  for (const id of targets) {
    const entry = packs[id];
    if (!entry) throw new Error(`Pack '${id}' is not listed in packs.json`);

    const srcDir = path.join(ROOT, entry.dir);
    if (!existsSync(path.join(srcDir, 'pack.mcmeta'))) {
      throw new Error(`No pack.mcmeta in ${entry.dir} (check the 'dir' field in packs.json)`);
    }


    const fileName = `${entry.name}-${version}.zip`;

    const outFile = path.join(outDir, fileName);
    await rm(outFile, { force: true });

    const bytes = await zipPack(srcDir, outFile);
    const kb = (bytes / 1024).toFixed(1);
    const relPath = path.relative(ROOT, outFile).split(path.sep).join('/');
    console.log(`built  ${entry.name}  ->  ${relPath}  (${kb} KB)`);

    if (process.env.GITHUB_OUTPUT) {
      const fs = await import('node:fs');
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `filename=${fileName}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `path=${relPath}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `display_name=${entry.name}\n`);
    }
  }
}

main().catch((err) => {
  console.error(`error: ${err.message}`);
  process.exit(1);
});


