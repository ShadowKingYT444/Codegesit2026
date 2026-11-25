// Validate manifest.yml offline with the validator inside the Forge CLI (no login needed).
// Usage: npm run validate   (needs @forge/cli installed globally or FORGE_MANIFEST_PATH pointing to @forge/manifest)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const candidates = [process.env.FORGE_MANIFEST_PATH, '@forge/manifest'];
try { const root = execSync('npm root -g').toString().trim(); candidates.push(`${root}/@forge/cli/node_modules/@forge/manifest`, `${root}/@forge/manifest`); } catch { /* no global npm */ }
let m;
for (const c of candidates.filter(Boolean)) { try { m = require(c); break; } catch { /* try next */ } }
if (!m) { console.error('Could not find @forge/manifest. Install the Forge CLI (npm i -g @forge/cli) or run `forge lint`.'); process.exit(2); }
const r = await m.validate(false);
for (const e of r.errors || []) console.log(`${e.level || 'error'}: ${e.message}${e.reference ? ` (${e.reference})` : ''}`);
console.log(r.success ? 'manifest.yml is valid' : 'manifest.yml has errors');
process.exit(r.success ? 0 : 1);
