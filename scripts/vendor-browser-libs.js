const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const pages = ['index.html', 'dashboard.html', 'buscador-unidades.html', ...fs.readdirSync(path.join(root, 'modulos')).filter(p => p.endsWith('.html')).map(p => 'modulos/' + p)];
async function run() {
  const directory = path.join(root, 'js/vendor');
  const existing = fs.existsSync(path.join(directory, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'))) : [];
  const urls = [...new Set(pages.flatMap(p => [...fs.readFileSync(path.join(root, p), 'utf8').matchAll(/<script[^>]+src="(https:\/\/[^\"]+)"/g)].map(m => m[1])))];
  if (!urls.length) { console.log('Libraries already local. See js/vendor/manifest.json for pinned sources.'); return; }
  fs.mkdirSync(directory, { recursive: true });
  const manifest = [...existing];
  for (const url of urls) {
    if (!/^https:\/\/(cdn\.jsdelivr\.net\/npm\/|unpkg\.com\/)/.test(url)) throw new Error('Unreviewed source: ' + url);
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(url + ': ' + response.status);
    const buffer = Buffer.from(await response.arrayBuffer());
    const packageName = url.replace(/^https:\/\/(cdn\.jsdelivr\.net\/npm\/|unpkg\.com\/)/, '').match(/^(@[^/]+\/[^/@]+|[^/@]+)/)[0];
    const name = packageName.replace(/[@/]/g, '-') + '.js';
    const version = response.headers.get('x-jsd-version') || response.url.match(/@(\d+\.\d+\.\d+)/)?.[1];
    if (!version) throw new Error('Missing version: ' + url);
    const base = 'https://cdn.jsdelivr.net/npm/' + packageName + '@' + version + '/';
    const metadata = await fetch(base + 'package.json').then(r => r.json());
    let licenseFile;
    for (const file of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENSE.markdown', 'MIT-LICENSE.txt', 'MIT-LICENSE', 'LICENSE-MIT', 'license', 'license.md']) {
      const r = await fetch(base + file, { signal: AbortSignal.timeout(15000) });
      if (r.ok) { licenseFile = name + '.LICENSE'; fs.writeFileSync(path.join(directory, licenseFile), await r.text()); break; }
    }
    if (!licenseFile) throw new Error('Missing license: ' + packageName);
    fs.writeFileSync(path.join(directory, name), buffer);
    manifest.push({ package: packageName, version, license: metadata.license, licenseFile, source: url, file: name, sha256: crypto.createHash('sha256').update(buffer).digest('hex') });
    console.log(packageName + '@' + version + ' with license');
  }
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  for (const page of pages) {
    let html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const lib of manifest) html = html.replaceAll(lib.source, (page.startsWith('modulos/') ? '../' : '') + 'js/vendor/' + lib.file);
    fs.writeFileSync(path.join(root, page), html);
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
