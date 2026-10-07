import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
const roots = ['src', 'public', 'dist', 'fixtures', 'schemas', 'scripts', 'tests', 'evidence', 'artifacts'];
const rootFiles = ['package.json', 'package-lock.json', 'index.html', 'tsconfig.json', 'vite.config.ts', 'README.md', 'DESIGN.md', 'HTTP-CONTRACT.md', 'LIMITATIONS.md', 'HANDOFF.md', 'VALIDATION.md', 'THIRD_PARTY_NOTICES.txt'];
const excludedReport = 'artifacts/size-report.json';
const files = [];
async function walk(path) {
  const s = await stat(path);
  if (s.isDirectory()) {
    if (/(^|\/)(node_modules|\.cache|vendor|\.git|\.github)$/.test(path)) throw new Error('Forbidden dependency/cache directory: ' + path);
    for (const name of await readdir(path)) await walk(join(path, name));
  } else {
    if (/\.tgz$|(^|\/)\.env/.test(path)) throw new Error('Unnecessary archive or secret: ' + path);
    if (path !== excludedReport) files.push({ path, bytes: s.size });
  }
}
for (const path of [...roots, ...rootFiles]) await walk(path);
const rawBytes = files.reduce((n, f) => n + f.bytes, 0);
const budget = 8388608;
// Reserve 32 KiB for this report and enclosing submission metadata.
if (rawBytes + 32768 > budget) throw new Error(`Over budget: ${rawBytes}`);
console.log(JSON.stringify({ result: 'PASS', budgetBytes: budget, rawBytesExcludingThisReport: rawBytes, reservedBytes: 32768, remainingAfterReserve: budget - rawBytes - 32768, fileCount: files.length, files: files.sort((a, b) => a.path.localeCompare(b.path)), note: 'All required files plus export included. No actual Git bundle created: .git writes prohibited.' }, null, 2));
