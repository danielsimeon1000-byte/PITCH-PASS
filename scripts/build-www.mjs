// Copies the web app into www/ for Capacitor (GitHub Pages serves the repo root directly).
import { cpSync, rmSync, mkdirSync } from 'node:fs';
rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const p of ['index.html', 'manifest.webmanifest', 'css', 'js', 'fonts', 'icons']) cpSync(p, `www/${p}`, { recursive: true });
console.log('www/ ready');
