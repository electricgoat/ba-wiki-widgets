// Build a local preview from the actual unsaved MediaWiki parse.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const images = JSON.parse(fs.readFileSync(path.join(dir, 'upstream/preview-images.json'), 'utf8'));
const content = fs.readFileSync(path.join(dir, 'upstream/preview.html'), 'utf8')
    .replace(/(href|src)="\/\//g, '$1="https://')
    .replace(/(href|src)="\/(?!\/)/g, '$1="https://bluearchive.wiki/')
    .replace(/srcset="([^"]+)"/g, (_, value) => 'srcset="' + value.replace(/\/\//g, 'https://') + '"')
    .replace(/<img\b[^>]*>/g, tag => {
        const src = tag.match(/src="([^"]+)"/)[1];
        return images[src] ? tag.replace(src, images[src]).replace(/ srcset="[^"]+"/, '') : tag;
    });
fs.writeFileSync(path.join(dir, 'preview.html'), `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Events schedule — local preview</title>
<link rel="stylesheet" href="../charactertablecontrols.css">
<link rel="stylesheet" href="eventtable.css">
<style>
:root { color-scheme: light; --table-content: #202122; --background-table: #f8f9fa; --table-border: #a2a9b1; }
body { margin: 24px auto; padding: 0 20px; max-width: 1240px; font: 15px/1.5 sans-serif; color: #202122; background: white; }
a { color: #36c; text-decoration: none; } a:hover { text-decoration: underline; }
table { border-collapse: collapse; } th, td { border: 1px solid var(--table-border); padding: 8px; }
th { background: #eaecf0; } th.headerSort { cursor: pointer; }
th.headerSortUp::after { content: ' ▴'; } th.headerSortDown::after { content: ' ▾'; }
.mw-editsection { display: none; } .hidden { display: none; }
@media (max-width: 720px) { body { padding: 0 10px; } }
@media (prefers-color-scheme: dark) {
 :root { color-scheme: dark; --table-content: #eaecf0; --background-table: #202122; --table-border: #72777d;
 --background-color-base: #202122; --background-color-interactive-subtle: #303336; --color-subtle: #a2a9b1; }
 body { color: #eaecf0; background: #101418; } a { color: #8cb4ff; } th { background: #303336; }
}
</style>
${content}
<script>
// Only the MediaWiki services used by the unmodified tablesorter are stubbed.
const months = ['', 'January','February','March','April','May','June','July','August','September','October','November','December'];
window.mw = {
 config: { get: key => ({wgDigitTransformTable: ['', ''], wgSeparatorTransformTable: ['', ''],
  wgDefaultDateFormat: 'ymd', wgPageViewLanguage: 'en', wgUserLanguage: 'en', tableSorterCollation: null})[key] },
 language: {months: {names: months, genitive: months, abbrev: months.map(name => name.slice(0,3))}},
 util: {escapeRegExp: RegExp.escape},
 msg: key => key, message: key => ({plain: () => key}), log: {warn: console.warn},
 loader: {state: () => {}, using: (name, callback) => {
  const ready = new Promise(resolve => setTimeout(resolve, Number(new URLSearchParams(location.search).get('delay')) || 0));
  if (callback) ready.then(callback); return ready;
 }}
};
</script>
<script src="upstream/jquery.js"></script>
<script src="upstream/jquery.tablesorter.js"></script>
<script>
if (!new URLSearchParams(location.search).has('nojs')) {
 const filterScript = document.createElement('script'); filterScript.src = '../tablefilter.js'; document.body.appendChild(filterScript);
}
</script>
</html>`);
console.log('Built table_filter/events/preview.html');
