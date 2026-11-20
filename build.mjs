// Joins src/*.js into one file, inlines the CSS and stamps the version. No dependencies.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const css = ['src/tiles.css', 'src/extra.css'].map(f => readFileSync(f, 'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
const parts = readdirSync('src').filter(f => f.endsWith('.js')).sort().map(f => readFileSync('src/' + f, 'utf8'));
let out = `/* nocturne-card ${pkg.version} | https://github.com/thekiwismarthome/nocturne-card | MIT */\n(() => {\n'use strict';\n${parts.join('\n')}\n})();\n`;
out = out.replace("'__VERSION__'", JSON.stringify(pkg.version)).replace("'__CSS__'", () => JSON.stringify(css));
writeFileSync('nocturne-card.js', out);
console.log(`nocturne-card.js ${(out.length / 1024).toFixed(1)} KB, version ${pkg.version}`);
