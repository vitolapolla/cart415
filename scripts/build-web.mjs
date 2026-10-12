// Builds the static, server-less version of Encore into www/.
// Used by the Android app (Capacitor) and the hosted website.
import { cp, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'www');

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT);
await cp(path.join(ROOT, 'public'), OUT, { recursive: true });
await cp(path.join(ROOT, 'shared'), path.join(OUT, 'shared'), { recursive: true });

// Tell the client to talk to the music services directly instead of an Encore server.
const indexFile = path.join(OUT, 'index.html');
const html = await readFile(indexFile, 'utf8');
await writeFile(indexFile, html.replace('<!-- encore:config -->', '<script>window.ENCORE_DIRECT = true;</script>'));
console.log('Built www/');
