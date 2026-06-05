import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { appendFileSync } from 'node:fs';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function extractSection(markdown, version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `^##[ \\t]+\\[?${escaped}\\]?[^\\n]*\\n(.*?)(?=^##[ \\t]+|$(?![\\r\\n]))`,
    'ms',
  );
  const match = re.exec(markdown);
  return match ? match[1].trim() : null;
}

function setActionsOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;

  const delim = `__EOF_${Math.random().toString(36).slice(2)}__`;
  const line = `${name}<<${delim}\n${value}\n${delim}\n`;

  appendFileSync(process.env.GITHUB_OUTPUT, line);
}

async function main() {
  const [packId, version] = process.argv.slice(2);
  if (!packId || !version) {
    throw new Error('usage: node scripts/changelog.mjs <packId> <version>');
  }

  const registry = JSON.parse(await readFile(path.join(ROOT, 'packs.json'), 'utf8'));
  const entry = registry.packs[packId];
  if (!entry) throw new Error(`Pack '${packId}' is not listed in packs.json`);

  const changelogPath = path.join(ROOT, entry.dir, 'CHANGELOG.md');

  let notes;
  if (!existsSync(changelogPath)) {
    notes = `Release v${version}`;
  } else {
    const md = await readFile(changelogPath, 'utf8');
    const section = extractSection(md, version);
    notes = section && section.length > 0 ? section : `Release v${version}`;
  }

  process.stdout.write(notes + '\n');
  setActionsOutput('notes', notes);
}

main().catch((err) => {
  console.error(`error: ${err.message}`);
  process.exit(1);
});
