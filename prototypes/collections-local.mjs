// Prints the Collections feed built from this checkout's collections/ folder, using the same
// code as the live proxy (proxy/api/collections.js). serve.py runs it for /api/collections,
// so edits to a links.txt show in the prototype straight away, before they're committed.
import { readdir, readFile } from 'node:fs/promises';
import { buildCollections } from '../proxy/api/collections.js';

const root = new URL('../collections/', import.meta.url);
const data = await buildCollections({
  list: async () => (await readdir(root, { withFileTypes: true })).filter((d) => d.isDirectory() && /^[a-z0-9-]+$/.test(d.name)).map((d) => d.name).sort(),
  read: (id) => readFile(new URL(`${id}/links.txt`, root), 'utf8'),
  unsplashKey: process.env.LUMEN_UNSPLASH_KEY,
});
process.stdout.write(JSON.stringify(data));
